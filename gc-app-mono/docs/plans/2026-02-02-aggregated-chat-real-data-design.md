# 聚合聊天接入真实数据 - 设计文档

> 日期：2026-02-02
> 状态：待实施

## 概述

将聚合聊天模块从 Mock 数据切换到真实的 GraphQL 后端数据，实现 WhatsApp 等平台上报的所有数据在聚合聊天界面中展示。

## 决策摘要

| 决策项 | 选择 |
|--------|------|
| 数据范围 | 全量同步（账号、会话、联系人、消息） |
| 同步模式 | 轮询，固定 5 秒间隔 |
| 账号来源 | TPCA 后端（GetAccounts） |
| API 选择 | 新版独立接口（GetAccounts / GetContacts / GetChatMessages / SendMessage） |
| 会话接口 | 需后端新增 GetConversations |
| 发送消息 | 走 GraphQL 后端（SendMessage），API 未就绪则留 TODO |
| 加载策略 | 全量加载 + 增量轮询 |

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    聚合聊天 UI (React)                        │
│              chatStore / syncStore (Zustand)                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 RealChatService (新建)                       │
│  实现 ChatService 接口，调用 GraphQL API                      │
│  ├─ getAccounts()      → apiGetAccounts()                   │
│  ├─ getConversations() → apiGetConversations() [新建]        │
│  ├─ getContacts()      → apiGetContacts()                   │
│  ├─ getMessages()      → apiGetChatMessages()               │
│  └─ sendMessage()      → apiSendMessage() [TODO 或对接]      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL API 层                            │
│  GetAccounts / GetConversations / GetContacts               │
│  GetChatMessages / SendMessage                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端服务 (TPCA)                            │
└─────────────────────────────────────────────────────────────┘
```

## GraphQL API 设计

### 现有 API（可直接使用）

```graphql
# 获取账号列表
query GetAccounts {
  getAccounts {
    id
    platform
    userId
    nickname
    avatar
    version
    updatedAt
  }
}

# 获取联系人
query GetContacts($accountId: String!) {
  getContacts(accountId: $accountId) {
    id
    accountId
    contactId
    nickname
    avatar
    platform
    version
    updatedAt
  }
}

# 获取消息
query GetChatMessages(
  $accountId: String!
  $limit: Int
  $offset: Int
  $startTime: Float
  $endTime: Float
) {
  getChatMessages(
    accountId: $accountId
    limit: $limit
    offset: $offset
    startTime: $startTime
    endTime: $endTime
  ) {
    id
    accountId
    chatId
    senderId
    content
    timestamp
    messageType
    version
    updatedAt
  }
}

# 发送消息
mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    id
    content
    senderId
    receiverId
    timestamp
  }
}
```

### 需要新增的 API

```graphql
# 获取会话列表 [后端需新增]
query GetConversations($accountId: String, $updatedAfter: Float) {
  getConversations(accountId: $accountId, updatedAfter: $updatedAfter) {
    id
    accountId
    contactId
    contactNickname
    contactAvatar
    isGroup
    lastMessage
    lastMessageTime
    unreadCount
    version
    updatedAt
  }
}
```

**参数说明：**
- `accountId`：可选，不传则返回所有账号的会话
- `updatedAfter`：可选，用于增量轮询，只返回该时间戳之后更新的会话

## 服务层实现

### 文件结构

```
src/modules/aggregated-chat/services/
├── index.ts              # 切换 mock/real 服务
├── chatService.ts        # ChatService 接口定义
├── mockChatService.ts    # Mock 实现（保留用于开发）
├── realChatService.ts    # 真实实现 [新建]
└── pollingService.ts     # 轮询服务
```

### RealChatService 实现

```typescript
// realChatService.ts
import {
  apiGetAccounts,
  apiGetContacts,
  apiGetChatMessages,
  apiGetConversations,
  apiSendMessage
} from '@gc/api';
import { transformAccount, transformConversation, transformMessage } from '../adapters/apiDataAdapter';

export const realChatService: ChatService = {
  async getAccounts() {
    try {
      const data = await apiGetAccounts();
      return data.getAccounts.map(transformAccount);
    } catch (error) {
      console.error('[RealChatService] getAccounts failed:', error);
      return [];
    }
  },

  async getConversations({ accountId, updatedAfter }) {
    try {
      const data = await apiGetConversations({ accountId, updatedAfter });
      return {
        conversations: data.getConversations.map(transformConversation),
        total: data.getConversations.length,
        hasMore: false,
      };
    } catch (error) {
      console.error('[RealChatService] getConversations failed:', error);
      return { conversations: [], total: 0, hasMore: false };
    }
  },

  async getMessages({ accountId, chatId, limit, offset }) {
    try {
      const data = await apiGetChatMessages({ accountId, limit, offset });
      const filtered = chatId
        ? data.getChatMessages.filter(m => m.chatId === chatId)
        : data.getChatMessages;
      return { messages: filtered.map(transformMessage), hasMore: false };
    } catch (error) {
      console.error('[RealChatService] getMessages failed:', error);
      return { messages: [], hasMore: false };
    }
  },

  async sendMessage({ conversationId, content }) {
    // TODO: 等后端 API 就绪后对接
    const data = await apiSendMessage({ conversationId, content });
    return transformMessage(data.sendMessage);
  },
};
```

### 服务切换

```typescript
// index.ts
import { mockChatService } from './mockChatService';
import { realChatService } from './realChatService';

const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

export const chatService: ChatService = USE_MOCK
  ? mockChatService
  : realChatService;
```

## 轮询机制

### 流程图

```
应用启动 / 进入聚合聊天
        │
        ▼
┌─────────────────────────────────────┐
│  初始化加载（全量）                    │
│  1. getAccounts() → 获取所有账号      │
│  2. getConversations() → 所有会话     │
│  3. 记录 lastSyncTime = now()        │
└─────────────────────┬───────────────┘
                      │
                      ▼
┌─────────────────────────────────────┐
│  轮询循环（每 5 秒）                   │
│  1. getConversations(updatedAfter)  │
│  2. 合并到 store（新增/更新会话）      │
│  3. 更新 lastSyncTime               │
└─────────────────────────────────────┘
```

### syncStore 实现

```typescript
// store/syncStore.ts
interface SyncState {
  isPolling: boolean;
  lastSyncTime: number | null;
  pollInterval: number;
  errorCount: number;

  startPolling: () => void;
  stopPolling: () => void;
  initialLoad: () => Promise<void>;
  poll: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isPolling: false,
  lastSyncTime: null,
  pollInterval: 5000,
  errorCount: 0,

  async initialLoad() {
    const accounts = await chatService.getAccounts();
    const { conversations } = await chatService.getConversations({});

    useChatStore.getState().setAccounts(accounts);
    useChatStore.getState().setConversations(conversations);
    set({ lastSyncTime: Date.now() });
  },

  async poll() {
    try {
      const { lastSyncTime } = get();
      const { conversations } = await chatService.getConversations({
        updatedAfter: lastSyncTime,
      });

      if (conversations.length > 0) {
        useChatStore.getState().mergeConversations(conversations);
      }
      set({ lastSyncTime: Date.now(), errorCount: 0 });
    } catch (error) {
      const errorCount = get().errorCount + 1;
      set({ errorCount });

      // 连续失败 3 次，增加轮询间隔（退避策略）
      if (errorCount >= 3) {
        set({ pollInterval: Math.min(get().pollInterval * 2, 30000) });
      }
    }
  },

  startPolling() {
    set({ isPolling: true });
    const poll = async () => {
      if (!get().isPolling) return;
      await get().poll();
      setTimeout(poll, get().pollInterval);
    };
    poll();
  },

  stopPolling() {
    set({ isPolling: false });
  },
}));
```

## 数据转换层

```typescript
// adapters/apiDataAdapter.ts
import type { Account, Conversation, Contact, Message } from '../types';
import type { EPlatform } from '@gc/model';

export function transformAccount(raw: any): Account {
  return {
    id: raw.id,
    name: raw.nickname,
    platform: raw.platform as EPlatform,
    avatar: raw.avatar,
    isActive: true,
  };
}

export function transformConversation(raw: any): Conversation {
  return {
    id: raw.id,
    accountId: raw.accountId,
    contact: {
      id: raw.contactId,
      name: raw.contactNickname,
      avatar: raw.contactAvatar,
      isGroup: raw.isGroup,
    },
    lastMessage: raw.lastMessage,
    lastActivityAt: raw.lastMessageTime,
    unreadCount: raw.unreadCount,
  };
}

export function transformMessage(raw: any, accountUserId?: string): Message {
  return {
    id: raw.id,
    conversationId: raw.chatId,
    senderId: raw.senderId,
    content: raw.content,
    timestamp: raw.timestamp,
    status: 'delivered',
    direction: raw.senderId === accountUserId ? 'outgoing' : 'incoming',
  };
}
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络断开 | 轮询失败时保持现有数据，不清空 |
| 连续失败 | 3 次失败后，轮询间隔翻倍（最大 30 秒） |
| 账号为空 | UI 显示引导提示"请先登录 WhatsApp" |
| 会话为空 | UI 显示"暂无会话" |
| API 异常 | 捕获错误，返回空数据，记录日志 |

## 实施清单

### 前端任务

| 序号 | 任务 | 文件 | 优先级 |
|------|------|------|--------|
| 1 | 新建 GraphQL 查询 GetConversations | `packages/api/src/gql/query/GetConversations.graphql` | P0 |
| 2 | 新建 API 调用函数 apiGetConversations | `packages/api/src/api/apiGetConversations.ts` | P0 |
| 3 | 新建 RealChatService | `src/modules/aggregated-chat/services/realChatService.ts` | P0 |
| 4 | 新建数据转换器 | `src/modules/aggregated-chat/adapters/apiDataAdapter.ts` | P0 |
| 5 | 改造 syncStore 添加轮询逻辑 | `src/modules/aggregated-chat/store/syncStore.ts` | P0 |
| 6 | 修改服务切换逻辑 | `src/modules/aggregated-chat/services/index.ts` | P0 |
| 7 | 在聚合聊天入口启动轮询 | `src/modules/aggregated-chat/index.tsx` | P0 |

### 后端任务（TODO）

| 序号 | 任务 | 说明 | 优先级 |
|------|------|------|--------|
| 1 | 新增 GetConversations 接口 | 返回会话列表，支持 accountId 和 updatedAfter 参数 | P0 |
| 2 | 确认 SendMessage 接口可用 | 如果不可用，前端先留 TODO | P1 |

## 附录：消息加载策略

消息采用**按需加载**：
- 初始化时只加载账号和会话列表
- 用户点击某个会话时，调用 `getMessages({ accountId, chatId })` 加载该会话的消息
- 避免首次加载过多数据，提升性能
