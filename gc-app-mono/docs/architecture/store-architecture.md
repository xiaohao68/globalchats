# 三层 Store 架构

本文档详解 Global Chats 的状态管理设计。

## 架构概览

```
globalStore (持久化层 - Tauri Store)
    ↓ syncPersistCache()
userStore (配置层 - 内存)
    ↓ getAppListFromUserStore()
appStore (运行时状态层 - 完全内存)
```

## 三层职责

| 层级 | Store | 持久化 | 职责 |
|------|-------|--------|------|
| 持久化层 | globalStore | ✅ Tauri Store | 用户配置、登录状态 |
| 配置层 | userStore | ❌ 内存 | 当前用户的配置视图 |
| 运行时层 | appStore | ❌ 内存 | UI 状态、未读数、WebView 状态 |

## 单一写入者模式

### 问题

10 个 WebView 同时写入 `settings.json` 会导致文件损坏。

### 解决方案

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
                          │ Tauri Event API
                          ↓
┌─────────────────────────────────────────────────────────┐
│           子 WebViews (Telegram, WhatsApp, ...)          │
│              只能读取，不能写入磁盘                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ noopPersistStorage.setItem()                       │ │
│  │    ↓                                               │ │
│  │ // 空实现，不执行任何操作 ❌                          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 核心实现

### 持久化存储

```typescript
// packages/store/src/helper/persistStorage.ts
class PersistGlobalStorage implements StateStorage {
  async setItem(name: string, value: string) {
    await settingStorage?.set(name, JSON.parse(value));
    await settingStorage?.save();  // 原子性写入
  }
}

// 子 WebView 使用空实现
export const noopPersistStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => {},  // 什么都不做
};
```

### globalStore 配置

```typescript
// packages/store/src/globalStore.ts
export const useGlobalStore = create<Store>()(
  persist(
    (set, get) => ({ /* state */ }),
    {
      name: "globalStore",
      storage: createJSONStorage(() => {
        // 动态选择存储实现
        return isMainWebview()
          ? persistGlobalStorage
          : noopPersistStorage;
      }),
    }
  )
);
```

## 同步流程

### 启动时同步

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
```

### 运行时同步

1. 子 WebView 修改需要持久化的状态
2. 通过 Channel 发送消息给主 Renderer
3. 主 Renderer 更新 globalStore（触发持久化）
4. 主 Renderer 广播状态变更给所有 WebView

## 常见陷阱

### ❌ 子 WebView 直接写入

```typescript
// 错误：子 WebView 也尝试写入磁盘
storage: createJSONStorage(() => persistGlobalStorage)

// 正确：根据 WebView 类型选择
storage: createJSONStorage(() =>
  isMainWebview() ? persistGlobalStorage : noopPersistStorage
)
```

### ❌ 直接修改不触发持久化

```typescript
// 错误：不会保存到磁盘
appStore.appList[id].unreadCount = 5;

// 正确：调用 action 触发持久化
appStore.persistUpdateAppList([updatedApp]);
```

## 相关文档

- [架构概览](./overview.md)
- [核心技术深度解析 - 第4节](../core-technologies-deep-dive.md#4-三层-store-架构)
