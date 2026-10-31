# 聚合聊天模块架构

## 概述

聚合聊天将多个社交平台（当前仅 WhatsApp，架构支持扩展）的消息统一展示，支持跨平台消息管理、实时翻译和系统通知。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    聚合聊天 UI (React)                            │
│  ┌────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ ChatList   │ │ MessageList  │ │ RightPanel   │               │
│  │ (会话列表)  │ │ (消息面板)    │ │ (翻译/CRM)   │               │
│  └─────┬──────┘ └──────┬───────┘ └──────────────┘               │
│        └───────────────┼────────────────────────────────────────┤
│                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               Zustand Stores                                │ │
│  │  chatStore     │  syncStore    │  uiStore                   │ │
│  │  (数据)        │  (同步状态)    │  (UI 状态，持久化)          │ │
│  └────────┬───────┴───────┬───────┴────────────────────────────┘ │
│           │               │                                      │
│           ▼               ▼                                      │
│  ┌────────────────┐  ┌─────────────────────┐                    │
│  │ Notification   │  │ SyncEngine          │                    │
│  │ Service        │  │ (轮询 + cursor 增量) │                    │
│  │ (系统通知)      │  └──────────┬──────────┘                    │
│  └────────────────┘             │                                │
│                                 ▼                                │
│                    ┌─────────────────────────┐                   │
│                    │ Connection API (GraphQL) │                   │
│                    │ IMTP WhatsApp 协议        │                   │
│                    └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## 文件结构

```
src/modules/aggregated-chat/
├── AggregatedChat.tsx          # 入口组件，初始化同步和通知服务
├── components/                  # UI 组件
│   ├── chat/                   # 会话列表相关
│   │   ├── ChatList.tsx        # 会话列表（支持置顶分组）
│   │   ├── ChatListItem.tsx    # 单个会话项（未读 badge）
│   │   └── UnreadBadge.tsx
│   ├── conversation/           # 对话视图
│   │   └── ConversationView.tsx # 对话详情（未读分隔符）
│   ├── message/                # 消息相关
│   │   ├── MessageList.tsx     # 消息列表（虚拟滚动）
│   │   ├── MessageBubble.tsx   # 消息气泡
│   │   └── MessageInput.tsx    # 消息输入框
│   ├── sidebar/                # 侧边栏
│   │   ├── ChatSidebarHeader.tsx # 总未读数显示
│   │   └── AggregatedChatSidebar.tsx
│   ├── layout/                 # 布局
│   │   └── MainLayout.tsx      # 三栏布局
│   └── common/                 # 通用组件
│       └── SyncErrorNotification.tsx
├── store/                       # 状态管理 (Zustand)
│   ├── chatStore.ts            # 聊天数据（账号、对话、消息、联系人）
│   ├── syncStore.ts            # 同步状态（轮询控制、错误处理）
│   └── uiStore.ts              # UI 状态（选中对话、侧边栏、置顶，持久化）
├── services/                    # 服务层
│   ├── index.ts                # 服务导出
│   ├── SyncEngine.ts           # 同步引擎（Connection API 轮询）
│   ├── notificationService.ts  # 系统通知服务
│   └── realChatService.ts      # ChatService 接口实现
├── hooks/                       # 自定义 Hooks
│   ├── useNetworkStatus.ts     # 网络状态检测
│   └── useMessageListHooks.ts  # 消息行构建（日期分隔、未读分隔）
├── adapters/                    # 数据适配层
│   └── apiDataAdapter.ts       # TPCA → 内部模型转换
└── types/                       # 类型定义
    └── index.ts                # Account, Conversation, Message, Contact
```

## 三层 Store

### chatStore — 聊天数据

管理所有聊天相关数据，包含三个核心 merge 方法：

| 方法 | 数据来源 | 职责 |
|------|----------|------|
| `mergeImtpConversations` | Connection API | 合并对话列表，按 lastActivityAt 排序，检测未读清零 |
| `mergeImtpMessages` | Connection API | 合并消息，去重，检测新 incoming 消息触发通知 |
| `mergeImtpParticipants` | Connection API | 合并联系人信息，更新对话中的 contact |

**关键字段**：
- `accounts: Account[]` — 账号列表
- `conversations: Conversation[]` — 对话列表（含 unreadCount）
- `messages: Record<string, Message[]>` — 消息，按 conversationId 索引
- `contacts: Contact[]` — 联系人

### syncStore — 同步状态

控制 SyncEngine 的生命周期和轮询状态。

### uiStore — UI 状态（持久化到 localStorage）

- `selectedConversationId` — 当前选中的对话
- `pinnedConversationIds` — 置顶对话列表
- `accountFilter` — 账号筛选
- `collapsedSections` — 分组折叠状态
- `rightPanelActiveTab` — 右侧面板 tab

## SyncEngine（同步引擎）

### 数据流

```
SyncEngine.initialLoad()                    SyncEngine.poll() (每 5 秒)
        │                                           │
        ▼                                           ▼
  Connection API (GraphQL)                   Connection API + cursor
  accounts / conversations /                 增量获取新数据
  participants / messages                           │
        │                                           ▼
        ▼                                    chatStore.mergeImtp*()
  chatStore.setAccounts()                    合并 + 去重 + 通知
  chatStore.mergeImtp*()
```

### Cursor 增量机制

SyncEngine 维护三类 cursor（服务端分页游标）：

| Cursor | 作用 |
|--------|------|
| `conversationCursors` | 按 accountId 跟踪对话分页位置 |
| `participantCursors` | 按 accountId 跟踪参与者分页位置 |
| `messageCursors` | 按 conversationId 跟踪消息分页位置 |

首次加载获取全量数据，后续轮询只获取 cursor 之后的增量数据。

### 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络断开 | 保持现有数据，不清空 |
| 连续失败 | 指数退避重试（1s → 2s → 4s），3 次后停止并显示错误 |
| 账号为空 | 跳过轮询 |

## 系统通知（NotificationService）

### 触发条件

```
SyncEngine poll → mergeImtpMessages → 检测新 incoming 消息
                                           │
                                    shouldNotify() 判断
                                           │
                            ┌──────────────┼──────────────┐
                            │              │              │
                      initialLoad?    窗口前台+       无权限?
                      → 不通知       当前对话?        → 不通知
                                    → 不通知
                                           │
                                    notifyNewMessages()
                                           │
                                    5 秒合并窗口
                                           │
                                    sendNotification()
```

### 通知合并

同一对话 5 秒内收到的多条消息合并为一条通知：
- 1 条消息：显示消息内容（截断 100 字符）
- N 条消息：显示 "你有 N 条新消息"

### 通知格式

| 场景 | 标题 | 正文 |
|------|------|------|
| 单聊 1 条 | `Alice` | `hello` |
| 单聊 N 条 | `Alice` | `你有 3 条新消息` |
| 群聊 1 条 | `工作群 - Bob` | `hello` |
| 群聊 N 条 | `工作群 - Bob` | `你有 3 条新消息` |

### 通知关闭

`mergeImtpConversations` 检测到 `unreadCount` 减少（用户在其他端已读）→ 调用 `dismiss()` 取消该对话的待发通知。

## 数据模型

### Message

```typescript
interface Message {
  id: string;              // 服务端消息 ID
  conversationId: string;  // 格式: `${accountId}:${imtpConvId}`
  senderId: string;
  senderName?: string;     // 群聊显示用
  senderAvatar?: string;
  content: string;         // 文本或媒体占位符（[图片]/[视频]...）
  timestamp: number;       // 毫秒时间戳
  status: MessageStatus;   // Sending | Sent | Delivered | Read | Failed
  direction: MessageDirection; // Incoming | Outgoing
}
```

### Conversation

```typescript
interface Conversation {
  id: string;              // 格式: `${accountId}:${imtpConvId}`
  accountId: string;
  jid: string;             // WhatsApp JID
  contact: Contact;
  lastMessage?: string;
  lastActivityAt: number;
  unreadCount: number;
}
```

## 生命周期

```
AggregatedChat 挂载 (isSignedIn)
        │
        ▼
notificationService.init()     ← 设置 visibilitychange 监听 + 请求通知权限
        │
        ▼
syncStore.initialLoad()        ← SyncEngine 全量加载
        │
        ▼
notificationService.markInitialLoadComplete()  ← 启用通知
        │
        ▼
syncStore.startPolling()       ← 启动 5 秒轮询
        │
        ▼
    （运行中：轮询 → merge → 通知）
        │
        ▼ (组件卸载)
syncStore.stopPolling()
notificationService.destroy()
```

## 测试

- **chatStore**: 26 个测试（merge 方法、搜索过滤、发送消息）
- **SyncEngine**: 23 个测试（初始加载、轮询、cursor 管理、错误处理）
- **notificationService**: 8 个测试（通知抑制、合并、群聊格式、dismiss）

运行：`cd apps/global-chat-desktop && bunx vitest run src/modules/aggregated-chat/`

## 相关文档

- [设计文档](../plans/2026-02-02-aggregated-chat-real-data-design.md)
- [同步实现计划](../plans/2026-02-03-aggregated-chat-sync-implementation.md)
- [通知系统设计](../plans/2026-03-04-notification-system-design.md)
- [IMTP WhatsApp 推送架构](../imtp-whatsapp-push-architecture.md)
