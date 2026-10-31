# Project Map - Global Chats

> 项目架构地图，用于快速理解和导航代码库
> 更新时间: 2026-01-15

---

## 🗺️ 项目全景

```
gc-app-mono/
├── apps/global-chat-desktop/    # 🖥️ Tauri 桌面应用
│   ├── src/                     # 主应用 (Port: 1420)
│   ├── src-chat/                # 聊合聊天 (Port: 1421)
│   ├── src-preload/             # InjectJS 入口
│   └── src-tauri/               # Rust 后端
│
└── packages/                    # 📦 共享包
    ├── gc-engine/               # ⭐ 核心引擎 (8 平台实现)
    ├── store/                   # 三层 Store
    ├── channel/                 # WebView 通信
    ├── api/                     # REST + GraphQL
    ├── ui/                      # shadcn/ui 组件
    └── ...                      # 其他工具包
```

---

## 📊 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Tauri Desktop App                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │  主应用     │  │  聊合聊天   │  │         第三方平台 WebViews          │  │
│  │  (src/)     │  │  (src-chat/)│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │  │
│  │  Port:1420  │  │  Port:1421  │  │  │ TG  │ │ WA  │ │ IG  │ │ ... │   │  │
│  │             │  │             │  │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘   │  │
│  │  状态源     │  │  GraphQL    │  │     │      │      │      │        │  │
│  │  持久化写入 │  │  长轮询     │  │     └──────┴──────┴──────┘        │  │
│  └──────┬──────┘  └──────┬──────┘  │              │ InjectJS            │  │
│         │                │         │              ▼                     │  │
│         │                │         │     ┌────────────────┐             │  │
│         │                │         │     │   GCEngine     │             │  │
│         │                │         │     │  (src-preload) │             │  │
│         │                │         │     └────────────────┘             │  │
│         │                │         └─────────────────────────────────────┘  │
│         │                │                        │                         │
│         ▼                ▼                        ▼                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    WebView Channel (Tauri Event API)                  │  │
│  │  requestStoreState / sendStoreState / updateSettings / ...            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Rust Backend (src-tauri)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ WebView 管理 │  │ Tauri Store  │  │ HTTP Plugin  │  │ 系统集成     │    │
│  │ create/show  │  │ settings.json│  │ 代理/请求    │  │ 通知/更新    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 依赖层级图

```
L5 ┌─────────────────────────────────────────────────────────┐
   │              global-chat-desktop (主应用)                │
   └─────────────────────────────────────────────────────────┘
                              │
L4 ┌─────────────────────────────────────────────────────────┐
   │         @gc/gc-engine          @gc/app-init             │
   └─────────────────────────────────────────────────────────┘
                              │
L3 ┌─────────────────────────────────────────────────────────┐
   │           @gc/api              @gc/webview              │
   └─────────────────────────────────────────────────────────┘
                              │
L2 ┌─────────────────────────────────────────────────────────┐
   │      @gc/adapter       @gc/channel       @gc/store      │
   └─────────────────────────────────────────────────────────┘
                              │
L1 ┌─────────────────────────────────────────────────────────┐
   │       @gc/utils         @gc/misc         @gc/i18n       │
   └─────────────────────────────────────────────────────────┘
                              │
L0 ┌─────────────────────────────────────────────────────────┐
   │     @gc/typescript-config              @gc/model        │
   └─────────────────────────────────────────────────────────┘
```

---

## 🎯 设计模式清单

| 模式 | 位置 | 用途 |
|------|------|------|
| **模板方法** | `AbstractAppEngine.mount()` | 定义平台初始化流程骨架 |
| **策略模式** | `appSDK` / `messageControl` | 注入平台特定实现 |
| **观察者模式** | `SDKEvent` / `WebviewChannel` | 事件驱动通信 |
| **代理模式** | Store Proxy 包装 | 非 React 代码访问 Zustand |
| **适配器模式** | `axiosTauriApiAdapter` | Axios → Tauri fetch |
| **AOP** | `hkHistory` | 劫持 History API |
| **单例模式** | 各平台引擎/SDK | 全局唯一实例 |
| **中间件模式** | `GCEngineMiddleware` | 重试、去重、错误归一化 |

---

## 🔧 核心模块详解

### 1. GCEngine (packages/gc-engine)

**职责**：8 个社交平台的消息获取和翻译功能

```
gc-engine/
├── src/
│   ├── GCEngine.ts                    # 入口路由分发器
│   └── apps/
│       ├── engine/
│       │   ├── AbstractAppEngine.ts   # 🔑 抽象基类 (模板方法)
│       │   ├── sdk/
│       │   │   └── AbstractAppSDK.ts  # SDK 抽象层
│       │   ├── AbstractMessagesControl.ts  # 消息控制抽象层
│       │   └── scheduler/
│       │       ├── scheduler.ts       # 翻译任务调度器
│       │       ├── translator.ts      # 翻译 API 封装
│       │       └── Task.ts            # 任务数据结构
│       │
│       ├── whatsapp/                  # WhatsApp (SDK Emitter 事件驱动)
│       ├── telegram/                  # Telegram (hkHistory 劫持)
│       ├── instagram/                 # Instagram
│       ├── messenger/                 # Messenger
│       ├── facebook/                  # Facebook
│       ├── tiktok/                    # TikTok
│       ├── linkedin/                  # LinkedIn
│       └── teams/                     # Teams
```

**平台实现差异**：

| 平台 | 事件驱动 | 数据获取 |
|------|---------|---------|
| WhatsApp | SDK Emitter | Webpack 模块劫持 |
| Telegram | hkHistory | History API 轮询 |
| 其他 | hkHistory | DOM 解析 |

### 2. Store (packages/store)

**职责**：三层状态管理，解决多 WebView 并发问题

```
store/
├── src/
│   ├── globalStore.ts         # 持久化配置 (仅主 Renderer 落盘)
│   ├── userStore.ts           # 当前用户配置 (内存态)
│   ├── appStore.ts            # 运行时状态 (完全内存态)
│   ├── messageStore.ts        # 翻译任务状态 (Proxy 模式)
│   └── helper/
│       ├── persistStorage.ts  # Tauri Store 持久化
│       └── syncLocalCachedStore.ts  # 启动同步
```

**数据流**：
```
启动: Tauri Store → globalStore → userStore → appStore
运行: WebView → appStore → syncPersistCache() → globalStore → Tauri Store
```

### 3. Channel (packages/channel)

**职责**：WebView 跨进程通信

| 消息类型 | 方向 | 用途 |
|---------|------|------|
| `requestStoreState` | 子 → 主 | 请求 store 数据 |
| `sendStoreState` | 主 → 子 | 发送 store 数据 |
| `changeAppUserInfo` | 子 → 主 | 用户登录状态变化 |
| `changeAppUnreadCount` | 子 → 主 | 未读消息数变化 |
| `updateSettings` | 主 → 子 | 设置变更广播 |

---

## 🔄 核心数据流

### 翻译流程

```
DOM 变化 → MutationObserver → translateMessageList()
    ↓
扫描消息 DOM → 创建 Task → receiveMessageQueue.push()
    ↓
scheduler.flush() → 批量合并 → apiTranslate()
    ↓
messageStore.update() → React 渲染翻译结果
```

### Store 同步流程

```
┌──────────────┐    requestStoreState    ┌──────────────┐
│  子 WebView  │ ──────────────────────► │  主 Renderer │
│              │ ◄────────────────────── │              │
└──────────────┘    sendStoreState       └──────────────┘
       │                                        │
       ▼                                        ▼
   appStore (内存态)                      Tauri Store (settings.json)
```

---

## 🚨 已知设计问题

| 问题 | 位置 | 严重程度 | 建议 |
|------|------|---------|------|
| 全局单例泛滥 (37个) | 各平台引擎/SDK | 🔴 高 | 引入依赖注入 |
| Proxy 破坏响应式 | Store Proxy 包装 | 🔴 高 | 使用 Context API |
| Switch-Case 路由 | `GCEngine.excApp()` | 🔴 高 | 策略映射表 |
| lodash clone 过度使用 | Store 更新 (13处) | 🟡 中 | 使用 Immer |
| 抽象类职责过重 | AbstractAppEngine (217行) | 🟡 中 | 拆分为 Mixin |
| Zod 版本冲突 | @gc/ui (4.x) vs 主应用 (3.x) | 🟡 中 | 统一 Zod 3.x |

### 重构优先级

1. **高**：依赖注入 → 移除 Proxy → 策略映射表
2. **中**：Immer 替代 clone → 拆分抽象类 → 统一错误处理
3. **低**：清理注释代码 → 减少类型断言 → 提取魔法数字

---

## 📁 快速导航

### 按功能查找

| 功能 | 文件路径 |
|------|---------|
| 平台路由分发 | `packages/gc-engine/src/GCEngine.ts` |
| 引擎生命周期 | `packages/gc-engine/src/apps/engine/AbstractAppEngine.ts` |
| 翻译调度 | `packages/gc-engine/src/apps/engine/scheduler/scheduler.ts` |
| 持久化配置 | `packages/store/src/globalStore.ts` |
| WebView 通信 | `packages/channel/src/webviewChannel.ts` |
| History 劫持 | `packages/misc/src/hijacker/hkHistory.ts` |
| Tauri 命令 | `apps/global-chat-desktop/src-tauri/src/gc_webview/plugin.rs` |

### 按平台查找

| 平台 | 引擎 | SDK |
|------|------|-----|
| WhatsApp | `apps/whatsapp/whatsapp.ts` | `sdk/WhatsappSDK.ts` |
| Telegram | `apps/telegram/telegram.ts` | `sdk/TelegramSDK.ts` |
| Instagram | `apps/instagram/instagram.ts` | `sdk/InstagramSDK.ts` |
| Messenger | `apps/messenger/messenger.ts` | `sdk/MessengerSDK.ts` |

---

## 🔧 开发指南

### 新增平台

1. 创建目录：`packages/gc-engine/src/apps/<platform>/`
2. 实现三个类：
   - `<platform>.ts` 继承 `AbstractAppEngine`
   - `sdk/<Platform>SDK.ts` 继承 `AbstractAppSDK`
   - `messagesControl/<Platform>MessagesControl.ts` 继承 `AbstractMessagesControl`
3. 注册到 `GCEngine.excApp()` switch-case
4. 添加枚举：`packages/model/src/data/EPlatform.ts`

### 修改翻译逻辑

1. 调度器：`packages/gc-engine/src/apps/engine/scheduler/`
2. 消息控制：`packages/gc-engine/src/apps/engine/AbstractMessagesControl.ts`
3. 任务状态：`packages/store/src/messageStore.ts`

### 修改 Store

1. 类型定义：`packages/model/src/data/I*.ts`
2. 版本迁移：`packages/store/src/helper/syncLocalCachedStore.ts`
3. 同步逻辑：`syncPersistCache()` / `persistUpdateAppList()`

---

## 📊 技术栈

### 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.9.5 | 桌面应用框架 |
| React | 19.0.0 | UI 框架 |
| TypeScript | 5.9.3 | 类型系统 |
| Zustand | 5.0.8 | 状态管理 |
| TailwindCSS | 4.1.16 | 样式框架 |

### 构建工具
| 技术 | 版本 | 用途 |
|------|------|------|
| Turborepo | 2.7.2 | Monorepo 构建 |
| Bun | 1.3.5 | 包管理器/运行时 |
| rolldown-vite | 7.2.1 | 构建工具（非标准 Vite） |

---

## 📚 相关文档

- [CLAUDE.md](./CLAUDE.md) - AI 指导文档
- [AGENTS.md](./AGENTS.md) - 开发规范

---

## 路径别名

| 别名 | 指向 |
|------|------|
| `@gc/ui` | `packages/ui/src` |
| `@gc/model` | `packages/model/src` |
| `@gc/store` | `packages/store/src` |
| `@gc/utils` | `packages/utils/src` |
| `@gc/api` | `packages/api/src` |
| `@gc/misc` | `packages/misc/src` |
| `@gc/adapter` | `packages/adapter/src` |
| `@gc/i18n` | `packages/i18n/src` |
| `@gc/webview` | `packages/webview/src` |
| `@gc/gc-engine` | `packages/gc-engine/src` |
| `@/*` | `apps/global-chat-desktop/src/*` |
