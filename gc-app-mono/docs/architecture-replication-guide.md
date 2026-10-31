# Global Chats 架构复刻指南

## 目录

1. [架构概览](#架构概览)
2. [核心设计模式](#核心设计模式)
3. [技术栈选型](#技术栈选型)
4. [核心架构层级](#核心架构层级)
5. [实现步骤](#实现步骤)
6. [已知问题与优化建议](#已知问题与优化建议)

---

## 架构概览

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Tauri Desktop Application                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │   主应用 (Main Renderer)  │  │    第三方平台 WebViews (Injected)      │  │
│  │      Port: 1420           │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │  │
│  │                          │  │  │ TG  │ │ WA  │ │ IG  │ │ ... │       │  │
│  │  • React UI              │  │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘       │  │
│  │  • 三层 Store            │  │     │      │      │      │            │  │
│  │  • WebView 管理          │  │     └──────┴──────┴──────┘            │  │
│  │  • 唯一持久化写入点      │  │              │ InjectJS                │  │
│  └──────────┬───────────────┘  │              ▼                         │  │
│             │                  │     ┌────────────────┐                 │  │
│             │                  │     │   GCEngine     │                 │  │
│             │                  │     │  抽象引擎层     │                 │  │
│             │                  │     │  平台适配器     │                 │  │
│             │                  │     └────────────────┘                 │  │
│             │                  └─────────────────────────────────────────┘  │
│             │                                   │                          │
│             ▼                                   ▼                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              WebView Channel (Tauri Event API + mitt)                 │  │
│  │  • 事件总线：requestStoreState / sendStoreState / updateSettings      │  │
│  │  • 消息路由：senderId / receiverIds / payload                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Rust Backend (src-tauri)                           │
│  • WebView 生命周期管理    • Tauri Store (settings.json)                    │
│  • HTTP 代理插件          • 系统集成 (通知/更新)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 核心价值

**问题域**：桌面应用需要集成多个第三方 Web 平台，并扩展其功能（如消息拦截、翻译）

**解决方案**：
1. **WebView 隔离**：每个平台独立 WebView 进程，避免互相污染
2. **InjectJS 扩展**：通过注入 JavaScript 实现合法的浏览器扩展式功能增强
3. **统一通信层**：跨 WebView 事件总线 + 三层 Store 架构
4. **抽象引擎层**：模板方法模式统一平台生命周期，策略模式适配平台差异

---

## 核心设计模式

### 1. **模板方法模式 (Template Method)**

**位置**: `AbstractAppEngine` 和 `AbstractAppSDK`

**目的**: 定义平台初始化的骨架流程，子类实现具体细节

**实现**:

```typescript
// AbstractAppEngine.ts
abstract class AbstractAppEngine {
  abstract appSDK: AbstractAppSDK;

  async mount() {
    // 1. 劫持 History API（监听 URL 变化）
    hkHistory();

    // 2. 启动平台 SDK（登录检测、用户信息）
    this.appSDK.mount();

    // 3. 监听登录状态变化
    this.appSDK.emitter.on(ESDKEventType.changeLoginStatus, ({ payload }) => {
      this.handleLoginChange(payload.isLogin);
    });

    // 4. 初始化应用设置（获取用户信息）
    await this.initAppSetting();

    // 5. 监听聊天对象切换
    this.listenerCurrentChatUserChange();
  }

  // 模板方法：子类可重写
  abstract listenerCurrentChatUserChange(): void;

  // 钩子方法：子类可选重写
  protectedJump() {}
}

// 平台具体实现
class WhatsApp extends AbstractAppEngine {
  appSDK = whatsappSDK;

  // 重写：WhatsApp 使用 SDK 事件驱动
  listenerCurrentChatUserChange() {
    this.appSDK.emitter.on(ESDKEventType.changeCurrentChatUser, ({ payload }) => {
      this.handleChangeCurrentChatUser(payload.user);
    });
  }
}

class Telegram extends AbstractAppEngine {
  appSDK = telegramSDK;

  // 重写：Telegram 使用 History 轮询
  listenerCurrentChatUserChange() {
    window.addEventListener(hkHistory.name, () => {
      const chatUserInfo = this.appSDK.getCurrentChatUserInfo(
        this.appSDK.currentChatUserId
      );
      this.handleChangeCurrentChatUser(chatUserInfo);
    });
  }
}
```

**可复用价值**：
- 统一多平台的生命周期管理
- 新增平台只需继承基类，实现差异化方法
- 避免重复代码，保持一致性

---

### 2. **策略模式 (Strategy Pattern)**

**位置**: `AbstractAppSDK` → 平台特定 SDK

**目的**: 将平台数据获取逻辑封装为可替换的策略

**实现**:

```typescript
// AbstractAppSDK.ts
abstract class AbstractAppSDK {
  // 策略接口：子类必须实现
  abstract getCurrentChatUserInfo(userId: string): Nullable<IThirdAppUserInfo>;
  abstract getCurrentUserInfo(): Promise<Nullable<IThirdAppUserInfo>>;
  abstract get currentUserId(): Nullable<string>;
  abstract get currentChatUserId(): string;
  abstract get isChatPage(): boolean;
  abstract isGroup(userId: string): boolean;
}

// WhatsApp 策略：通过 Webpack 模块劫持获取 Store
class WhatsappSDK extends AbstractAppSDK {
  #store!: WhatsAppStore;

  mount() {
    // 劫持 Webpack moduleLoader 获取 Store
    this.#store = getWhatsAppStoreByModuleLoader();
  }

  getCurrentUserInfo() {
    return this.#store.Contact.get(this.currentUserId);
  }

  get currentUserId() {
    return this.#store.UserPrefs.getMaybeMeUser();
  }
}

// Telegram 策略：通过全局对象访问
class TelegramSDK extends AbstractAppSDK {
  get currentUserId() {
    return window.telegram.users.byId.me?.id;
  }

  getCurrentChatUserInfo(userId: string) {
    return window.telegram.users.byId[userId];
  }
}
```

**可复用价值**：
- 平台数据获取逻辑完全解耦
- 新平台添加只需实现策略接口
- 引擎层代码不受平台差异影响

---

### 3. **观察者模式 (Observer Pattern)**

**位置**: WebView 通信 + SDK 事件系统

**目的**: 跨进程通信 + 平台事件驱动

**实现**:

```typescript
// WebviewChannel.ts
class WebviewChannel {
  readonly emitter = mitt<ChannelMessageRecord>();

  async mount() {
    this.channelId = getCurrentWebviewId();
    await listen<ChannelMessage>(WebviewChannel.name, (event) => {
      if (this.#shouldNotifyMe(event.payload.senderId, event.payload.receiverIds)) {
        this.emitter.emit(event.payload.type, event.payload);
      }
    });
  }

  async sendMessage(message: ChannelMessage) {
    await emit(WebviewChannel.name, this.createMessage(message));
  }
}

// 使用示例：监听消息
webviewChannel.emitter.on(
  EChannelMessageEventType.changeAppUnreadCount,
  ({ senderId, payload }) => {
    const app = appStore.getAppById(senderId);
    app.unreadCount = payload.unreadCount;
    appStore.persistUpdateAppList([app]);
  }
);

// 使用示例：发送消息
webviewChannel.sendMessage({
  receiverIds: [MainWebviewId],
  type: EChannelMessageEventType.changeAppUnreadCount,
  payload: { unreadCount: 5 },
});
```

**可复用价值**：
- 解耦跨进程通信逻辑
- 支持 1 对 1、1 对多、广播模式
- 类型安全的消息传递

---

### 4. **代理模式 (Proxy Pattern)**

**位置**: Store 层 Proxy 包装

**目的**: 允许非 React 代码访问 Zustand Store

**实现**:

```typescript
// globalStore.ts
export const useGlobalStore = createWithEqualityFn<Store>(...);

// Proxy 包装：提供命令式 API
export const globalStore = new Proxy<Store>({} as Store, {
  get(_target, propKey, receiver) {
    return Reflect.get(useGlobalStore.getState(), propKey, receiver);
  },
});

// 非 React 代码可直接访问
const currentUser = globalStore.getCurrentSignInUserConfig();
```

**⚠️ 注意**：这是本项目的设计缺陷之一（见"已知问题"），建议使用依赖注入替代

**可复用价值**（优化后）：
- 使用依赖注入容器（InversifyJS / TSyringe）
- Store 作为服务注入到需要的类中
- 保持 Zustand 响应式设计

---

### 5. **适配器模式 (Adapter Pattern)**

**位置**: `TpcaDataAdapter` + `axiosTauriApiAdapter`

**目的**: 数据转换 + API 适配

**实现**:

```typescript
// TpcaDataAdapter.ts - GraphQL 数据转换
class TpcaDataAdapter {
  static adaptUsers(users: ChatTpcaUser[]): Account[] {
    return users.map((user) => ({
      id: user.tpcaUserKey,
      name: user.tpcaNickname || user.tpcaUserKey,
      platform: TPCA_TO_PLATFORM[user.tpca] || EPlatform.Telegram,
      isActive: true,
    }));
  }

  static adaptMessages(messages: ChatTpcaMessage[], currentUserKey: string): Message[] {
    return messages.map((msg) => ({
      id: msg.tpcaMessageKey,
      conversationId: this.makeConversationId(msg.tpcaFromUserKey, msg.tpcaToUserKey),
      content: msg.tpcaContent || "",
      senderId: msg.tpcaFromUserKey,
      timestamp: new Date(msg.tpcaTime).getTime(),
      direction: msg.tpcaFromUserKey === currentUserKey
        ? MessageDirection.Outgoing
        : MessageDirection.Incoming,
    }));
  }
}

// axiosTauriApiAdapter - Axios 到 Tauri HTTP 插件
const axiosTauriApiAdapter = {
  async request(config: AxiosRequestConfig) {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.data,
    });
    return { data: await response.json() };
  },
};
```

**可复用价值**：
- 隔离外部数据格式变化
- 统一内部数据模型
- 易于测试和维护

---

### 6. **AOP (Aspect-Oriented Programming)**

**位置**: `hkHistory` (History API 劫持)

**目的**: 无侵入式拦截 URL 变化

**实现**:

```typescript
// AOP.ts - 通用 AOP 工具
export const afterAOP = implAOP(noop, curryRight.placeholder);

// hkHistory.ts - 应用 AOP 劫持 History
export const hkHistory = () => {
  const triggerCustomEvent = () => {
    window.dispatchEvent(new CustomEvent(hkHistory.name));
  };

  const triggerPopstateAOP = afterAOP(triggerCustomEvent);

  // 劫持原生方法
  window.History.prototype.pushState = triggerPopstateAOP(
    window.History.prototype.pushState.bind(history)
  );
  window.History.prototype.replaceState = triggerPopstateAOP(
    window.History.prototype.replaceState.bind(history)
  );
};
```

**可复用价值**：
- 监控任意函数调用的前后逻辑
- 不修改原函数实现
- 适用于日志、性能监控、行为拦截

---

## 核心架构层级

### 1. **三层 Store 架构**

**设计目标**：
- ✅ 防止多 WebView 并发写入冲突
- ✅ 清晰的职责分离（配置 vs 运行态）
- ✅ 只有主 Renderer 有持久化权限

**架构图**:

```
┌─────────────────────────────────────────────────────────────┐
│                       globalStore                           │
│  职责: 全局持久化配置 (唯一写入点)                          │
│  存储: Tauri Store → settings.json                          │
│  内容:                                                      │
│    • userConfigList: 所有用户的配置                         │
│    • globalSetting: i18n / theme / proxy / fingerprint     │
│    • currentSignInUserId: 当前登录用户 ID                   │
│  权限: 仅主 Renderer 可落盘                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ syncPersistCache()
┌─────────────────────────────────────────────────────────────┐
│                        userStore                            │
│  职责: 当前用户配置 (内存态)                                │
│  同步: 通过 syncPersistCache() 同步到 globalStore           │
│  内容:                                                      │
│    • userInfo: 当前用户信息                                 │
│    • globalSetting: 全局设置副本                            │
│    • thirdAppConfigList: 第三方应用配置定义                  │
│       (包含: ID / URL / proxy / fingerprint 配置)           │
└─────────────────────────────────────────────────────────────┘
                          ↓ getAppListFromUserStore()
┌─────────────────────────────────────────────────────────────┐
│                         appStore                            │
│  职责: 运行时应用状态 (完全内存态, 不持久化)                │
│  来源: 从 userStore.thirdAppConfigList 初始化               │
│  内容:                                                      │
│    • appList: Record<appId, AppState>                       │
│       - unreadCount: 运行时未读数                           │
│       - userInfo: 当前登录用户                              │
│       - loadingStatus: 加载状态                             │
│       - currentChatUser: 当前聊天对象                       │
│    • currentAppId: 当前激活的应用                           │
│    • appMode: EAppMode (AggregatedChat / MultiProxy)       │
└─────────────────────────────────────────────────────────────┘
```

**为什么只有主 Renderer 有落盘能力？**

1. **防止 I/O 争用**：10 个 WebView 并发写文件会导致数据损坏
2. **版本一致性**：各 WebView 加载时间不同，可能读写不同版本配置
3. **职责分离**：
   - `userStore.thirdAppConfigList` = 应用的**配置定义**（静态）
   - `appStore.appList` = 应用的**运行状态**（动态）

**实现示例**:

```typescript
// globalStore.ts
export const useGlobalStore = createWithEqualityFn(
  persist<Store>(
    (setState, getState) => ({
      userConfigList: {},
      globalSetting: makeEmptyGlobalSetting(),
      currentSignInUserId: undefined,

      updateUserConfigList(userConfigList) {
        const cached = getState().userConfigList;
        userConfigList.forEach((it) => {
          cached[it.userInfo.id] = it;
        });
        setState({ userConfigList: clone(cached) });
      },

      signIn(user) {
        let config = getState().userConfigList[user.id];
        if (!config) config = makeEmptyUserConfig();
        config.userInfo = user;
        getState().updateUserConfigList([config]);
        getState().updateCurrentSignInUserId(user.id);

        // 同步到 userStore 和 appStore
        userStore.setUserStore(config);
        appStore.setAppStore(getAppListFromUserStore());
      },
    }),
    {
      name: "globalStore",
      storage: createJSONStorage(() => {
        // 只有主 Renderer 才返回真实存储
        return isMainWebview() ? persistGlobalStorage : noopPersistStorage;
      }),
    }
  )
);

// userStore.ts
export const useUserStore = createWithEqualityFn<Store>((set, get) => ({
  userInfo: makeEmptyUser(),
  globalSetting: makeEmptyGlobalSetting(),
  thirdAppConfigList: {},

  syncPersistCache() {
    const config = globalStore.getCurrentSignInUserConfig();
    if (!config) return;

    // 将当前状态同步回 globalStore
    config.userInfo = getState().userInfo;
    config.globalSetting = getState().globalSetting;
    config.thirdAppConfigList = getState().thirdAppConfigList;

    globalStore.updateUserConfigList([config]);
  },

  updateGlobalSetting(partialSetting) {
    const globalSetting = assign(getState().globalSetting, partialSetting);
    setState({ globalSetting: clone(globalSetting) });
    getState().syncPersistCache(); // 自动持久化
  },
}));

// appStore.ts
export const useAppStore = createWithEqualityFn<Store>((set, get) => ({
  appList: getAppListFromUserStore(), // 初始化
  currentAppId: undefined,
  appMode: EAppMode.AggregatedChat,

  updateAppList(appList) {
    const cached = getState().appList;
    appList.forEach((app) => {
      cached[app.id] = app;
    });
    setState({ appList: clone(cached) });
  },

  persistUpdateAppList(appList) {
    getState().updateAppList(appList);
    // 同步回 userStore（仅同步持久化字段：index、userInfo）
    userStore.updateThirdAppListFromAppStateList(appList);
  },
}));
```

**可复用价值**：
- ✅ 多进程/WebView 环境的状态同步方案
- ✅ 配置定义 vs 运行状态的清晰分离
- ✅ 单一数据源原则（SSOT）

---

### 2. **WebView 通信机制**

**设计目标**：
- 跨 WebView 进程通信
- 类型安全的消息传递
- 支持 1 对 1 / 1 对多 / 广播

**架构图**:

```
┌────────────────────────────────────────────────────────────┐
│               Tauri Event API (Backend 事件总线)            │
└────────────────────────────────────────────────────────────┘
                          ↑ emit / listen
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼──────┐  ┌──────▼──────┐  ┌─────▼───────┐
│ MainRenderer  │  │ WebView TG  │  │ WebView WA  │
│ channelId: M  │  │ channelId: T│  │ channelId: W│
└───────┬───────┘  └──────┬──────┘  └─────┬───────┘
        │                 │                │
        │        webviewChannel.emitter    │
        │        (mitt EventEmitter)       │
        └────────────────┬─────────────────┘
                         ▼
          ┌──────────────────────────────┐
          │    ChannelMessage 格式       │
          │  • senderId: string          │
          │  • receiverIds: string[]     │
          │  • type: EventType           │
          │  • payload: TypedPayload     │
          └──────────────────────────────┘
```

**实现示例**:

```typescript
// channel/src/webviewChannel.ts
export enum EChannelMessageEventType {
  requestStoreState = "requestStoreState",
  sendStoreState = "sendStoreState",
  changeAppUnreadCount = "changeAppUnreadCount",
  changeAppUserInfo = "changeAppUserInfo",
  updateSettings = "updateSettings",
  logout = "logout",
}

interface IChannelMessagePayload {
  [EChannelMessageEventType.changeAppUnreadCount]: {
    unreadCount: number;
  };
  [EChannelMessageEventType.changeAppUserInfo]: {
    userInfo: IThirdAppUserInfo;
  };
  [EChannelMessageEventType.sendStoreState]: {
    globalStore: IGlobalStore;
  };
}

export interface ChannelMessage<K extends EChannelMessageEventType> {
  senderId: string;
  receiverIds: string[]; // ["*"] 广播，或指定 WebView ID
  type: K;
  payload: IChannelMessagePayload[K];
}

export class WebviewChannel {
  channelId!: string;
  readonly emitter = mitt<ChannelMessageRecord>();

  async mount() {
    this.channelId = getCurrentWebviewId();

    // 监听来自 Tauri 的消息
    await listen<ChannelMessage>(WebviewChannel.name, (event) => {
      const { senderId, receiverIds, type } = event.payload;

      // 过滤：跳过自己发送的消息
      if (this.isSelfSender(senderId)) return;

      // 路由：检查是否需要处理
      if (this.#shouldNotifyMe(senderId, receiverIds)) {
        this.emitter.emit(type, event.payload);
      }
    });
  }

  #shouldNotifyMe(senderId: string, receiverIds: string[]) {
    return receiverIds.some((id) => id === "*" || id === this.channelId);
  }

  async sendMessage<K extends EChannelMessageEventType>(
    message: Omit<ChannelMessage<K>, "senderId">
  ) {
    await emit(WebviewChannel.name, {
      senderId: this.channelId,
      ...message,
    });
  }
}

// 使用示例：子 WebView 请求 Store
webviewChannel.sendMessage({
  receiverIds: [MainWebviewId],
  type: EChannelMessageEventType.requestStoreState,
  payload: {},
});

// 使用示例：主应用响应
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
        },
      },
    });
  }
);
```

**可复用价值**：
- ✅ 跨进程通信的标准实现
- ✅ 类型安全的消息传递
- ✅ 支持复杂路由逻辑（1 对 1 / 1 对多 / 广播）

---

### 3. **InjectJS 架构**

**设计目标**：
- 注入到第三方 WebView
- 初始化 GCEngine
- 同步 Store 状态

**架构图**:

```
┌──────────────────────────────────────────────────────────┐
│              Third-Party WebView (Isolated)               │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │          src-preload/index.ts (InjectJS)           │  │
│  │  import { gcEngine } from "@gc/gc-engine";         │  │
│  │  gcEngine.mount();                                 │  │
│  └────────────┬───────────────────────────────────────┘  │
│               │                                          │
│               ▼                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              @gc/app-init                          │  │
│  │  1. 初始化 webviewChannel                          │  │
│  │  2. 请求 Store 状态 (requestStoreState)            │  │
│  │  3. 同步到本地 Store (syncLocalCachedStore)        │  │
│  │  4. 监听通信消息                                   │  │
│  └────────────┬───────────────────────────────────────┘  │
│               │                                          │
│               ▼                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              GCEngine.excApp(platform)             │  │
│  │  根据平台路由到具体引擎:                           │  │
│  │    • telegram.mount()                              │  │
│  │    • whatsapp.mount()                              │  │
│  │    • ...                                           │  │
│  └────────────┬───────────────────────────────────────┘  │
│               │                                          │
│               ▼                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │        AbstractAppEngine.mount() 生命周期          │  │
│  │  1. hkHistory() - 劫持 History API                 │  │
│  │  2. appSDK.mount() - 启动平台 SDK                  │  │
│  │  3. 监听登录状态变化                               │  │
│  │  4. initAppSetting() - 获取用户信息                │  │
│  │  5. 监听聊天对象切换                               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**实现示例**:

```typescript
// src-preload/index.ts (极简入口)
import { gcEngine } from "@gc/gc-engine";
gcEngine.mount();

// @gc/gc-engine/src/GCEngine.ts
class GCEngine {
  async mount() {
    await initThirdApp(); // 初始化 + 同步 Store

    const currentWebviewId = getCurrentWebviewId();
    const app = appStore.appList[currentWebviewId];
    if (!app) return;

    await this.excApp(app.platform); // 路由到具体平台
  }

  async excApp(platform: EPlatform) {
    switch (platform) {
      case EPlatform.Telegram:
        await telegram.mount();
        break;
      case EPlatform.Whatsapp:
        await whatsapp.mount();
        break;
      // ...
    }
  }
}

// @gc/app-init/src/init.ts
export const initThirdApp = async () => {
  await domReady();

  // 1. 初始化 API 客户端
  initApiClient({
    getUin: () => userStore.userInfo.uin,
    getLang: () => userStore.globalSetting.i18n,
  });

  // 2. 挂载通信层
  await webviewChannel.mount();

  // 3. 同步 Store (从主应用获取)
  await syncLocalCachedStore();

  // 4. 监听全局设置变化
  globalSettingManager.mount();
};

// @gc/store/src/helper/syncLocalCachedStore.ts
export const syncLocalCachedStore = async () => {
  return new Promise((resolve) => {
    // 监听主应用返回的 Store
    webviewChannel.emitter.on(EChannelMessageEventType.sendStoreState, ({ payload }) => {
      globalStore.updateGlobalStore(payload.globalStore);
      const userConfig = globalStore.getCurrentSignInUserConfig();
      if (userConfig) {
        userStore.setUserStore(userConfig);
        appStore.setAppStore(getAppListFromUserStore());
      }
      resolve();
    });

    // 请求主应用的 Store
    webviewChannel.sendMessage({
      receiverIds: [MainWebviewId],
      type: EChannelMessageEventType.requestStoreState,
      payload: {},
    });
  });
};
```

**可复用价值**：
- ✅ 清晰的初始化流程
- ✅ 状态同步的标准实现
- ✅ 易于扩展新平台

---

## 技术栈选型

### 核心框架

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| **Tauri** | 2.x | • 桌面跨平台框架<br>• Rust 高性能后端<br>• 原生 WebView 集成<br>• 比 Electron 更轻量 |
| **React** | 19.x | • 成熟的 UI 框架<br>• 丰富的生态系统 |
| **TypeScript** | 5.9.x | • 类型安全<br>• 开发体验提升 |
| **Zustand** | 5.x | • 轻量级状态管理<br>• 无 Context 嵌套地狱<br>• 支持 middleware |
| **TailwindCSS** | 4.x | • 实用优先的 CSS 框架<br>• 开发效率高 |

### 构建工具

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| **Turborepo** | 2.x | • Monorepo 构建系统<br>• 智能缓存<br>• 并行构建 |
| **Bun** | 1.3.x | • 高性能包管理器<br>• 内置运行时<br>• 兼容 Node.js |
| **rolldown-vite** | 7.2.x | • 基于 Rolldown 的 Vite 构建工具<br>• 更快的冷启动 |

### Tauri 插件

| 插件 | 用途 |
|------|------|
| `@tauri-apps/plugin-http` | HTTP 请求（替代 fetch，支持代理） |
| `@tauri-apps/plugin-store` | 持久化存储（settings.json） |
| `@tauri-apps/plugin-dialog` | 系统对话框 |
| `@tauri-apps/plugin-notification` | 系统通知 |
| `@tauri-apps/plugin-updater` | 自动更新 |

---

## 实现步骤

### Phase 1: 基础架构搭建

**目标**: 建立 Monorepo + Tauri 项目骨架

#### 1.1 初始化 Monorepo

```bash
# 项目结构
mkdir my-app-mono && cd my-app-mono
bun init

# package.json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "bun@1.3.5",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.7.2",
    "typescript": "^5.9.3",
    "vite": "npm:rolldown-vite@7.2.1"
  }
}

# turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

#### 1.2 创建基础包

```bash
# 创建包结构
mkdir -p packages/{model,utils,misc,typescript-config}

# packages/model/package.json (数据模型)
{
  "name": "@my-app/model",
  "exports": { ".": "./src/index.ts" }
}

# packages/utils/package.json (工具函数)
{
  "name": "@my-app/utils",
  "exports": { ".": "./src/index.ts" }
}

# packages/misc/package.json (AOP/TimeSliceTask 等)
{
  "name": "@my-app/misc",
  "exports": { ".": "./src/index.ts" }
}
```

#### 1.3 创建 Tauri Desktop 应用

```bash
cd apps
bunx create-tauri-app@latest global-chat-desktop

# 选择:
# - Framework: React + TypeScript
# - Package Manager: Bun
# - Build Tool: Vite
```

#### 1.4 配置路径别名

```typescript
// apps/global-chat-desktop/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@my-app/*": ["../../packages/*/src"],
      "@/*": ["./src/*"]
    }
  }
}

// apps/global-chat-desktop/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@my-app/model": path.resolve(__dirname, "../../packages/model/src"),
      "@my-app/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@my-app/misc": path.resolve(__dirname, "../../packages/misc/src"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

### Phase 2: 实现核心架构层

#### 2.1 实现 Model 层

```typescript
// packages/model/src/platform.ts
export enum EPlatform {
  Telegram = "telegram",
  Whatsapp = "whatsapp",
  Instagram = "instagram",
  Messenger = "messenger",
  Facebook = "facebook",
}

// packages/model/src/app.ts
export interface IThirdAppConfig {
  id: string;
  platform: EPlatform;
  index: number;
  webviewOptions: {
    url: string;
    userAgent?: string;
  };
  proxy: IProxyConfig;
  fingerprint: IFingerprintConfig;
  userInfo?: IThirdAppUserInfo;
}

export interface AppState extends IThirdAppConfig {
  status: EAppStatus;
  isSelect: boolean;
  isOnline: boolean;
  loadingStatus: ELoadingStatus;
  unreadCount: number;
  currentChatUser?: IThirdAppUserInfo;
  chatUserConfigList: Record<string, IChatUserConfig>;
}

// packages/model/src/store.ts
export interface IGlobalStore {
  userConfigList: Record<string, IUserConfig>;
  globalSetting: IGlobalSetting;
  currentSignInUserId?: string;
}

export interface IUserConfig {
  userInfo: IUser;
  globalSetting: IGlobalSetting;
  thirdAppConfigList: Record<string, IThirdAppConfig>;
}
```

#### 2.2 实现 Channel 层

请参考上面"核心架构层级 → WebView 通信机制"章节的完整实现代码。

#### 2.3 实现 Store 层

请参考上面"核心架构层级 → 三层 Store 架构"章节的完整实现代码。

---

### Phase 3: 实现 GCEngine

#### 3.1 实现抽象引擎层

请参考上面"核心设计模式 → 模板方法模式"和"策略模式"章节的完整实现代码。

#### 3.2 实现具体平台引擎

```typescript
// packages/gc-engine/src/apps/telegram/sdk/index.ts
export class TelegramSDK extends AbstractAppSDK {
  mount() {
    super.mount();
    // Telegram 特定初始化逻辑
  }

  get currentUserId() {
    return window.telegram?.users?.byId?.me?.id;
  }

  get currentChatUserId() {
    // 从 URL 解析聊天 ID
    const match = window.location.pathname.match(/\/chat\/(\d+)/);
    return match ? match[1] : "";
  }

  getCurrentChatUserInfo(userId: string) {
    return window.telegram?.users?.byId?.[userId];
  }

  async getCurrentUserInfo() {
    const me = window.telegram?.users?.byId?.me;
    if (!me) return null;

    return {
      id: me.id,
      nickname: me.firstName + " " + me.lastName,
      avatar: me.photo?.url || "",
      isGroup: false,
    };
  }

  get isChatPage() {
    return window.location.pathname.startsWith("/chat/");
  }

  isGroup(userId: string) {
    return window.telegram?.chats?.byId?.[userId]?.isGroup || false;
  }
}

export const telegramSDK = new TelegramSDK();

// packages/gc-engine/src/apps/telegram/telegram.ts
export class Telegram extends AbstractAppEngine {
  appSDK = telegramSDK;

  // 重写：Telegram 使用 History 轮询监听
  listenerCurrentChatUserChange() {
    window.addEventListener(hkHistory.name, () => {
      const currentChatUserId = this.appSDK.currentChatUserId;
      const currentChatUser = appStore.getCurrentChatUserByAppId();

      if (currentChatUserId === currentChatUser?.id) return;

      const chatUserInfo = this.appSDK.getCurrentChatUserInfo(currentChatUserId);
      this.handleChangeCurrentChatUser(chatUserInfo);
    });
  }
}

export const telegram = new Telegram();
```

#### 3.3 实现 GCEngine 路由

```typescript
// packages/gc-engine/src/GCEngine.ts
import { telegram } from "./apps/telegram/telegram";
import { whatsapp } from "./apps/whatsapp/whatsapp";
import { instagram } from "./apps/instagram/instagram";
import { messenger } from "./apps/messenger/messenger";
import { facebook } from "./apps/facebook/facebook";

class GCEngine {
  async mount() {
    await initThirdApp(); // 初始化通信 + 同步 Store

    const currentWebviewId = getCurrentWebviewId();
    const app = appStore.appList[currentWebviewId];
    if (!app) return;

    await this.excApp(app.platform);
  }

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
      default:
        console.warn(`Platform ${platform} not implemented`);
    }
  }

  destroy() {}
}

export const gcEngine = new GCEngine();
```

---

### Phase 4: 实现工具层

请参考上面"核心设计模式 → AOP"章节的完整实现代码。

---

### Phase 5: 集成到主应用

#### 5.1 主应用初始化

```typescript
// packages/app-init/src/init.ts
export const initApp = async () => {
  await domReady();

  // 1. 初始化 API 客户端
  initApiClient({
    getUin: () => userStore.userInfo.uin,
    getLang: () => userStore.globalSetting.i18n,
  });

  // 2. 挂载通信层
  await webviewChannel.mount();

  // 3. 同步 Store
  await syncLocalCachedStore();

  // 4. 监听子 WebView 请求 Store
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

  // 5-7. 监听其他事件...
};

// apps/global-chat-desktop/src/main.tsx
import { initApp } from "@my-app/app-init";
import { useGlobalStore } from "@my-app/store";

async function bootstrap() {
  await initApp();

  // 恢复持久化状态
  await useGlobalStore.persist.rehydrate();

  // 渲染应用
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(<App />);
}

bootstrap();
```

#### 5.2 InjectJS 入口

```typescript
// apps/global-chat-desktop/src-preload/index.ts
import { gcEngine } from "@my-app/gc-engine";

gcEngine.mount();
```

#### 5.3 Vite 配置 Preload 构建

```typescript
// apps/global-chat-desktop/vite.preload.config.ts
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    outDir: "dist-preload",
    lib: {
      entry: path.resolve(__dirname, "src-preload/index.ts"),
      formats: ["iife"],
      name: "Preload",
      fileName: () => "preload.js",
    },
    rollupOptions: {
      external: [],
    },
  },
});
```

#### 5.4 Tauri 配置 WebView 注入

```json
// apps/global-chat-desktop/src-tauri/tauri.conf.json
{
  "tauri": {
    "windows": [
      {
        "label": "main",
        "url": "http://localhost:1420",
        "width": 1200,
        "height": 800
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'"
    }
  },
  "build": {
    "beforeDevCommand": "bun run dev:renderer && bun run dev:preload",
    "beforeBuildCommand": "bun run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  }
}
```

```rust
// apps/global-chat-desktop/src-tauri/src/lib.rs
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn create_third_app_webview(
    app: tauri::AppHandle,
    label: String,
    url: String,
) -> Result<(), String> {
    let preload_script = include_str!("../../dist-preload/preload.js");

    WebviewWindowBuilder::new(
        &app,
        label.clone(),
        WebviewUrl::External(url.parse().unwrap()),
    )
    .initialization_script(preload_script) // 注入 InjectJS
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![create_third_app_webview])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### Phase 6: WebView 管理

```typescript
// packages/webview/src/webviewManager.ts
import { invoke } from "@tauri-apps/api/core";

export class WebviewManager {
  async create(appConfig: IThirdAppConfig) {
    await invoke("create_third_app_webview", {
      label: appConfig.id,
      url: appConfig.webviewOptions.url,
    });
  }

  async reload(appId: string) {
    const webview = await WebviewWindow.getByLabel(appId);
    await webview?.close();

    const appConfig = userStore.getThirdAppConfigById(appId);
    await this.create(appConfig);
  }

  async reloadAll(filter?: (config: IThirdAppConfig) => boolean) {
    const appConfigList = Object.values(userStore.thirdAppConfigList);
    const toReload = filter ? appConfigList.filter(filter) : appConfigList;

    for (const config of toReload) {
      await this.reload(config.id);
    }
  }
}

export const webviewManager = new WebviewManager();
```

---

## 已知问题与优化建议

### 🔴 严重问题

#### 1. 全局单例泛滥

**问题**：37 个全局单例（`export const xxx = new XXX()`），难以测试、状态耦合

**建议**：引入依赖注入容器（InversifyJS 或 TSyringe）

```typescript
// ❌ 当前实现
export const telegram = new Telegram();
export const whatsapp = new Whatsapp();
export const globalStore = new Proxy<Store>(...);

// ✅ 优化建议
import { Container } from "inversify";
import "reflect-metadata";

const container = new Container();
container.bind<AbstractAppEngine>(TYPES.TelegramEngine).to(Telegram);
container.bind<AbstractAppEngine>(TYPES.WhatsappEngine).to(Whatsapp);
container.bind<IGlobalStore>(TYPES.GlobalStore).to(GlobalStore);

// 使用
const telegram = container.get<AbstractAppEngine>(TYPES.TelegramEngine);
```

#### 2. Proxy 包装破坏 Zustand 响应式

**问题**：`new Proxy(useGlobalStore.getState())` 导致非 React 代码访问不触发重渲染

**建议**：
1. 使用 Context API 或 `useStore.getState()` 显式调用
2. 或通过依赖注入将 Store 注入到需要的类中

```typescript
// ❌ 当前实现
export const globalStore = new Proxy<Store>({} as Store, {
  get(_target, propKey) {
    return Reflect.get(useGlobalStore.getState(), propKey);
  },
});

// ✅ 优化建议
// 方式1: Context API
export const StoreContext = createContext(useGlobalStore);

// 方式2: 依赖注入
class GCEngine {
  constructor(private store: IGlobalStore) {}

  mount() {
    const userConfig = this.store.getCurrentSignInUserConfig();
    // ...
  }
}

// 方式3: 显式调用
const userConfig = useGlobalStore.getState().getCurrentSignInUserConfig();
```

#### 3. Switch-Case 路由违反开闭原则

**问题**：`GCEngine.excApp()` 使用 switch-case，新增平台需修改核心代码

**建议**：使用策略映射表

```typescript
// ❌ 当前实现
async excApp(platform: EPlatform) {
  switch (platform) {
    case EPlatform.Telegram:
      await telegram.mount();
      break;
    case EPlatform.Whatsapp:
      await whatsapp.mount();
      break;
    // ...
  }
}

// ✅ 优化建议
const platformEngines: Record<EPlatform, AbstractAppEngine> = {
  [EPlatform.Telegram]: telegram,
  [EPlatform.Whatsapp]: whatsapp,
  [EPlatform.Instagram]: instagram,
  [EPlatform.Messenger]: messenger,
  [EPlatform.Facebook]: facebook,
};

async excApp(platform: EPlatform) {
  const engine = platformEngines[platform];
  if (!engine) {
    console.warn(`Platform ${platform} not implemented`);
    return;
  }
  await engine.mount();
}
```

---

### 🟡 中等问题

#### 4. 过度使用 lodash clone()

**问题**：13 处深拷贝，性能开销大

**建议**：使用 Immer 中间件

```typescript
// ❌ 当前实现
updateAppList(appList) {
  const cached = getState().appList;
  appList.forEach((app) => {
    cached[app.id] = app;
  });
  setState({ appList: clone(cached) }); // 深拷贝
}

// ✅ 优化建议
import { immer } from "zustand/middleware/immer";

export const useAppStore = createWithEqualityFn(
  immer<Store>((set) => ({
    appList: {},

    updateAppList(appList) {
      set((state) => {
        appList.forEach((app) => {
          state.appList[app.id] = app; // Immer 自动处理不可变性
        });
      });
    },
  }))
);
```

#### 5. 抽象类职责过重

**问题**：`AbstractAppEngine` 175 行，违反单一职责原则

**建议**：拆分为多个 Mixin 或组合对象

```typescript
// ❌ 当前实现
abstract class AbstractAppEngine {
  async mount() {
    hkHistory();
    this.appSDK.mount();
    this.appSDK.emitter.on(...);
    await this.initAppSetting();
    this.listenerCurrentChatUserChange();
  }

  async getCurrentUserInfo() { ... }
  updateCurrentUserInfo() { ... }
  updateCurrentUserAvatar() { ... }
  handleLoginChange() { ... }
  handleChangeCurrentChatUser() { ... }
  // ...
}

// ✅ 优化建议
// 职责1: 生命周期管理
class LifecycleManager {
  async mount(sdk: AbstractAppSDK) {
    hkHistory();
    sdk.mount();
    await this.initAppSetting();
  }
}

// 职责2: 用户信息管理
class UserInfoManager {
  async getCurrentUserInfo() { ... }
  updateCurrentUserInfo() { ... }
  updateCurrentUserAvatar() { ... }
}

// 职责3: 事件监听
class EventListenerManager {
  setupLoginListener(sdk: AbstractAppSDK) { ... }
  setupChatUserListener() { ... }
}

// 组合使用
class AbstractAppEngine {
  private lifecycle = new LifecycleManager();
  private userInfo = new UserInfoManager();
  private events = new EventListenerManager();

  async mount() {
    await this.lifecycle.mount(this.appSDK);
    this.events.setupLoginListener(this.appSDK);
    this.events.setupChatUserListener();
  }
}
```

#### 6. Zod 版本冲突

**问题**：主应用 `zod@3.25`，`@gc/ui` 使用 `zod@4.3.5`

**建议**：统一使用 Zod 3.x

```json
// package.json
{
  "resolutions": {
    "zod": "3.25.76"
  }
}
```

---

### 🟢 低优先级问题

#### 7. 清理注释代码

**问题**：代码中存在大量注释掉的代码

**建议**：删除注释代码，使用 Git 历史记录追溯

#### 8. 减少类型断言

**问题**：频繁使用 `as` 类型断言，降低类型安全

**建议**：改进类型定义，减少断言

```typescript
// ❌ 当前实现
const app = appStore.appList[appId] as AppState;

// ✅ 优化建议
getAppById(appId: string): AppState {
  const app = this.appList[appId];
  if (!app) throw new Error(`App ${appId} not found`);
  return app; // 类型安全
}
```

#### 9. 提取魔法数字

**问题**：代码中存在魔法数字（如 `1000`, `50`）

**建议**：提取为常量

```typescript
// ❌ 当前实现
await sleep(50);
setInterval(() => { ... }, 1000);

// ✅ 优化建议
const CHAT_USER_CHANGE_DEBOUNCE = 50;
const LOGIN_POLL_INTERVAL = 1000;

await sleep(CHAT_USER_CHANGE_DEBOUNCE);
setInterval(() => { ... }, LOGIN_POLL_INTERVAL);
```

---

## 总结

本架构的核心价值在于：

1. **清晰的职责分离**：
   - Store 三层架构（配置 vs 运行态）
   - 引擎抽象层（模板方法 + 策略模式）
   - 通信层（事件总线）

2. **可扩展性**：
   - 新增平台只需继承 `AbstractAppEngine` 和 `AbstractAppSDK`
   - 消息类型通过枚举管理，易于扩展

3. **多进程隔离**：
   - 每个平台独立 WebView 进程
   - 通过 Tauri Event API 跨进程通信
   - 主 Renderer 唯一持久化写入点

4. **合法的功能扩展**：
   - 通过 InjectJS 实现浏览器扩展式功能
   - AOP 无侵入式拦截

**关键改进方向**：
- ✅ 引入依赖注入（InversifyJS）
- ✅ 使用 Immer 替代 lodash clone
- ✅ 策略映射表替代 switch-case
- ✅ 拆分大类，保持单一职责

---

**文档生成日期**: 2026-01-29
**项目版本**: 1.3.0
**适用范围**: 多平台集成 + WebView 扩展类桌面应用
