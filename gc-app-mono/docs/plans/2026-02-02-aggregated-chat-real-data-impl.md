# 聚合聊天接入真实数据 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将聚合聊天模块从 Mock 数据切换到真实的 GraphQL 后端数据

**Architecture:** 新建 `realChatService` 实现 `ChatService` 接口，调用现有 GraphQL API（GetAccounts/GetChatMessages）和新建的 GetConversations API。通过 `syncStore` 实现 5 秒间隔轮询。

**Tech Stack:** TypeScript, Zustand, GraphQL, React

---

## Task 1: 新建 GetConversations GraphQL 查询

**Files:**
- Create: `packages/api/src/gql/query/GetConversations.graphql`
- Modify: `packages/api/src/gql/index.ts:13` (添加 export)

**Step 1: 创建 GraphQL 查询文件**

```graphql
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

**Step 2: 在 gql/index.ts 添加导出**

在 `packages/api/src/gql/index.ts` 的 query 区块添加：

```typescript
export { GetConversations } from "./query/GetConversations.graphql";
```

**Step 3: Commit**

```bash
git add packages/api/src/gql/query/GetConversations.graphql packages/api/src/gql/index.ts
git commit -m "feat(api): 添加 GetConversations GraphQL 查询"
```

---

## Task 2: 新建 apiGetConversations API 函数

**Files:**
- Create: `packages/api/src/api/apiGetConversations.ts`
- Modify: `packages/api/src/api/index.ts` (添加 export)

**Step 1: 创建 API 函数**

```typescript
import { gqlClient } from "../apiClient.ts";
import { GetConversations } from "../gql/index.ts";

export interface ApiConversation {
  id: string;
  accountId: string;
  contactId: string;
  contactNickname: string;
  contactAvatar?: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageTime: number;
  unreadCount: number;
  version: number;
  updatedAt: number;
}

interface GetConversationsParams {
  accountId?: string;
  updatedAfter?: number;
}

interface ResponseData {
  getConversations: ApiConversation[];
}

export const apiGetConversations = async (
  params: GetConversationsParams = {},
): Promise<ApiConversation[]> => {
  const res = await gqlClient<ResponseData>(
    {
      query: GetConversations,
      variables: params,
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.getConversations;
};
```

**Step 2: 在 api/index.ts 添加导出**

在 `packages/api/src/api/index.ts` 添加：

```typescript
export * from "./apiGetConversations.ts";
```

**Step 3: Commit**

```bash
git add packages/api/src/api/apiGetConversations.ts packages/api/src/api/index.ts
git commit -m "feat(api): 添加 apiGetConversations 函数"
```

---

## Task 3: 重写 apiGetAccounts 调用真实 GraphQL

**Files:**
- Modify: `packages/api/src/api/apiGetAccounts.ts`

**Step 1: 重写为真实 GraphQL 调用**

```typescript
import { gqlClient } from "../apiClient.ts";
import { GetAccounts } from "../gql/index.ts";

export interface ApiAccount {
  id: string;
  platform: string;
  userId: string;
  nickname: string;
  avatar?: string;
  version: number;
  updatedAt: number;
}

interface ResponseData {
  getAccounts: ApiAccount[];
}

export const apiGetAccounts = async (): Promise<ApiAccount[]> => {
  const res = await gqlClient<ResponseData>(
    {
      query: GetAccounts,
      variables: {},
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.getAccounts;
};
```

**Step 2: Commit**

```bash
git add packages/api/src/api/apiGetAccounts.ts
git commit -m "feat(api): 重写 apiGetAccounts 调用真实 GraphQL"
```

---

## Task 4: 重写 apiGetChatMessages 调用真实 GraphQL

**Files:**
- Modify: `packages/api/src/api/apiGetChatMessages.ts`

**Step 1: 重写为真实 GraphQL 调用**

```typescript
import { gqlClient } from "../apiClient.ts";
import { GetChatMessages } from "../gql/index.ts";

export interface ApiChatMessage {
  id: string;
  accountId: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: number;
  messageType: string;
  version: number;
  updatedAt: number;
}

export interface GetChatMessagesParams {
  accountId: string;
  limit?: number;
  offset?: number;
  startTime?: number;
  endTime?: number;
}

interface ResponseData {
  getChatMessages: ApiChatMessage[];
}

export const apiGetChatMessages = async (
  params: GetChatMessagesParams,
): Promise<ApiChatMessage[]> => {
  const res = await gqlClient<ResponseData>(
    {
      query: GetChatMessages,
      variables: params,
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.getChatMessages;
};
```

**Step 2: Commit**

```bash
git add packages/api/src/api/apiGetChatMessages.ts
git commit -m "feat(api): 重写 apiGetChatMessages 调用真实 GraphQL"
```

---

## Task 5: 重写 apiSendMessage 调用真实 GraphQL

**Files:**
- Modify: `packages/api/src/api/apiSendMessage.ts`

**Step 1: 重写为真实 GraphQL 调用（带 TODO 标记）**

```typescript
import { gqlClient } from "../apiClient.ts";
import { SendMessage } from "../gql/index.ts";

export interface SendMessageInput {
  content: string;
  senderId: string;
  receiverId: string;
}

export interface ApiSentMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
}

interface ResponseData {
  sendMessage: ApiSentMessage;
}

export const apiSendMessage = async (
  input: SendMessageInput,
): Promise<ApiSentMessage> => {
  // TODO: 确认后端 SendMessage API 是否可用
  // 如果后端 API 未就绪，此处会抛出错误
  const res = await gqlClient<ResponseData>(
    {
      query: SendMessage,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.sendMessage;
};
```

**Step 2: Commit**

```bash
git add packages/api/src/api/apiSendMessage.ts
git commit -m "feat(api): 重写 apiSendMessage 调用真实 GraphQL (TODO: 待后端确认)"
```

---

## Task 6: 新建 apiDataAdapter 数据转换层

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/adapters/apiDataAdapter.ts`

**Step 1: 创建数据转换器**

```typescript
import type { Account, Conversation, Contact, Message } from "../types";
import { MessageStatus, MessageDirection } from "../types";
import { EPlatform } from "@gc/model";
import type {
  ApiAccount,
  ApiConversation,
  ApiChatMessage,
} from "@gc/api";

// 平台字符串到枚举的映射
const PLATFORM_MAP: Record<string, EPlatform> = {
  telegram: EPlatform.Telegram,
  whatsapp: EPlatform.Whatsapp,
  instagram: EPlatform.Instagram,
  messenger: EPlatform.Messenger,
  facebook: EPlatform.Facebook,
  tiktok: EPlatform.Tiktok,
  linkedin: EPlatform.Linkedin,
  teams: EPlatform.Teams,
  line: EPlatform.Line,
  zalo: EPlatform.Zalo,
};

/**
 * 将 API 账号数据转换为聚合聊天账号模型
 */
export function transformAccount(raw: ApiAccount): Account {
  return {
    id: raw.id,
    name: raw.nickname || raw.userId,
    platform: PLATFORM_MAP[raw.platform.toLowerCase()] || EPlatform.Telegram,
    avatar: raw.avatar,
    isActive: true,
  };
}

/**
 * 将 API 会话数据转换为聚合聊天会话模型
 */
export function transformConversation(raw: ApiConversation): Conversation {
  const contact: Contact = {
    id: raw.contactId,
    name: raw.contactNickname || raw.contactId,
    avatar: raw.contactAvatar,
    isGroup: raw.isGroup,
  };

  return {
    id: raw.id,
    accountId: raw.accountId,
    contact,
    lastMessage: raw.lastMessage,
    lastActivityAt: raw.lastMessageTime,
    unreadCount: raw.unreadCount,
  };
}

/**
 * 将 API 消息数据转换为聚合聊天消息模型
 * @param raw API 消息数据
 * @param accountUserId 当前账号的 userId，用于判断消息方向
 */
export function transformMessage(
  raw: ApiChatMessage,
  accountUserId?: string,
): Message {
  // 判断消息方向：如果 senderId 等于当前账号的 userId，则为发出的消息
  const direction =
    accountUserId && raw.senderId === accountUserId
      ? MessageDirection.Outgoing
      : MessageDirection.Incoming;

  return {
    id: raw.id,
    conversationId: raw.chatId,
    senderId: raw.senderId,
    content: raw.content,
    timestamp: raw.timestamp,
    status: MessageStatus.Delivered,
    direction,
  };
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/adapters/apiDataAdapter.ts
git commit -m "feat(aggregated-chat): 添加 apiDataAdapter 数据转换层"
```

---

## Task 7: 新建 realChatService 实现

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/services/realChatService.ts`

**Step 1: 创建真实服务实现**

```typescript
import type { ChatService, Message } from "../types";
import { MessageStatus, MessageDirection } from "../types";
import {
  apiGetAccounts,
  apiGetConversations,
  apiGetChatMessages,
  apiSendMessage,
} from "@gc/api";
import {
  transformAccount,
  transformConversation,
  transformMessage,
} from "../adapters/apiDataAdapter";

export const realChatService: ChatService = {
  async getAccounts() {
    try {
      const data = await apiGetAccounts();
      return data.map(transformAccount);
    } catch (error) {
      console.error("[RealChatService] getAccounts failed:", error);
      return [];
    }
  },

  async getConversations(params) {
    try {
      const data = await apiGetConversations({
        accountId: params.accountId,
        updatedAfter: params.updatedAfter,
      });

      // 按 lastActivityAt 降序排序
      const conversations = data
        .map(transformConversation)
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);

      // 分页处理
      const offset = params.offset || 0;
      const limit = params.limit || 50;
      const paged = conversations.slice(offset, offset + limit);

      return {
        conversations: paged,
        total: conversations.length,
        hasMore: offset + limit < conversations.length,
      };
    } catch (error) {
      console.error("[RealChatService] getConversations failed:", error);
      return { conversations: [], total: 0, hasMore: false };
    }
  },

  async getMessages(params) {
    try {
      // 需要先获取当前会话对应的 accountId
      // 这里假设 conversationId 的格式能够提取 accountId
      // 或者通过其他方式获取
      const data = await apiGetChatMessages({
        accountId: params.conversationId.split("_")[0] || "",
        limit: params.limit || 20,
        endTime: params.beforeTimestamp,
      });

      // 过滤出属于当前会话的消息
      const filtered = data.filter((m) => m.chatId === params.conversationId);
      const messages = filtered.map((m) => transformMessage(m));

      // 按时间排序（新的在后）
      messages.sort((a, b) => a.timestamp - b.timestamp);

      return {
        messages,
        hasMore: filtered.length >= (params.limit || 20),
      };
    } catch (error) {
      console.error("[RealChatService] getMessages failed:", error);
      return { messages: [], hasMore: false };
    }
  },

  async sendMessage(params) {
    try {
      // TODO: 需要根据 conversationId 获取 senderId 和 receiverId
      // 这里暂时使用简化的实现
      const data = await apiSendMessage({
        content: params.content,
        senderId: "current_user", // TODO: 从 store 获取当前用户
        receiverId: params.conversationId,
      });

      const message: Message = {
        id: data.id,
        conversationId: params.conversationId,
        senderId: data.senderId,
        content: data.content,
        timestamp: data.timestamp,
        status: MessageStatus.Sent,
        direction: MessageDirection.Outgoing,
      };

      return message;
    } catch (error) {
      console.error("[RealChatService] sendMessage failed:", error);
      throw error;
    }
  },
};
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/services/realChatService.ts
git commit -m "feat(aggregated-chat): 添加 realChatService 实现"
```

---

## Task 8: 修改服务切换逻辑

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts`

**Step 1: 切换到真实服务**

```typescript
import type { ChatService } from "../types";
import { mockChatService } from "./mockChatService";
import { realChatService } from "./realChatService";

// 通过环境变量控制是否使用 Mock
// 开发时可设置 VITE_USE_MOCK=true 使用 Mock 数据
const USE_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true";

export const chatService: ChatService = USE_MOCK
  ? mockChatService
  : realChatService;

export { mockChatService };
export { realChatService };
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts
git commit -m "feat(aggregated-chat): 切换服务层到 realChatService"
```

---

## Task 9: 扩展 ChatService 接口支持增量查询

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/types/index.ts`

**Step 1: 在 getConversations 参数中添加 updatedAfter**

在 `ChatService` 接口的 `getConversations` 方法参数中添加 `updatedAfter` 字段：

```typescript
// 找到 ChatService 接口，修改 getConversations 方法签名
export interface ChatService {
  getAccounts(): Promise<Account[]>;

  getConversations(params: {
    accountId?: string;
    limit?: number;
    offset?: number;
    updatedAfter?: number; // 新增：增量查询时间戳
  }): Promise<{
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
  }>;

  getMessages(params: {
    conversationId: string;
    limit?: number;
    beforeTimestamp?: number;
  }): Promise<{
    messages: Message[];
    hasMore: boolean;
  }>;

  sendMessage(params: {
    conversationId: string;
    content: string;
  }): Promise<Message>;
}
```

**Step 2: 同步更新 mockChatService**

在 `mockChatService.ts` 的 `getConversations` 方法中支持 `updatedAfter` 参数（虽然 mock 可以忽略此参数）：

```typescript
async getConversations(params) {
  await delay(MOCK_DELAY);
  let filtered = [...mockConversations];

  // 按账号筛选
  if (params.accountId) {
    filtered = filtered.filter((c) => c.accountId === params.accountId);
  }

  // 增量查询（mock 实现可以简单返回全部，或基于 lastActivityAt 过滤）
  if (params.updatedAfter) {
    filtered = filtered.filter((c) => c.lastActivityAt > params.updatedAfter!);
  }

  // ... 其余代码不变
},
```

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/types/index.ts apps/global-chat-desktop/src/modules/aggregated-chat/services/mockChatService.ts
git commit -m "feat(aggregated-chat): 扩展 ChatService 接口支持增量查询"
```

---

## Task 10: 重构 syncStore 实现简化轮询

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/store/syncStore.ts`

**Step 1: 重写 syncStore 使用新的 chatService**

```typescript
import { create } from "zustand";
import { chatService } from "../services";
import { useChatStore } from "./chatStore";

interface SyncState {
  // 状态
  isPolling: boolean;
  lastSyncAt: number | null;
  pollInterval: number;
  error: string | null;
  errorCount: number;

  // Actions
  initialLoad: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  poll: () => Promise<void>;
  resetError: () => void;
}

let pollingTimer: ReturnType<typeof setTimeout> | null = null;

export const useSyncStore = create<SyncState>((set, get) => ({
  isPolling: false,
  lastSyncAt: null,
  pollInterval: 5000, // 5秒轮询间隔
  error: null,
  errorCount: 0,

  // 初始化加载（全量）
  async initialLoad() {
    try {
      set({ error: null });

      // 1. 加载账号
      const accounts = await chatService.getAccounts();
      useChatStore.getState().setAccounts?.(accounts) ??
        useChatStore.setState({ accounts });

      // 2. 加载会话列表
      const { conversations } = await chatService.getConversations({});
      useChatStore.setState({ conversations });

      // 3. 记录同步时间
      set({ lastSyncAt: Date.now(), errorCount: 0 });

      console.log("[SyncStore] Initial load complete:", {
        accounts: accounts.length,
        conversations: conversations.length,
      });
    } catch (error) {
      console.error("[SyncStore] Initial load failed:", error);
      set({
        error: error instanceof Error ? error.message : "初始加载失败",
      });
    }
  },

  // 轮询一次（增量）
  async poll() {
    const { lastSyncAt, errorCount } = get();

    try {
      // 获取增量数据
      const { conversations } = await chatService.getConversations({
        updatedAfter: lastSyncAt || undefined,
      });

      if (conversations.length > 0) {
        // 合并新数据
        const currentConversations = useChatStore.getState().conversations;
        const conversationsMap = new Map(
          currentConversations.map((c) => [c.id, c]),
        );

        // 更新或新增会话
        conversations.forEach((conv) => {
          conversationsMap.set(conv.id, conv);
        });

        // 按最后活动时间排序
        const merged = Array.from(conversationsMap.values()).sort(
          (a, b) => b.lastActivityAt - a.lastActivityAt,
        );

        useChatStore.setState({ conversations: merged });
      }

      set({ lastSyncAt: Date.now(), error: null, errorCount: 0 });
    } catch (error) {
      console.error("[SyncStore] Poll failed:", error);
      const newErrorCount = errorCount + 1;
      set({
        error: error instanceof Error ? error.message : "同步失败",
        errorCount: newErrorCount,
      });

      // 连续失败 3 次，增加轮询间隔（退避策略）
      if (newErrorCount >= 3) {
        const newInterval = Math.min(get().pollInterval * 2, 30000);
        set({ pollInterval: newInterval });
        console.warn(
          `[SyncStore] Multiple failures, increasing poll interval to ${newInterval}ms`,
        );
      }
    }
  },

  // 启动轮询
  startPolling() {
    if (get().isPolling) {
      console.warn("[SyncStore] Polling already running");
      return;
    }

    set({ isPolling: true, error: null });
    console.log("[SyncStore] Polling started");

    const runPoll = async () => {
      if (!get().isPolling) return;

      await get().poll();

      if (get().isPolling) {
        pollingTimer = setTimeout(runPoll, get().pollInterval);
      }
    };

    // 首次轮询延迟执行，给初始加载一些时间
    pollingTimer = setTimeout(runPoll, get().pollInterval);
  },

  // 停止轮询
  stopPolling() {
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }
    set({ isPolling: false });
    console.log("[SyncStore] Polling stopped");
  },

  // 重置错误状态
  resetError() {
    set({ error: null, errorCount: 0, pollInterval: 5000 });
  },
}));
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/store/syncStore.ts
git commit -m "refactor(aggregated-chat): 重构 syncStore 实现简化轮询"
```

---

## Task 11: 在聚合聊天入口启动数据加载和轮询

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/index.tsx` 或主要入口组件

**Step 1: 查找并修改入口组件**

首先查找聚合聊天的入口组件，通常是 `index.tsx` 或 `AggregatedChatPage.tsx`。

添加 `useEffect` 在组件挂载时启动数据加载和轮询：

```typescript
import { useEffect } from "react";
import { useSyncStore } from "./store/syncStore";
import { useChatStore } from "./store/chatStore";

// 在组件内部添加：
const { initialLoad, startPolling, stopPolling } = useSyncStore();
const { loadAccounts, loadConversations } = useChatStore();

useEffect(() => {
  // 初始加载
  initialLoad().then(() => {
    // 加载完成后启动轮询
    startPolling();
  });

  // 组件卸载时停止轮询
  return () => {
    stopPolling();
  };
}, []);
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/
git commit -m "feat(aggregated-chat): 在入口组件启动数据加载和轮询"
```

---

## Task 12: 验证与测试

**Step 1: 启动开发环境**

```bash
cd apps/global-chat-desktop && task dev:all
```

**Step 2: 检查控制台日志**

观察控制台是否有以下日志：
- `[SyncStore] Initial load complete: { accounts: X, conversations: Y }`
- `[SyncStore] Polling started`
- 每 5 秒一次的轮询日志

**Step 3: 检查网络请求**

在 DevTools Network 面板观察：
- `/graphql` 请求是否正常发出
- 请求体是否包含 `GetAccounts`、`GetConversations` 等操作

**Step 4: 处理后端 API 缺失情况**

如果后端 `GetConversations` API 尚未实现：
1. 控制台会显示错误日志
2. UI 会显示空数据
3. 可临时设置 `VITE_USE_MOCK=true` 使用 Mock 数据

**Step 5: 最终 Commit**

```bash
git add .
git commit -m "feat(aggregated-chat): 完成真实数据接入"
```

---

## 后端 TODO（非本计划范围）

| 任务 | 说明 | 优先级 |
|------|------|--------|
| 实现 GetConversations | 返回会话列表，支持 accountId 和 updatedAfter 参数 | P0 |
| 确认 SendMessage | 确认发送消息 API 可用 | P1 |

---

## 回滚方案

如果需要回滚到 Mock 数据：

1. 设置环境变量：
   ```bash
   VITE_USE_MOCK=true
   ```

2. 或直接修改 `services/index.ts`：
   ```typescript
   const USE_MOCK = true;
   ```
