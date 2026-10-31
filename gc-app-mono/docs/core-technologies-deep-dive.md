# Global Chats 核心技术深度解析

本文档详细记录 Global Chats 项目的六大核心技术实现原理、代码细节、设计决策和最佳实践。

**版本**: 1.3.0
**作者**: Architecture Team
**最后更新**: 2026-01-29

---

## 目录

1. [WebView 多进程隔离与状态同步](#1-webview-多进程隔离与状态同步)
2. [WhatsApp Webpack 模块劫持](#2-whatsapp-webpack-模块劫持)
3. [AOP History API 劫持](#3-aop-history-api-劫持)
4. [三层 Store 架构](#4-三层-store-架构)
5. [InjectJS 注入时机控制](#5-injectjs-注入时机控制)
6. [抽象引擎架构](#6-抽象引擎架构)

---

## 1. WebView 多进程隔离与状态同步

### 1.1 技术挑战

**问题描述**：Global Chats 需要同时运行 10 个独立的 WebView（主应用 + 侧边栏 + 8 个平台），每个 WebView 都是独立的 V8 进程，拥有独立的：

- JavaScript 执行上下文
- DOM 树
- 内存空间
- LocalStorage / IndexedDB

**核心矛盾**：
```
需求：所有 WebView 共享同一份用户配置（globalStore）
现实：每个 WebView 都有独立的内存空间，无法直接共享对象
风险：如果 10 个进程同时写入 settings.json，会导致文件损坏
```

### 1.2 架构设计

#### 1.2.1 单一写入者模式

```
┌─────────────────────────────────────────────────────────┐
│                 主 Renderer (MainWebviewId)              │
│              唯一拥有持久化写入权限的进程                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ persistGlobalStorage.setItem()                     │ │
│  │    ↓                                               │ │
│  │ settingStorage.set("globalStore", value)          │ │
│  │    ↓                                               │ │
│  │ settingStorage.save()  ✅ 写入 settings.json       │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          │ Tauri Event API (WebviewChannel)
                          ↓
┌─────────────────────────────────────────────────────────┐
│           子 WebViews (Telegram, WhatsApp, ...)          │
│              只能读取，不能写入磁盘                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ noopPersistStorage.setItem()                       │ │
│  │    ↓                                               │ │
│  │ // 空实现，不执行任何操作 ❌                          │ │
│  │                                                    │ │
│  │ 需要更新配置？→ 通过 Channel 发消息给主 Renderer      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 1.2.2 核心代码实现

**持久化存储层** (`packages/store/src/helper/persistStorage.ts`):

```typescript
import { Store } from "@tauri-apps/plugin-store";
import { StateStorage } from "zustand/middleware/persist";

export let settingStorage: Nullable<Store>;

class PersistGlobalStorage implements StateStorage {
  async mount() {
    // 🔑 加载 Tauri Store
    settingStorage = await Store.load("settings.json");
  }

  async getItem(name: string) {
    const value = await settingStorage?.get(name);
    return value ? JSON.stringify(value) : null;
  }

  async setItem(name: string, value: string) {
    // 🔑 关键：save() 保证原子性写入
    await settingStorage?.set(name, JSON.parse(value));
    await settingStorage?.save();  // ⚠️ I/O 操作
  }
}

export const persistGlobalStorage = new PersistGlobalStorage();

// 🔑 子 WebView 使用的空实现
export const noopPersistStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => {},  // 什么都不做
  removeItem: async () => {},
};
```

**globalStore 配置** (`packages/store/src/globalStore.ts`):

```typescript
import { isMainWebview } from "@gc/utils";
import { persistGlobalStorage, noopPersistStorage } from "./helper/persistStorage";

export const useGlobalStore = create<Store>()(
  persist(
    (set, get) => ({
      userConfigList: {},
      globalSetting: makeEmptyGlobalSetting(),
      currentSignInUserId: undefined,

      // ... actions
    }),
    {
      name: "globalStore",
      storage: createJSONStorage(() => {
        // 🔑 动态选择存储实现
        return isMainWebview()
          ? persistGlobalStorage  // 主 Renderer：真实写入磁盘
          : noopPersistStorage;   // 子 WebView：空实现
      }),
    }
  )
);
```

### 1.3 WebView 通信机制

#### 1.3.1 通信协议设计

**Channel 消息结构**:

```typescript
interface ChannelMessage<K extends EChannelMessageEventType> {
  senderId: string;        // 发送者 WebView ID
  receiverIds: string[];   // 接收者列表（支持广播 "*"）
  type: K;                 // 消息类型
  payload: IChannelMessagePayload[K];  // 类型安全的 payload
}

enum EChannelMessageEventType {
  // Store 同步
  requestStoreState = "requestStoreState",  // 子 WebView → 主 Renderer
  sendStoreState = "sendStoreState",        // 主 Renderer → 子 WebView

  // 应用状态变更
  changeAppUnreadCount = "changeAppUnreadCount",
  changeAppUserInfo = "changeAppUserInfo",

  // 设置更新
  updateSettings = "updateSettings",
}
```

#### 1.3.2 WebviewChannel 实现

**核心代码** (`packages/channel/src/webviewChannel.ts`):

```typescript
import mitt from "mitt";
import { emit, listen } from "@tauri-apps/api/event";

export class WebviewChannel {
  channelId!: string;
  readonly emitter = mitt<ChannelMessageRecord>();

  async mount() {
    await domReady();
    this.channelId = getCurrentWebviewId();

    // 🔑 监听来自其他 WebView 的消息
    await listen<ChannelMessage>(WebviewChannel.name, (event) => {
      const { senderId, receiverIds, type } = event.payload;

      if (this.#shouldNotifyMe(senderId, receiverIds)) {
        // 🔑 使用 mitt 触发本地事件
        this.emitter.emit(type, event.payload);
      }
    });
  }

  #shouldNotifyMe(senderId: string, receiverIds: string[]) {
    // 🔑 过滤逻辑
    if (this.isSelfSender(senderId)) return false;  // 不接收自己的消息

    return receiverIds.some(id =>
      id === "*" ||           // 广播消息
      id === this.channelId   // 指定给我的消息
    );
  }

  async sendMessage<K extends EChannelMessageEventType>(
    message: Omit<ChannelMessage<K>, "senderId">
  ) {
    // 🔑 通过 Tauri Event API 发送消息
    await emit(WebviewChannel.name, {
      ...message,
      senderId: this.channelId,
    });
  }
}

export const webviewChannel = new WebviewChannel();
```

### 1.4 Store 同步流程

#### 1.4.1 启动时同步

**流程图**:

```
子 WebView 启动
    ↓
await webviewChannel.mount()
    ↓
await syncLocalCachedStore()
    ↓
requestGLobalStoreFormMainStore()
    ↓
┌─────────────────────────────────────────────────┐
│ 每 2 秒发送一次 requestStoreState 消息           │
│ 直到收到 sendStoreState 响应                    │
└─────────────────────────────────────────────────┘
    ↓
收到响应后更新本地 Store
    ↓
globalStore.updateGlobalStore(cachedGLobalStore)
userStore.setUserStore(getCachedUserStore())
appStore.setAppStore(getAppListFromUserStore())
```

**核心代码** (`packages/store/src/helper/syncLocalCachedStore.ts`):

```typescript
export const syncLocalCachedStore = async () => {
  const cachedGLobalStore = await getLocalCachedStore();

  // 🔑 根据 WebView 类型选择同步策略
  if (isMainWebview()) {
    await persistGlobalStorage.mount();
    const hasStoredData = await settingStorage?.has("globalStore");

    if (hasStoredData) {
      const rawData = await settingStorage?.get("globalStore");
      return migrateStore(rawData.state, rawData.version);
    }
  } else {
    // 🔑 子 WebView 通过消息请求
    return await requestGLobalStoreFormMainStore();
  }

  // 🔑 更新三层 Store
  globalStore.updateGlobalStore(cachedGLobalStore);
  userStore.setUserStore(getCachedUserStore());
  appStore.setAppStore(getAppListFromUserStore());
};

let pendingRequest: Promise<IGlobalStore> | null = null;

export const requestGLobalStoreFormMainStore = async () => {
  // 🔑 防止重复请求
  if (pendingRequest) return pendingRequest;

  pendingRequest = new Promise<IGlobalStore>((resolve) => {
    const requestGlobalStore = () => {
      webviewChannel.sendMessage({
        receiverIds: [MainWebviewId],
        type: EChannelMessageEventType.requestStoreState,
        payload: {},
      });
    };

    // 🔑 轮询请求，直到收到响应
    const timeout = setInterval(requestGlobalStore, 2000);
    requestGlobalStore();  // 立即发送第一次

    const handleStoreState = ({ payload }) => {
      clearInterval(timeout);
      webviewChannel.emitter.off(
        EChannelMessageEventType.sendStoreState,
        handleStoreState
      );
      pendingRequest = null;
      resolve(payload.globalStore);
    };

    webviewChannel.emitter.on(
      EChannelMessageEventType.sendStoreState,
      handleStoreState
    );
  });

  return pendingRequest;
};
```

#### 1.4.2 运行时同步

**主 Renderer 监听消息** (`packages/app-init/src/init.ts`):

```typescript
export const initApp = async () => {
  await webviewChannel.mount();
  await syncLocalCachedStore();

  // 🔑 监听子 WebView 的 Store 请求
  webviewChannel.emitter.on(
    EChannelMessageEventType.requestStoreState,
    ({ senderId }) => {
      webviewChannel.sendMessage({
        receiverIds: [senderId],
        type: EChannelMessageEventType.sendStoreState,
        payload: {
          globalStore: {
            userConfigList: globalStore.userConfigList,
            globalSetting: globalStore.globalSetting,
            currentSignInUserId: globalStore.currentSignInUserId,
          },
        },
      });
    }
  );

  // 🔑 监听子 WebView 的未读数变更
  webviewChannel.emitter.on(
    EChannelMessageEventType.changeAppUnreadCount,
    ({ senderId, payload }) => {
      const app = appStore.getAppById(senderId);
      app.unreadCount = payload.unreadCount;
      appStore.persistUpdateAppList([app]);  // 触发持久化
    }
  );

  // 🔑 监听设置更新（需要广播给所有 WebView）
  webviewChannel.emitter.on(
    EChannelMessageEventType.updateSettings,
    ({ payload }) => {
      const { globalSetting } = payload;

      if (globalSetting) {
        userStore.updateGlobalSetting(globalSetting);

        if (isMainWebview()) {
          // 🔑 广播设置变更
          webviewChannel.sendMessage({
            receiverIds: ["*"],
            type: EChannelMessageEventType.updateSettings,
            payload: { globalSetting: globalStore.globalSetting },
          });
        }
      }
    }
  );
};
```

### 1.5 设计亮点与陷阱

#### ✅ 设计亮点

1. **单一写入者模式**：
   - 避免多进程文件争用
   - Tauri Store 的 `save()` 保证原子性
   - 配置版本管理（`migrateStore`）

2. **类型安全的消息通信**：
   ```typescript
   // ✅ TypeScript 检查 payload 类型
   webviewChannel.sendMessage({
     receiverIds: ["*"],
     type: EChannelMessageEventType.changeAppUnreadCount,
     payload: { unreadCount: 5 },  // 必须符合类型定义
   });
   ```

3. **防重复请求**：
   - `pendingRequest` 变量缓存 Promise
   - 避免多次并发请求

4. **轮询 + 超时机制**：
   - 每 2 秒重试，直到成功
   - 处理消息丢失场景

#### ⚠️ 常见陷阱

1. **忘记在子 WebView 中使用 noopPersistStorage**：
   ```typescript
   // ❌ 错误：子 WebView 也尝试写入磁盘
   storage: createJSONStorage(() => persistGlobalStorage)

   // ✅ 正确：根据 WebView 类型选择
   storage: createJSONStorage(() =>
     isMainWebview() ? persistGlobalStorage : noopPersistStorage
   )
   ```

2. **直接修改 Store 不触发持久化**：
   ```typescript
   // ❌ 错误：不会保存到磁盘
   appStore.appList[id].unreadCount = 5;

   // ✅ 正确：调用 action 触发持久化
   appStore.persistUpdateAppList([updatedApp]);
   ```

3. **广播消息造成无限循环**：
   ```typescript
   // ❌ 错误：会收到自己发送的消息
   webviewChannel.emitter.on("updateSettings", () => {
     webviewChannel.sendMessage({ receiverIds: ["*"], ... });
   });

   // ✅ 正确：过滤掉自己发送的消息
   #shouldNotifyMe(senderId, receiverIds) {
     if (this.isSelfSender(senderId)) return false;
     // ...
   }
   ```

### 1.6 性能优化

1. **延迟持久化**：
   ```typescript
   let debounceTimer: NodeJS.Timeout;

   export const debouncedPersist = (fn: () => void) => {
     clearTimeout(debounceTimer);
     debounceTimer = setTimeout(fn, 300);  // 300ms 内多次修改只写入一次
   };
   ```

2. **选择性同步**：
   ```typescript
   // 只同步必要的字段
   partialize: (state) => ({
     collapsedSections: state.collapsedSections,
     pinnedConversationIds: state.pinnedConversationIds,
     // 不同步 selectedConversationId（运行时状态）
   })
   ```

---

## 2. WhatsApp Webpack 模块劫持

### 2.1 技术挑战

**背景**：WhatsApp Web 使用 Webpack 打包，所有模块通过私有 `require()` 系统加载，无法通过 `window.XXX` 访问内部状态。

**核心需求**：
- 获取当前登录用户信息
- 监听聊天切换事件
- 发送消息
- 获取聊天列表和联系人

**技术难点**：
1. WhatsApp 的 Webpack runtime 在 `window.webpackChunkwhatsapp_web_client`
2. 模块名是内部字符串（如 `"WAWebCollections"`），不在文档中
3. 模块 ID 可能随版本变化

### 2.2 ModuleLoader 实现

**核心代码** (`packages/gc-engine/src/apps/whatsapp/sdk/modules/moduleLoader.ts`):

```typescript
/**
 * WhatsApp Web 模块加载器
 * 使用 window.require() 加载 WhatsApp Web 内部模块
 */
export class ModuleLoader {
  private cache = new Map<string, unknown>();

  /**
   * 获取指定模块
   * @param moduleName WhatsApp Web 内部模块名
   * @returns 模块实例或 null (模块不存在时)
   */
  get<T>(moduleName: string): T | null {
    // 🔑 缓存机制
    if (this.cache.has(moduleName)) {
      return this.cache.get(moduleName) as T;
    }

    try {
      // @ts-expect-error window.require 是 WhatsApp Web 注入的
      const module = window.require(moduleName);
      if (module) {
        this.cache.set(moduleName, module);
        return module as T;
      }
      return null;
    } catch (error) {
      console.warn(`[WhatsAppSDK] Module ${moduleName} not available:`, error);
      return null;
    }
  }

  /**
   * 获取指定模块 (必需)
   * @throws {ModuleLoadError} 当模块不存在时
   */
  getRequired<T>(moduleName: string): T {
    const module = this.get<T>(moduleName);
    if (!module) {
      throw new ModuleLoadError(moduleName);
    }
    return module;
  }
}

export const moduleLoader = new ModuleLoader();
```

### 2.3 关键模块映射

**类型定义** (`packages/gc-engine/src/apps/whatsapp/sdk/types.ts`):

```typescript
// 🔑 Store.Chat - 聊天列表集合
interface IStoreChat {
  get(chatId: string): IWAChatModel | undefined;
  getModelsArray(): IWAChatModel[];
  on(event: string, callback: Function): void;
}

// 🔑 Store.Contact - 联系人集合
interface IStoreContact {
  get(contactId: string): WAContact | undefined;
  getMeContact(): WAContact | undefined;
  getModelsArray(): WAContact[];
}

// 🔑 Chat 模型
interface IWAChatModel {
  id: WAWid;                    // 聊天 ID
  title(): string;              // 聊天标题（用户名或群名）
  t: number;                    // 最后活跃时间戳（秒）
  unreadCount: number;          // 未读数
  contact?: WAContact;          // 关联的联系人
}

// 🔑 Contact 模型
interface WAContact {
  id: WAWid;
  name?: string;
  pushname?: string;            // 昵称
  serialize(): {
    id: WAWid;
    name: string;
  };
}

// 🔑 WhatsApp ID 类型
interface WAWid {
  user: string;                 // 电话号码（不含国家码）
  _serialized: string;          // 完整 ID (e.g., "1234567890@c.us")
}
```

**模块加载示例** (`packages/gc-engine/src/apps/whatsapp/sdk/whatsappSDK.ts`):

```typescript
class WhatsAppSDK extends AbstractAppSDK {
  private _storeChat: IStoreChat | null = null;
  private _storeContact: IStoreContact | null = null;

  private initStore(): void {
    // 🔑 加载 Collections 模块
    const collections = moduleLoader.get<{
      Chat: IStoreChat;
      Contact: IStoreContact;
    }>("WAWebCollections");

    if (collections) {
      this._storeChat = collections.Chat;
      this._storeContact = collections.Contact;

      // @ts-expect-error 设置全局 Store（调试用）
      if (!window.Store) {
        window.Store = collections;
      }
    }

    // 🔑 加载联系人工具模块
    this._contactMethods = moduleLoader.get<IWAContactMethods>(
      "WAWebContactGetters"
    );

    // 🔑 加载头像模块
    this._profilePic = moduleLoader.get<IProfilePic>(
      "WAWebContactProfilePicThumbBridge"
    );
  }
}
```

### 2.4 实战应用

#### 2.4.1 获取当前用户信息

```typescript
async getCurrentUserInfo(): Promise<WAUserInfo | null> {
  if (!this.isLoggedIn || !this._storeContact) {
    return null;
  }

  try {
    // 🔑 获取 "我" 的联系人模型
    const meContactModel = await pollExcFn(
      () => this._storeContact?.getMeContact(),
      10_000  // 10 秒超时
    );

    if (!meContactModel) {
      return null;
    }

    const serialized = meContactModel.serialize();
    let avatarUrl = "";

    // 🔑 获取头像
    if (this._profilePic) {
      try {
        const pic = await this._profilePic.requestProfilePicFromServer(
          meContactModel.id
        );
        avatarUrl = pic.previewEurl || pic.eurl || "";
      } catch {
        // 头像获取失败（可忽略）
      }
    }

    return {
      id: meContactModel.id._serialized,
      nickname: serialized.name || "",
      avatar: avatarUrl,
      isGroup: false,
      phone: meContactModel.id.user,
    };
  } catch {
    return null;
  }
}
```

#### 2.4.2 发送消息

```typescript
async sendTextMessage(chatId: string, text: string): Promise<void> {
  if (!this.isLoggedIn) {
    throw new NotLoggedInError();
  }

  if (!this._storeChat) {
    throw new MessageSendError("Store.Chat not available");
  }

  // 🔑 获取聊天模型
  const chat = this._storeChat.get(chatId);
  if (!chat) {
    throw new ChatNotFoundError(chatId);
  }

  // 🔑 动态加载发送消息模块
  const sendModule = moduleLoader.get<{
    sendTextMsgToChat: (chat: IWAChatModel, text: string) => void;
  }>("WAWebSendTextMsgChatAction");

  if (!sendModule) {
    throw new MessageSendError("Send message module not available");
  }

  try {
    sendModule.sendTextMsgToChat(chat, text);
  } catch (error) {
    throw new MessageSendError(
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
```

#### 2.4.3 监听聊天切换

```typescript
private registerChatEventListeners(): void {
  if (!this._storeChat) {
    return;
  }

  const chatCleanup = registerChatChangeHandler(
    this._storeChat,
    this._contactMethods,
    (user) => {
      // 🔑 触发聊天切换事件
      this.emitter.emit(ESDKEventType.changeCurrentChatUser, {
        payload: { user },
      });
    }
  );
  this.eventManager.add(chatCleanup);
}
```

### 2.5 模块名发现技巧

**方法 1：搜索模块定义**

在浏览器控制台执行：

```javascript
// 🔑 获取所有 Webpack 模块
const modules = window.webpackChunkwhatsapp_web_client.push([
  [Symbol()],
  {},
  (e) => Object.values(e)
]);

// 搜索包含 "Chat" 的模块
modules.filter(m =>
  m?.exports?.default?.toString?.().includes("Chat")
);
```

**方法 2：查看网络请求**

1. 打开 DevTools → Network
2. 刷新 WhatsApp Web
3. 查找 `app.xxxxx.js` 文件
4. 搜索模块名字符串（如 `"WAWebCollections"`）

**方法 3：监听模块加载**

```javascript
const originalPush = window.webpackChunkwhatsapp_web_client.push;
window.webpackChunkwhatsapp_web_client.push = function(...args) {
  console.log("Module loaded:", args[0]);
  return originalPush.apply(this, args);
};
```

### 2.6 设计亮点与陷阱

#### ✅ 设计亮点

1. **缓存机制**：
   - 避免重复 `require()` 调用
   - 提高性能

2. **类型安全**：
   ```typescript
   const collections = moduleLoader.get<{
     Chat: IStoreChat;
     Contact: IStoreContact;
   }>("WAWebCollections");
   // TypeScript 会检查 collections.Chat 的类型
   ```

3. **降级策略**：
   ```typescript
   get<T>(moduleName: string): T | null {
     try {
       return window.require(moduleName);
     } catch {
       return null;  // 不抛异常，返回 null
     }
   }
   ```

#### ⚠️ 常见陷阱

1. **模块名变化**：
   - WhatsApp 更新可能改变模块名
   - 需要定期检查和更新

2. **时机问题**：
   ```typescript
   // ❌ 错误：WhatsApp 还未加载完成
   const store = moduleLoader.get("WAWebCollections");

   // ✅ 正确：等待 WhatsApp 初始化
   await pollExcFn(() => window.Debug?.VERSION !== undefined, 5 * 60_000);
   const store = moduleLoader.get("WAWebCollections");
   ```

3. **模块不存在**：
   ```typescript
   // ❌ 错误：直接使用可能导致 null 错误
   const store = moduleLoader.get("WAWebCollections");
   store.Chat.get(chatId);  // TypeError: Cannot read property 'get' of null

   // ✅ 正确：检查模块是否存在
   if (!this._storeChat) {
     throw new Error("Store.Chat not available");
   }
   ```

### 2.7 维护指南

1. **定期测试**：
   - 每周检查 WhatsApp Web 版本
   - 运行自动化测试验证模块可用性

2. **版本监控**：
   ```typescript
   const version = window.Debug?.VERSION;
   console.log("WhatsApp Web version:", version);
   ```

3. **错误上报**：
   ```typescript
   if (!moduleLoader.has("WAWebCollections")) {
     Sentry.captureMessage("Critical module missing", {
       extra: { version: window.Debug?.VERSION }
     });
   }
   ```

---

## 3. AOP History API 劫持

### 3.1 技术挑战

**问题**：Telegram Web 是纯 SPA 应用，使用 `history.pushState()` 实现页面导航，但**不触发** `popstate` 事件。

**需求**：监听聊天切换（URL 从 `#/im?p=u123` 变为 `#/im?p=u456`）。

**技术难点**：
- `popstate` 只在浏览器前进/后退时触发
- `hashchange` 只在 hash 变化时触发，但 Telegram 使用 `pushState` 修改 query 参数
- 无法直接监听 `history.pushState()` 调用

### 3.2 AOP 解决方案

**核心思想**：使用 AOP（面向切面编程）在原生 API 执行前后插入自定义逻辑。

```
原始调用链：
history.pushState(state, title, url)
    ↓
浏览器更新 URL
    ↓
（没有事件触发）

AOP 劫持后：
history.pushState(state, title, url)
    ↓
afterAOP 包装函数
    ↓
执行原始 pushState
    ↓
浏览器更新 URL
    ↓
触发自定义事件 CustomEvent("hkHistory")  ← 🔑 新增
    ↓
应用监听到 URL 变化
```

### 3.3 AOP 工具实现

**通用 AOP 函数** (`packages/misc/src/AOP.ts`):

```typescript
import { curryRight, noop } from "lodash-es";

type AnyFunction = (...args: any[]) => any;

/**
 * AOP 实现
 * @param targetFn 目标函数
 * @param beforeFn 前置函数
 * @param afterFn 后置函数
 */
export const implAOP: AnyFunction = curryRight(
  (
    targetFn: AnyFunction,
    beforeFn: AnyFunction,
    afterFn: (beforeResult: any, targetResult: any, ...args: any[]) => any,
  ) => {
    return (...args: any[]) => {
      const beforeResult = beforeFn(...args);       // 1. 执行前置逻辑
      const result = targetFn(...args);             // 2. 执行原函数
      afterFn(beforeResult, result, ...args);       // 3. 执行后置逻辑
      return result;                                // 4. 返回原函数结果
    };
  },
);

// 🔑 只有后置逻辑的 AOP
export const afterAOP = implAOP(noop, curryRight.placeholder);

// 🔑 只有前置逻辑的 AOP
export const beforeAOP = implAOP(noop);

// 异步版本
export const implAOPAsync: AnyFunction = curryRight(
  (targetFn, beforeFn, afterFn) => {
    return async (...args: any[]) => {
      const beforeResult = await beforeFn(...args);
      const result = await targetFn(...args);
      await afterFn(beforeResult, result, ...args);
      return result;
    };
  },
);

export const afterAOPAsync = implAOPAsync(noop, curryRight.placeholder);
```

**使用示例**：

```typescript
// 原始函数
const greet = (name: string) => {
  console.log(`Hello, ${name}!`);
  return `Greeted ${name}`;
};

// 添加后置逻辑
const greetWithLog = afterAOP((result) => {
  console.log(`After greeting, result: ${result}`);
})(greet);

greetWithLog("Alice");
// 输出：
// Hello, Alice!
// After greeting, result: Greeted Alice
```

### 3.4 History API 劫持实现

**核心代码** (`packages/misc/src/hijacker/hkHistory.ts`):

```typescript
import { afterAOP } from "../AOP";

export const hkHistory = () => {
  const triggerCustomEvent = (_state?: PopStateEvent["state"]) => {
    // 🔑 触发自定义事件
    const customEvent = new CustomEvent(hkHistory.name, {
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(customEvent);
  };

  // 🔑 创建 AOP 包装函数
  const triggerPopstateAOP = afterAOP(triggerCustomEvent);

  // 🔑 劫持 pushState
  window.History.prototype.pushState = triggerPopstateAOP(
    window.History.prototype.pushState.bind(history)
  );

  // 🔑 劫持 replaceState
  window.History.prototype.replaceState = triggerPopstateAOP(
    window.History.prototype.replaceState.bind(history)
  );
};

/**
 * 编程式导航（自动触发事件）
 */
export const navigateTo = (url: string) => {
  history.pushState(null, "", url);
  triggerPopstateEvent(window);  // 手动触发
};
```

### 3.5 应用层使用

**Telegram 引擎监听 URL 变化** (`packages/gc-engine/src/apps/telegram/telegram.ts`):

```typescript
import { hkHistory } from "@gc/misc";
import { AbstractAppEngine } from "../engine/AbstractAppEngine";

class Telegram extends AbstractAppEngine {
  appSDK = telegramSDK;

  listenerCurrentChatUserChange() {
    // 🔑 监听 hkHistory 触发的自定义事件
    window.addEventListener(hkHistory.name, () => {
      const currentChatUser = appStore.getCurrentChatUserByAppId();
      const currentChatUserId = this.appSDK.currentChatUserId;

      // 避免重复触发
      if (isEqual(currentChatUserId, currentChatUser?.id)) {
        return;
      }

      // 🔑 获取新的聊天用户信息
      const chatUserInfo = this.appSDK.getCurrentChatUserInfo(
        currentChatUserId!
      );

      // 🔑 更新 appStore
      this.handleChangeCurrentChatUser(chatUserInfo);
    });
  }
}
```

**AbstractAppEngine 初始化** (`packages/gc-engine/src/apps/engine/AbstractAppEngine.ts`):

```typescript
abstract class AbstractAppEngine extends AbstractLifeCycle {
  async mount() {
    hkHistory();  // 🔑 1. 劫持 History API

    this.appSDK.mount();  // 2. 启动 SDK

    this.appSDK.emitter.on(ESDKEventType.changeLoginStatus, ({ payload }) => {
      this.handleLoginChange(payload.isLogin);
    });

    await this.initAppSetting();  // 3. 初始化设置

    this.listenerCurrentChatUserChange();  // 🔑 4. 监听 URL 变化
  }

  abstract listenerCurrentChatUserChange(): void;
}
```

### 3.6 执行流程

```
用户点击 Telegram 聊天列表中的 "Alice"
    ↓
Telegram 内部调用：
history.pushState(null, "", "#/im?p=u123456")
    ↓
被劫持的 pushState 执行：
1. 执行原始 pushState → URL 变为 "#/im?p=u123456"
2. 执行 afterFn → 触发 CustomEvent("hkHistory")
    ↓
Telegram 引擎监听到事件：
window.addEventListener("hkHistory", () => {
  const currentChatUserId = telegramSDK.currentChatUserId;  // 从 URL 解析
  const chatUserInfo = telegramSDK.getCurrentChatUserInfo(currentChatUserId);
  this.handleChangeCurrentChatUser(chatUserInfo);
})
    ↓
更新 appStore：
appStore.updateCurrentChatUserByAppId(chatUserInfo, "telegram")
    ↓
WebView 通知主 Renderer：
webviewChannel.sendMessage({
  receiverIds: [MainWebviewId],
  type: EChannelMessageEventType.changeAppCurrentChatUser,
  payload: { userInfo: chatUserInfo },
})
    ↓
主 Renderer 更新 UI
```

### 3.7 设计亮点与陷阱

#### ✅ 设计亮点

1. **零性能开销**：
   - 只劫持 API，不使用轮询
   - 事件驱动，按需触发

2. **通用性强**：
   - 适用于所有 SPA 应用
   - 不依赖具体框架（React Router、Vue Router 等）

3. **可组合**：
   ```typescript
   const logAndNotify = compose(
     afterAOP(console.log),
     afterAOP(triggerCustomEvent)
   );

   window.History.prototype.pushState = logAndNotify(
     window.History.prototype.pushState.bind(history)
   );
   ```

#### ⚠️ 常见陷阱

1. **忘记 bind(history)**：
   ```typescript
   // ❌ 错误：this 丢失
   window.History.prototype.pushState = triggerPopstateAOP(
     window.History.prototype.pushState
   );

   // ✅ 正确：绑定 this
   window.History.prototype.pushState = triggerPopstateAOP(
     window.History.prototype.pushState.bind(history)
   );
   ```

2. **多次劫持导致栈溢出**：
   ```typescript
   // ❌ 错误：重复调用 hkHistory()
   hkHistory();
   hkHistory();  // 第二次劫持会包装已劫持的函数

   // ✅ 正确：只调用一次
   let isHijacked = false;
   export const hkHistory = () => {
     if (isHijacked) return;
     isHijacked = true;
     // ...
   };
   ```

3. **事件名冲突**：
   ```typescript
   // ❌ 错误：使用通用名称
   const customEvent = new CustomEvent("urlChange");

   // ✅ 正确：使用唯一名称
   const customEvent = new CustomEvent(hkHistory.name);  // "hkHistory"
   ```

### 3.8 性能对比

| 方案 | 实现方式 | 性能 | 可靠性 |
|------|----------|------|--------|
| **AOP 劫持** | 劫持 pushState/replaceState | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **轮询 URL** | setInterval(() => checkURL(), 100) | ⭐⭐ | ⭐⭐⭐⭐ |
| **MutationObserver** | 监听 DOM 变化 | ⭐⭐⭐ | ⭐⭐⭐ |
| **Proxy location** | new Proxy(window.location) | ⭐⭐⭐⭐ | ⭐⭐ |

**AOP 劫持优势**：
- 零延迟（实时触发）
- 低 CPU 占用（事件驱动）
- 高可靠性（直接劫持源头）

---

## 4. 三层 Store 架构

### 4.1 架构设计

**核心理念**：职责分离 + 单向数据流

```
┌─────────────────────────────────────────────────────────┐
│                  globalStore (L1)                        │
│                 持久化配置层                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │ userConfigList: Record<userId, UserConfig>         │ │
│  │ globalSetting: IGlobalSetting                      │ │
│  │ currentSignInUserId: string                        │ │
│  │                                                    │ │
│  │ 📁 持久化到: settings.json (Tauri Store)           │ │
│  │ ⚠️ 只有主 Renderer 能写入                          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓ syncPersistCache()
┌─────────────────────────────────────────────────────────┐
│                   userStore (L2)                         │
│                  内存配置层                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │ userInfo: IUser                                    │ │
│  │ globalSetting: IGlobalSetting                      │ │
│  │ thirdAppConfigList: Record<appId, IThirdAppConfig> │ │
│  │                                                    │ │
│  │ 🔄 通过 syncPersistCache() 同步到 globalStore       │ │
│  │ 📖 配置的"定义"（应用 URL、代理设置等）              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓ getAppListFromUserStore()
┌─────────────────────────────────────────────────────────┐
│                    appStore (L3)                         │
│                  运行时状态层                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │ appList: Record<appId, AppState>                   │ │
│  │ currentAppId: string | null                        │ │
│  │                                                    │ │
│  │ ⚡ 应用的"运行状态"：                                 │ │
│  │   - unreadCount: number                            │ │
│  │   - userInfo: IThirdAppUserInfo                    │ │
│  │   - loadingStatus: ELoadingStatus                  │ │
│  │   - currentChatUser: IThirdAppUserInfo             │ │
│  │                                                    │ │
│  │ ❌ 完全内存态，不持久化                              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4.2 数据流转详解

#### 4.2.1 配置 vs 状态

**关键区别**：

| 层级 | 存储内容 | 示例 | 持久化 |
|------|----------|------|--------|
| **userStore.thirdAppConfigList** | 应用的**定义** | `{ url: "https://web.whatsapp.com", proxy: { ... } }` | ✅ |
| **appStore.appList** | 应用的**运行状态** | `{ unreadCount: 5, userInfo: { nickname: "Alice" } }` | ❌ |

**为什么分离？**

```typescript
// ❌ 错误理解：认为是重复数据
userStore.thirdAppConfigList.telegram = { id: "telegram", url: "..." };
appStore.appList.telegram = { id: "telegram", unreadCount: 5 };

// ✅ 正确理解：不同层级的职责
// userStore: 定义了"Telegram 应用"这个概念（静态配置）
// appStore: 描述了"Telegram 应用当前运行状态"（动态数据）
```

#### 4.2.2 同步流程

**场景 1：用户修改代理设置**

```typescript
// 1. 用户在设置页面修改代理
userStore.updateGlobalSetting({
  ...userStore.globalSetting,
  proxy: { type: "http", host: "127.0.0.1", port: 7890 },
});

// 2. userStore 同步到 globalStore
userStore.syncPersistCache();  // 触发持久化

// 3. globalStore 写入磁盘（仅主 Renderer）
if (isMainWebview()) {
  await settingStorage.set("globalStore", {
    version: 1,
    state: globalStore.getState(),
  });
  await settingStorage.save();  // 🔑 原子性写入
}

// 4. 广播设置变更给所有 WebView
webviewChannel.sendMessage({
  receiverIds: ["*"],
  type: EChannelMessageEventType.updateSettings,
  payload: { globalSetting: globalStore.globalSetting },
});

// 5. 重新加载所有受影响的 WebView
webviewManger.reloadAll((appConfig) => !appConfig.proxy.isIndependent);
```

**场景 2：子 WebView 更新未读数**

```typescript
// 1. WhatsApp WebView 检测到新消息
const unreadCount = whatsappSDK.getUnreadCount();

// 2. 更新本地 appStore（内存）
appStore.updateAppUnreadCount(unreadCount);

// 3. 通知主 Renderer
webviewChannel.sendMessage({
  receiverIds: [MainWebviewId],
  type: EChannelMessageEventType.changeAppUnreadCount,
  payload: { unreadCount },
});

// 4. 主 Renderer 更新 appStore（触发 UI 重渲染）
webviewChannel.emitter.on(
  EChannelMessageEventType.changeAppUnreadCount,
  ({ senderId, payload }) => {
    const app = appStore.getAppById(senderId);
    app.unreadCount = payload.unreadCount;
    appStore.persistUpdateAppList([app]);  // 更新并持久化配置
  }
);
```

### 4.3 核心代码实现

#### 4.3.1 globalStore

**代码** (`packages/store/src/globalStore.ts`):

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { persistGlobalStorage, noopPersistStorage } from "./helper/persistStorage";

interface Store {
  userConfigList: Record<string, UserConfig>;
  globalSetting: IGlobalSetting;
  currentSignInUserId: string | undefined;

  // Actions
  updateUserConfigList: (configs: UserConfig[]) => void;
  updateGlobalSetting: (setting: IGlobalSetting) => void;
  signIn: (user: IUser) => void;
  signOut: () => void;
  isSignEd: () => boolean;
  getCurrentSignInUserConfig: () => UserConfig | undefined;
}

export const useGlobalStore = create<Store>()(
  persist(
    (set, get) => ({
      userConfigList: {},
      globalSetting: makeEmptyGlobalSetting(),
      currentSignInUserId: undefined,

      updateUserConfigList: (configs) => {
        set((state) => {
          const newList = { ...state.userConfigList };
          configs.forEach(config => {
            newList[config.userInfo.id] = config;
          });
          return { userConfigList: newList };
        });
      },

      updateGlobalSetting: (setting) => {
        set({ globalSetting: setting });
      },

      signIn: (user) => {
        let config = get().userConfigList[user.id] || makeEmptyUserConfig();
        config.userInfo = user;
        get().updateUserConfigList([config]);

        // 🔑 同步到其他两层
        userStore.setUserStore(config);
        appStore.setAppStore(getAppListFromUserStore());

        set({ currentSignInUserId: user.id });
      },

      signOut: () => {
        set({ currentSignInUserId: undefined });
      },

      isSignEd: () => {
        return !!get().currentSignInUserId;
      },

      getCurrentSignInUserConfig: () => {
        const userId = get().currentSignInUserId;
        return userId ? get().userConfigList[userId] : undefined;
      },
    }),
    {
      name: "globalStore",
      storage: createJSONStorage(() => {
        // 🔑 动态选择存储实现
        return isMainWebview() ? persistGlobalStorage : noopPersistStorage;
      }),
    }
  )
);

// 🔑 Proxy 包装（供非 React 代码使用）
export const globalStore = createStoreProxy(useGlobalStore);
```

#### 4.3.2 userStore

**代码** (`packages/store/src/userStore.ts`):

```typescript
import { create } from "zustand";

interface Store {
  userInfo: IUser;
  globalSetting: IGlobalSetting;
  thirdAppConfigList: Record<string, IThirdAppConfig>;

  // Actions
  setUserStore: (config: UserConfig) => void;
  updateGlobalSetting: (setting: IGlobalSetting) => void;
  updateThirdAppList: (configs: IThirdAppConfig[]) => void;
  syncPersistCache: () => void;  // 🔑 同步到 globalStore
}

export const useUserStore = create<Store>((set, get) => ({
  userInfo: makeEmptyUser(),
  globalSetting: makeEmptyGlobalSetting(),
  thirdAppConfigList: {},

  setUserStore: (config) => {
    set({
      userInfo: config.userInfo,
      globalSetting: config.globalSetting,
      thirdAppConfigList: config.thirdAppConfigList,
    });
  },

  updateGlobalSetting: (setting) => {
    set({ globalSetting: setting });
    get().syncPersistCache();  // 🔑 触发持久化
  },

  updateThirdAppList: (configs) => {
    set((state) => {
      const newList = { ...state.thirdAppConfigList };
      configs.forEach(config => {
        newList[config.id] = config;
      });
      return { thirdAppConfigList: newList };
    });
    get().syncPersistCache();  // 🔑 触发持久化
  },

  syncPersistCache: () => {
    const config = globalStore.getCurrentSignInUserConfig();
    if (!config) return;

    // 🔑 同步到 globalStore
    config.userInfo = get().userInfo;
    config.globalSetting = get().globalSetting;
    config.thirdAppConfigList = get().thirdAppConfigList;

    globalStore.updateUserConfigList([config]);
  },
}));

export const userStore = createStoreProxy(useUserStore);
```

#### 4.3.3 appStore

**代码** (`packages/store/src/appStore.ts`):

```typescript
import { create } from "zustand";

interface Store {
  appList: Record<string, AppState>;
  currentAppId: string | null;

  // Actions
  setAppStore: (appList: Record<string, AppState>) => void;
  updateAppList: (apps: AppState[]) => void;
  persistUpdateAppList: (apps: AppState[]) => void;  // 🔑 更新并持久化配置
  getAppById: (id: string) => AppState;
  changeCurrentApp: (app: AppState) => void;
  updateCurrentChatUserByAppId: (user: IThirdAppUserInfo, appId: string) => void;
}

export const useAppStore = create<Store>((set, get) => ({
  appList: getAppListFromUserStore(),
  currentAppId: null,

  setAppStore: (appList) => {
    set({ appList });
  },

  updateAppList: (apps) => {
    set((state) => {
      const newList = { ...state.appList };
      apps.forEach(app => {
        newList[app.id] = app;
      });
      return { appList: newList };
    });
  },

  persistUpdateAppList: (apps) => {
    // 🔑 1. 更新 appStore
    get().updateAppList(apps);

    // 🔑 2. 同步配置到 userStore
    apps.forEach(app => {
      const config = userStore.thirdAppConfigList[app.id];
      if (config) {
        config.lastUserInfo = app.userInfo;
      }
    });

    userStore.updateThirdAppList(Object.values(userStore.thirdAppConfigList));
  },

  getAppById: (id) => {
    return get().appList[id] || makeEmptyAppState(id);
  },

  changeCurrentApp: (app) => {
    set({ currentAppId: app.id });
  },

  updateCurrentChatUserByAppId: (user, appId) => {
    const app = get().getAppById(appId);
    app.currentChatUser = user;
    get().updateAppList([app]);
  },
}));

export const appStore = createStoreProxy(useAppStore);
```

### 4.4 Proxy 包装的作用

**问题**：Zustand Store 是 React Hook，非 React 代码无法使用。

**解决方案**：Proxy 包装

```typescript
// packages/store/src/helper/createStoreProxy.ts
export function createStoreProxy<T>(useStore: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const state = useStore.getState();
      const value = state[prop as keyof T];

      // 🔑 如果是函数，绑定 this
      if (typeof value === "function") {
        return value.bind(state);
      }

      return value;
    },
  });
}

// 使用
export const globalStore = createStoreProxy(useGlobalStore);

// 非 React 代码中使用
import { globalStore } from "@gc/store";

function someUtilFunction() {
  const setting = globalStore.globalSetting;  // ✅ 可以访问
  globalStore.updateGlobalSetting({ ... });   // ✅ 可以调用 action
}
```

**⚠️ 重要限制**：Proxy 访问不会触发 React 重渲染，仅用于读取数据和调用 action。

### 4.5 设计亮点与陷阱

#### ✅ 设计亮点

1. **职责清晰**：
   - globalStore：持久化
   - userStore：配置
   - appStore：运行时状态

2. **单向数据流**：
   ```
   globalStore → userStore → appStore
   (不允许反向依赖)
   ```

3. **类型安全**：
   ```typescript
   // ✅ TypeScript 检查字段类型
   globalStore.updateGlobalSetting({
     proxy: { type: "http", host: "127.0.0.1" }  // 类型检查
   });
   ```

#### ⚠️ 常见陷阱

1. **直接修改 Store 不触发持久化**：
   ```typescript
   // ❌ 错误
   appStore.appList.telegram.unreadCount = 5;

   // ✅ 正确
   appStore.persistUpdateAppList([{
     ...appStore.appList.telegram,
     unreadCount: 5,
   }]);
   ```

2. **忘记调用 syncPersistCache**：
   ```typescript
   // ❌ 错误：修改不会保存
   userStore.thirdAppConfigList.telegram.url = "https://new-url.com";

   // ✅ 正确
   userStore.updateThirdAppList([{
     ...userStore.thirdAppConfigList.telegram,
     url: "https://new-url.com",
   }]);
   // updateThirdAppList 内部会调用 syncPersistCache()
   ```

3. **Proxy 包装的响应式陷阱**：
   ```typescript
   // ❌ 错误：React 组件中使用 Proxy
   function MyComponent() {
     const setting = globalStore.globalSetting;  // 不会触发重渲染
     return <div>{setting.theme}</div>;
   }

   // ✅ 正确：使用 Hook
   function MyComponent() {
     const setting = useGlobalStore(state => state.globalSetting);
     return <div>{setting.theme}</div>;
   }
   ```

---

## 5. InjectJS 注入时机控制

### 5.1 技术挑战

**核心需求**：在第三方平台（WhatsApp、Telegram）的 JavaScript 执行**之前**注入代码。

**挑战**：
1. 如果注入太晚，无法劫持 `history.pushState()`
2. 如果注入太早，`window.require` 还未定义
3. 动态 `import()` 是异步的，不适合 initialization script

**时序要求**：

```
理想时序：
1. 浏览器创建 DOM
2. 🔑 注入 InjectJS（同步执行）
3. 第三方平台加载 JS
4. InjectJS 劫持的 API 开始工作

实际难点：
- Tauri WebView 的 initialization_script 必须是同步代码
- 不能使用 ES Modules 的 import/export
- 需要预编译成 IIFE（立即执行函数）
```

### 5.2 Tauri 注入机制

**Rust 端配置** (`src-tauri/src/lib.rs`):

```rust
use tauri::webview::WebviewBuilder;

let webview = WebviewBuilder::new(
  "telegram",  // WebView ID
  WebviewUrl::App("https://web.telegram.org".into())
)
// 🔑 initialization_script 在任何 JS 执行前运行
.initialization_script(include_str!("../dist-preload/index.js"))
.build()?;
```

**关键特性**：

| 特性 | 说明 |
|------|------|
| **执行时机** | DOM 创建后，所有 `<script>` 标签执行前 |
| **同步执行** | 不能使用 `async/await` 或动态 `import()` |
| **单文件** | 必须是完整的 bundle，不能依赖外部模块 |
| **访问权限** | 可以访问 `window`、`document`，但 DOM 可能为空 |

### 5.3 构建配置

#### 5.3.1 Vite 配置

**配置文件** (`apps/global-chat-desktop/vite.config-preload.ts`):

```typescript
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src-preload/index.ts"),
      formats: ["iife"],  // 🔑 立即执行函数格式
      name: "GCEngine",   // 全局变量名
    },
    outDir: resolve(__dirname, "src-tauri/dist-preload"),
    rollupOptions: {
      output: {
        entryFileNames: "index.js",  // 🔑 单文件输出
        inlineDynamicImports: true,  // 🔑 内联所有动态导入
      },
    },
    minify: false,  // 调试时禁用压缩
  },
  resolve: {
    alias: {
      "@gc/gc-engine": resolve(__dirname, "../../packages/gc-engine/src"),
      "@gc/store": resolve(__dirname, "../../packages/store/src"),
      // ... 其他别名
    },
  },
});
```

**生成的 bundle 结构**：

```javascript
// src-tauri/dist-preload/index.js
(function (GCEngine) {
  'use strict';

  // 🔑 所有依赖都内联到这个文件
  var lodash = { ... };
  var mitt = { ... };
  var gcEngine = { ... };

  // 🔑 立即执行
  gcEngine.mount();

})(this.GCEngine = this.GCEngine || {});
```

#### 5.3.2 InjectJS 入口

**代码** (`apps/global-chat-desktop/src-preload/index.ts`):

```typescript
import { gcEngine } from "@gc/gc-engine";

// 🔑 极简入口，只有 3 行
gcEngine.mount();
```

**为什么这么简单？**

所有逻辑都封装在 `@gc/gc-engine` 包中：

```typescript
// packages/gc-engine/src/GCEngine.ts
class GCEngine implements AbstractLifeCycle {
  async mount() {
    await initThirdApp();  // 初始化 WebView Channel、Store 同步

    const currentWebviewId = getCurrentWebviewId();
    const app = appStore.appList[currentWebviewId];

    if (isEmpty(app)) return;

    await this.excApp(app.platform);  // 启动平台引擎
  }

  async excApp(platform: EPlatform) {
    switch (platform) {
      case EPlatform.Telegram:
        await telegram.mount();  // 劫持 History、启动 SDK
        break;
      case EPlatform.Whatsapp:
        await whatsapp.mount();
        break;
      // ...
    }
  }
}
```

### 5.4 执行流程

```
┌──────────────────────────────────────────────────────────┐
│ 1. Tauri 创建 WebView                                    │
│    WebviewBuilder::new("telegram", url)                  │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 2. 加载 URL                                              │
│    GET https://web.telegram.org                          │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 3. 🔑 执行 initialization_script (同步)                  │
│    include_str!("../dist-preload/index.js")              │
│    ├── initThirdApp()                                    │
│    │   ├── webviewChannel.mount()                        │
│    │   ├── syncLocalCachedStore()                        │
│    │   └── globalSettingManager.mount()                  │
│    └── telegram.mount()                                  │
│        ├── hkHistory()  ← 劫持 History API               │
│        ├── telegramSDK.mount()                           │
│        └── listenerCurrentChatUserChange()               │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 4. 执行页面的 <script> 标签                              │
│    <script src="telegram.xxxxx.js"></script>             │
│    ↓                                                     │
│    history.pushState(...) ← 已被劫持                     │
└──────────────────────────────────────────────────────────┘
```

### 5.5 时机验证

**测试代码** (`src-preload/index.ts`):

```typescript
import { gcEngine } from "@gc/gc-engine";

console.log("[InjectJS] 开始执行", {
  url: window.location.href,
  domReady: document.readyState,
  bodyExists: !!document.body,
  headExists: !!document.head,
});

// 🔑 验证劫持成功
const originalPushState = window.History.prototype.pushState;
gcEngine.mount();
const hijackedPushState = window.History.prototype.pushState;

console.log("[InjectJS] History 劫持状态:", {
  isHijacked: originalPushState !== hijackedPushState,
});

// 预期输出：
// [InjectJS] 开始执行 { url: "https://web.telegram.org", domReady: "loading", ... }
// [InjectJS] History 劫持状态: { isHijacked: true }
```

### 5.6 构建命令

**package.json** (`apps/global-chat-desktop/package.json`):

```json
{
  "scripts": {
    "build:preload": "vite build --config vite.config-preload.ts",
    "build": "npm run build:preload && vite build",
    "dev": "npm run build:preload && tauri dev"
  }
}
```

**Taskfile.yml** (推荐方式):

```yaml
version: '3'

tasks:
  build:preload:
    cmds:
      - bun run build:preload
    sources:
      - src-preload/**/*.ts
      - ../../packages/gc-engine/src/**/*.ts
    generates:
      - src-tauri/dist-preload/index.js

  dev:
    deps: [build:preload]
    cmds:
      - tauri dev
```

### 5.7 设计亮点与陷阱

#### ✅ 设计亮点

1. **极简入口**：
   - InjectJS 只有 3 行代码
   - 所有逻辑在包中，易于测试

2. **IIFE 格式**：
   - 不污染全局作用域
   - 兼容所有浏览器

3. **预编译优化**：
   - 构建时内联所有依赖
   - 运行时零网络请求

#### ⚠️ 常见陷阱

1. **动态导入失败**：
   ```typescript
   // ❌ 错误：initialization_script 不支持
   const { gcEngine } = await import("@gc/gc-engine");

   // ✅ 正确：使用同步导入
   import { gcEngine } from "@gc/gc-engine";
   ```

2. **DOM 未就绪**：
   ```typescript
   // ❌ 错误：body 可能为 null
   document.body.style.background = "red";

   // ✅ 正确：等待 DOM Ready
   await domReady();
   document.body.style.background = "red";
   ```

3. **忘记重新构建**：
   ```bash
   # ❌ 错误：直接运行 tauri dev
   tauri dev

   # ✅ 正确：先构建 preload
   bun run build:preload && tauri dev
   ```

### 5.8 调试技巧

1. **禁用压缩**：
   ```typescript
   export default defineConfig({
     build: {
       minify: false,  // 🔑 保留可读性
       sourcemap: true,
     },
   });
   ```

2. **添加日志**：
   ```typescript
   // src-preload/index.ts
   console.log("[InjectJS] 版本:", "1.3.0");
   console.log("[InjectJS] 平台:", getCurrentWebviewId());
   ```

3. **检查生成文件**：
   ```bash
   cat src-tauri/dist-preload/index.js | head -n 50
   # 应该看到 IIFE 包装和完整依赖
   ```

---

## 6. 抽象引擎架构

### 6.1 设计目标

**核心挑战**：8 个平台的消息获取方式完全不同，如何统一抽象？

| 平台 | 聊天切换检测 | 数据获取方式 | SDK 复杂度 |
|------|-------------|--------------|-----------|
| WhatsApp | SDK 事件 | Webpack ModuleLoader | ⭐⭐⭐⭐⭐ |
| Telegram | URL 变化 | global.users.byId | ⭐⭐⭐⭐ |
| Instagram | URL 变化 | DOM 解析 | ⭐⭐⭐ |
| Messenger | URL 变化 | DOM 解析 | ⭐⭐⭐ |
| 其他平台 | URL 变化 | DOM 解析 | ⭐⭐ |

**设计目标**：
1. 定义统一的生命周期流程
2. 抽象平台差异为策略接口
3. 复用通用逻辑（History 劫持、Store 同步）
4. 易于扩展新平台

### 6.2 架构设计

**模式组合**：

```
┌─────────────────────────────────────────────────────────┐
│              AbstractAppEngine (抽象类)                  │
│                    模板方法模式                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ mount() {                                          │ │
│  │   hkHistory();                  // 1. 通用逻辑     │ │
│  │   this.appSDK.mount();          // 2. 策略调用     │ │
│  │   await this.initAppSetting();  // 3. 钩子方法     │ │
│  │   this.listenerCurrentChatUserChange();  // 4. 抽象方法 │ │
│  │ }                                                  │ │
│  │                                                    │ │
│  │ abstract appSDK: AbstractAppSDK;  // 🔑 策略注入  │ │
│  │ abstract listenerCurrentChatUserChange(): void;   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓ 继承
┌─────────────────────────────────────────────────────────┐
│                Telegram extends AbstractAppEngine        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ appSDK = telegramSDK;  // 🔑 注入具体策略          │ │
│  │                                                    │ │
│  │ listenerCurrentChatUserChange() {                 │ │
│  │   window.addEventListener(hkHistory.name, () => { │ │
│  │     const userId = this.appSDK.currentChatUserId; │ │
│  │     this.handleChangeCurrentChatUser(...);        │ │
│  │   });                                             │ │
│  │ }                                                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓ 使用
┌─────────────────────────────────────────────────────────┐
│          AbstractAppSDK (策略接口)                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ abstract get currentUserId(): string | null;      │ │
│  │ abstract get currentChatUserId(): string;         │ │
│  │ abstract getCurrentUserInfo(): Promise<...>;      │ │
│  │ abstract getCurrentChatUserInfo(userId): ...;     │ │
│  │ abstract isGroup(userId): boolean;                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓ 实现
┌─────────────────────────────────────────────────────────┐
│            TelegramSDK extends AbstractAppSDK            │
│  ┌────────────────────────────────────────────────────┐ │
│  │ get currentUserId() {                             │ │
│  │   return global.tgapp?.userId?.toString();        │ │
│  │ }                                                  │ │
│  │                                                    │ │
│  │ get currentChatUserId() {                         │ │
│  │   const match = location.hash.match(/#\/im\?p=(.+)/); │ │
│  │   return match?.[1] || "";                        │ │
│  │ }                                                  │ │
│  │                                                    │ │
│  │ getCurrentChatUserInfo(userId) {                  │ │
│  │   return global.users.byId.get(userId);           │ │
│  │ }                                                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 6.3 核心代码实现

#### 6.3.1 AbstractAppEngine

**代码** (`packages/gc-engine/src/apps/engine/AbstractAppEngine.ts`):

```typescript
import { AbstractLifeCycle } from "@gc/misc";
import { hkHistory } from "@gc/misc";
import type { AbstractAppSDK } from "./sdk/AbstractAppSDK";
import { ESDKEventType } from "./sdk/SDKEvent";

export abstract class AbstractAppEngine extends AbstractLifeCycle {
  // 🔑 策略注入点：由子类提供具体 SDK
  abstract appSDK: AbstractAppSDK;

  /**
   * 🔑 模板方法：定义初始化流程
   */
  async mount() {
    // 1️⃣ 通用逻辑：劫持 History API
    hkHistory();

    // 2️⃣ 策略调用：启动平台 SDK
    this.appSDK.mount();

    // 3️⃣ 观察者模式：监听登录状态变化
    this.appSDK.emitter.on(
      ESDKEventType.changeLoginStatus,
      ({ payload }) => {
        this.handleLoginChange(payload.isLogin);
      }
    );

    // 4️⃣ 钩子方法：初始化应用设置
    await this.initAppSetting();

    // 5️⃣ 抽象方法：由子类实现聊天切换监听
    this.listenerCurrentChatUserChange();
  }

  /**
   * 🔑 抽象方法：子类必须实现
   */
  abstract listenerCurrentChatUserChange(): void;

  /**
   * 🔑 钩子方法：子类可以覆盖
   */
  async initAppSetting() {
    if (!this.appSDK.isLoginEd) {
      return;
    }

    const currentUserInfo = await this.appSDK.getCurrentUserInfo();
    if (currentUserInfo) {
      this.handleChangeUserInfo(currentUserInfo);
    }
  }

  /**
   * 🔑 通用逻辑：处理聊天用户切换
   */
  protected handleChangeCurrentChatUser(userInfo: IThirdAppUserInfo | null) {
    appStore.updateCurrentChatUserByAppId(userInfo, this.getAppId());

    // 通知主 Renderer
    webviewChannel.sendMessage({
      receiverIds: [MainWebviewId],
      type: EChannelMessageEventType.changeAppCurrentChatUser,
      payload: { userInfo },
    });
  }

  /**
   * 🔑 通用逻辑：处理用户信息变更
   */
  protected handleChangeUserInfo(userInfo: IThirdAppUserInfo) {
    const app = appStore.getAppById(this.getAppId());
    app.userInfo = userInfo;
    appStore.persistUpdateAppList([app]);

    // 通知主 Renderer
    webviewChannel.sendMessage({
      receiverIds: [MainWebviewId],
      type: EChannelMessageEventType.changeAppUserInfo,
      payload: { userInfo },
    });
  }

  /**
   * 清理资源
   */
  destroy() {
    this.appSDK.destroy();
  }

  private getAppId(): string {
    return getCurrentWebviewId();
  }
}
```

#### 6.3.2 AbstractAppSDK

**代码** (`packages/gc-engine/src/apps/engine/sdk/AbstractAppSDK.ts`):

```typescript
import { SDKEvent, ESDKEventType } from "./SDKEvent";
import type { IThirdAppUserInfo } from "@gc/model";
import type { Nullable } from "@gc/utils";

/**
 * 🔑 策略接口：定义平台 SDK 必须实现的方法
 */
export abstract class AbstractAppSDK extends SDKEvent {
  /**
   * 获取当前登录用户 ID
   */
  abstract get currentUserId(): Nullable<string>;

  /**
   * 获取当前聊天对象 ID
   */
  abstract get currentChatUserId(): string;

  /**
   * 是否在聊天页面
   */
  abstract get isChatPage(): boolean;

  /**
   * 获取当前登录用户信息
   */
  abstract getCurrentUserInfo(): Promise<Nullable<IThirdAppUserInfo>>;

  /**
   * 获取指定聊天对象信息
   * @param userId 用户 ID
   */
  abstract getCurrentChatUserInfo(
    userId: string
  ): Nullable<IThirdAppUserInfo> | Promise<Nullable<IThirdAppUserInfo>>;

  /**
   * 判断是否为群组
   * @param userId 用户 ID
   */
  abstract isGroup(userId: string): boolean;

  /**
   * 🔑 默认实现：基于 currentUserId 判断登录状态
   */
  get isLoginEd() {
    return !!this.currentUserId;
  }

  /**
   * 设置主题（可选）
   */
  setTheme?(_theme: "dark" | "light"): void;
}
```

#### 6.3.3 Telegram 实现

**引擎层** (`packages/gc-engine/src/apps/telegram/telegram.ts`):

```typescript
import { AbstractAppEngine } from "../engine/AbstractAppEngine";
import { telegramSDK } from "./sdk";
import { hkHistory } from "@gc/misc";

class Telegram extends AbstractAppEngine {
  // 🔑 注入 Telegram SDK
  appSDK = telegramSDK;

  constructor() {
    super();
    attachStyleSheet(styles);  // 注入自定义样式
  }

  /**
   * 🔑 实现抽象方法：监听聊天切换
   * 使用 URL 变化检测
   */
  listenerCurrentChatUserChange() {
    window.addEventListener(hkHistory.name, () => {
      const currentChatUser = appStore.getCurrentChatUserByAppId();
      const currentChatUserId = this.appSDK.currentChatUserId;

      // 避免重复触发
      if (isEqual(currentChatUserId, currentChatUser?.id)) {
        return;
      }

      const chatUserInfo = this.appSDK.getCurrentChatUserInfo(
        currentChatUserId!
      );

      this.handleChangeCurrentChatUser(chatUserInfo);
    });
  }

  /**
   * 🔑 覆盖钩子方法：初始化主题
   */
  async initAppSetting() {
    if (!this.appSDK.isLoginEd) {
      return;
    }
    await this.appSDK.setTheme();
  }
}

export const telegram = new Telegram();
```

**SDK 层** (`packages/gc-engine/src/apps/telegram/sdk/telegramSDK.ts`):

```typescript
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK";

class TelegramSDK extends AbstractAppSDK {
  /**
   * 🔑 实现策略方法：获取当前用户 ID
   */
  get currentUserId(): string | null {
    // @ts-expect-error Telegram global 对象
    return global.tgapp?.userId?.toString() || null;
  }

  /**
   * 🔑 实现策略方法：从 URL 解析聊天 ID
   */
  get currentChatUserId(): string {
    const match = location.hash.match(/#\/im\?p=(.+)/);
    return match?.[1] || "";
  }

  /**
   * 🔑 实现策略方法：是否在聊天页面
   */
  get isChatPage(): boolean {
    return location.hash.includes("#/im");
  }

  /**
   * 🔑 实现策略方法：获取用户信息
   */
  getCurrentUserInfo(): Promise<IThirdAppUserInfo | null> {
    if (!this.currentUserId) {
      return Promise.resolve(null);
    }

    // @ts-expect-error Telegram global 对象
    const user = global.users.byId.get(this.currentUserId);

    return Promise.resolve({
      id: this.currentUserId,
      nickname: user?.firstName || "",
      avatar: user?.photo?.url || "",
      isGroup: false,
    });
  }

  /**
   * 🔑 实现策略方法：获取聊天对象信息
   */
  getCurrentChatUserInfo(userId: string): IThirdAppUserInfo | null {
    if (!userId) {
      return null;
    }

    // @ts-expect-error Telegram global 对象
    const user = global.users.byId.get(userId);

    if (!user) {
      return null;
    }

    return {
      id: userId,
      nickname: user.firstName || "",
      avatar: user.photo?.url || "",
      isGroup: this.isGroup(userId),
    };
  }

  /**
   * 🔑 实现策略方法：判断是否为群组
   */
  isGroup(userId: string): boolean {
    return userId.startsWith("-");  // Telegram 群组 ID 以 "-" 开头
  }

  /**
   * 设置主题
   */
  async setTheme() {
    const theme = userStore.globalSetting.theme;
    // @ts-expect-error Telegram API
    await global.setTheme(theme === "dark" ? "dark" : "light");
  }
}

export const telegramSDK = new TelegramSDK();
```

#### 6.3.4 WhatsApp 实现

**引擎层** (`packages/gc-engine/src/apps/whatsapp/whatsapp.ts`):

```typescript
import { AbstractAppEngine } from "../engine/AbstractAppEngine";
import { whatsappSDK } from "./sdk";
import { ESDKEventType } from "../engine/sdk/SDKEvent";

class Whatsapp extends AbstractAppEngine {
  // 🔑 注入 WhatsApp SDK
  appSDK = whatsappSDK;

  /**
   * 🔑 实现抽象方法：监听聊天切换
   * 使用 SDK 事件驱动（不同于 Telegram 的 URL 轮询）
   */
  listenerCurrentChatUserChange() {
    this.appSDK.emitter.on(
      ESDKEventType.changeCurrentChatUser,
      ({ payload }) => {
        this.handleChangeCurrentChatUser(payload.user);
      }
    );
  }
}

export const whatsapp = new Whatsapp();
```

**对比**：

| 平台 | 监听方式 | 代码行数 |
|------|----------|---------|
| Telegram | URL 轮询（`hkHistory.name` 事件） | ~20 行 |
| WhatsApp | SDK 事件（`changeCurrentChatUser`） | ~10 行 |

**抽象的价值**：虽然实现方式不同，但对外接口统一，上层代码无需关心差异。

### 6.4 GCEngine 路由

**代码** (`packages/gc-engine/src/GCEngine.ts`):

```typescript
import { telegram } from "./apps/telegram/telegram";
import { whatsapp } from "./apps/whatsapp/whatsapp";
import { instagram } from "./apps/instagram/instagram";
// ... 其他平台

class GCEngine implements AbstractLifeCycle {
  async mount() {
    await initThirdApp();

    const currentWebviewId = getCurrentWebviewId();
    const app = appStore.appList[currentWebviewId];

    if (isEmpty(app)) return;

    await this.excApp(app.platform);
  }

  /**
   * 🔑 路由分发：根据平台选择引擎
   */
  async excApp(platform: EPlatform) {
    switch (platform) {
      case EPlatform.Telegram:
        await telegram.mount();
        break;
      case EPlatform.Whatsapp:
        await whatsapp.mount();
        break;
      case EPlatform.Instagram:
        await instagram.mount();
        break;
      case EPlatform.Messenger:
        await messenger.mount();
        break;
      case EPlatform.Facebook:
        await facebook.mount();
        break;
      case EPlatform.Tiktok:
        await tiktok.mount();
        break;
      case EPlatform.Linkedin:
        await linkedin.mount();
        break;
      case EPlatform.Teams:
        await teams.mount();
        break;
      default:
        console.warn(`Unknown platform: ${platform}`);
    }
  }

  destroy() {
    // 销毁当前平台引擎
  }
}

export const gcEngine = new GCEngine();
```

### 6.5 设计亮点与陷阱

#### ✅ 设计亮点

1. **模板方法定义流程**：
   ```typescript
   // ✅ 流程固定，扩展点明确
   async mount() {
     hkHistory();              // 通用逻辑
     this.appSDK.mount();      // 策略调用
     await this.initAppSetting();  // 钩子方法
     this.listenerCurrentChatUserChange();  // 抽象方法
   }
   ```

2. **策略模式封装差异**：
   ```typescript
   // ✅ 平台差异封装在 SDK 中
   abstract class AbstractAppSDK {
     abstract get currentUserId(): string | null;
     abstract getCurrentUserInfo(): Promise<...>;
   }
   ```

3. **单一职责**：
   - **Engine**：生命周期管理、通用逻辑
   - **SDK**：平台特定数据获取

#### ⚠️ 常见陷阱

1. **Switch-Case 违反开闭原则**：
   ```typescript
   // ❌ 当前实现：新增平台需修改 GCEngine
   async excApp(platform: EPlatform) {
     switch (platform) {
       case EPlatform.Telegram: ...
       case EPlatform.Whatsapp: ...
     }
   }

   // ✅ 改进：使用策略映射表
   const platformEngines = {
     [EPlatform.Telegram]: telegram,
     [EPlatform.Whatsapp]: whatsapp,
   };

   async excApp(platform: EPlatform) {
     const engine = platformEngines[platform];
     if (engine) {
       await engine.mount();
     }
   }
   ```

2. **抽象类职责过重**：
   ```typescript
   // ❌ AbstractAppEngine 有 175 行
   // 建议拆分为多个 Mixin

   class AbstractAppEngine
     extends AbstractLifeCycle
     with LoginStatusMixin,
          ChatUserMixin,
          SettingsMixin {
     // ...
   }
   ```

3. **全局单例耦合**：
   ```typescript
   // ❌ 直接依赖全局 appStore
   protected handleChangeCurrentChatUser(userInfo) {
     appStore.updateCurrentChatUserByAppId(...);
   }

   // ✅ 依赖注入
   constructor(private store: AppStore) {}
   ```

### 6.6 扩展新平台指南

**步骤 1：创建 SDK**

```typescript
// packages/gc-engine/src/apps/newplatform/sdk/newPlatformSDK.ts
class NewPlatformSDK extends AbstractAppSDK {
  get currentUserId() {
    // 实现获取当前用户 ID
  }

  get currentChatUserId() {
    // 实现获取聊天 ID
  }

  // ... 实现其他抽象方法
}

export const newPlatformSDK = new NewPlatformSDK();
```

**步骤 2：创建 Engine**

```typescript
// packages/gc-engine/src/apps/newplatform/newplatform.ts
class NewPlatform extends AbstractAppEngine {
  appSDK = newPlatformSDK;

  listenerCurrentChatUserChange() {
    // 根据平台特性选择监听方式
    // 方式 1：URL 轮询（如 Telegram）
    window.addEventListener(hkHistory.name, () => { ... });

    // 方式 2：SDK 事件（如 WhatsApp）
    this.appSDK.emitter.on(ESDKEventType.changeCurrentChatUser, () => { ... });
  }
}

export const newPlatform = new NewPlatform();
```

**步骤 3：注册到 GCEngine**

```typescript
// packages/gc-engine/src/GCEngine.ts
import { newPlatform } from "./apps/newplatform/newplatform";

async excApp(platform: EPlatform) {
  switch (platform) {
    // ...
    case EPlatform.NewPlatform:
      await newPlatform.mount();
      break;
  }
}
```

**步骤 4：添加平台枚举**

```typescript
// packages/model/src/enums/EPlatform.ts
export enum EPlatform {
  // ...
  NewPlatform = "newplatform",
}
```

---

## 总结

### 技术难度排名

| 技术 | 难度 | 独创性 | 可复用性 |
|------|------|--------|---------|
| **WhatsApp Webpack 劫持** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **WebView 多进程同步** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **AOP History 劫持** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **三层 Store 架构** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **抽象引擎架构** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **InjectJS 时机控制** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

### 核心设计原则

1. **单一职责**：每层 Store 职责明确
2. **开闭原则**：通过抽象类和策略模式扩展新平台
3. **依赖倒置**：依赖抽象接口而非具体实现
4. **组合优于继承**：AOP、Mixin、策略模式

### 最佳实践

1. **持久化**：只有主 Renderer 写入磁盘
2. **通信**：类型安全的消息协议
3. **劫持**：AOP 在原生 API 层面拦截
4. **抽象**：模板方法 + 策略模式
5. **注入**：IIFE 格式 + 同步执行

### 维护建议

1. **定期测试**：每周检查第三方平台版本
2. **错误监控**：Sentry 上报模块加载失败
3. **文档更新**：记录模块名变化历史
4. **代码审查**：避免破坏抽象层
5. **性能优化**：使用 Immer 替代 lodash clone

---

**附录**：

- [架构复刻指南](./architecture-replication-guide.md)
- [CLAUDE.md 项目说明](../CLAUDE.md)
- [Tauri 官方文档](https://tauri.app/)
- [Zustand 官方文档](https://zustand-demo.pmnd.rs/)
