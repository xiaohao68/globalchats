# 聚合聊天同步功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现聚合聊天模块作为消费客户端的消息同步功能，通过轮询方式从服务端拉取增量消息。

**Architecture:** 使用 SyncEngine 类管理全局轮询调度，维护每个账号的同步游标，将增量消息合并到 Zustand ChatStore。

**Tech Stack:** TypeScript, React, Zustand, GraphQL, TailwindCSS

---

## 前置检查

### Task 0: 确认后端接口可用

**Step 1: 检查后端 GraphQL schema**

确认后端已提供 `imtpWhatsappPollMessages` mutation。

**Step 2: 确认现有代码结构**

检查以下文件是否存在：
- `packages/api/src/api/` 目录结构
- `apps/global-chat-desktop/src/modules/aggregated-chat/store/` 目录结构
- `apps/global-chat-desktop/src/modules/aggregated-chat/services/` 目录结构

---

## Phase 1: API 层实现

### Task 1: 创建 GraphQL API 调用

**Files:**
- Create: `packages/api/src/api/imtpWhatsappPollMessages.ts`
- Modify: `packages/api/src/api/index.ts`

**Step 1: 创建 API 文件**

```typescript
// packages/api/src/api/imtpWhatsappPollMessages.ts
import { graphqlRequest } from "../graphql-client";

export interface ImtpPollMessagesInput {
  imUserId: string;
  clientCursor?: string;
  limit: number;
}

export interface ImtpMessageSender {
  id: string;
  name: string;
}

export interface ImtpMessageData {
  messageTimestamp: number;
  content: string;
  sender: ImtpMessageSender;
}

export interface ImtpMessage {
  id: string;
  keyId: string;
  keyRemoteJid: string;
  data: ImtpMessageData;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImtpPollMessagesResult {
  messages: ImtpMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function apiImtpWhatsappPollMessages(
  input: ImtpPollMessagesInput
): Promise<ImtpPollMessagesResult> {
  const query = `
    mutation ImtpWhatsappPollMessages($input: ImtpPollMessagesInput!) {
      imtpWhatsappPollMessages(input: $input) {
        messages {
          id
          keyId
          keyRemoteJid
          data {
            messageTimestamp
            content
            sender {
              id
              name
            }
          }
          version
          createdAt
          updatedAt
        }
        nextCursor
        hasMore
      }
    }
  `;

  const response = await graphqlRequest<{
    imtpWhatsappPollMessages: ImtpPollMessagesResult;
  }>(query, { input });

  return response.imtpWhatsappPollMessages;
}
```

**Step 2: 导出 API**

```typescript
// packages/api/src/api/index.ts
// 在现有导出后添加
export * from "./imtpWhatsappPollMessages";
```

**Step 3: 提交**

```bash
git add packages/api/src/api/imtpWhatsappPollMessages.ts packages/api/src/api/index.ts
git commit -m "feat(api): 添加 imtpWhatsappPollMessages GraphQL API"
```

---

## Phase 2: SyncEngine 核心实现

### Task 2: 创建 SyncEngine 类

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/services/SyncEngine.ts`

**Step 1: 创建 SyncEngine 文件**

```typescript
// apps/global-chat-desktop/src/modules/aggregated-chat/services/SyncEngine.ts
import { apiImtpWhatsappPollMessages } from "@gc/api";
import { useChatStore } from "../store/chatStore";
import { useSyncStore } from "../store/syncStore";

export class SyncEngine {
  private pollTimer: NodeJS.Timeout | null = null;
  private cursors: Map<string, string> = new Map();
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;
  private readonly POLL_INTERVAL = 5000;

  /**
   * 初始加载：获取账号和对话列表，初始化游标
   */
  async initialLoad(): Promise<void> {
    const { loadAccounts, loadConversations } = useChatStore.getState();

    try {
      // 1. 加载账号列表
      await loadAccounts();

      // 2. 加载对话列表（限制数量）
      const accounts = useChatStore.getState().accounts;
      for (const account of accounts) {
        await loadConversations(account.id);
      }

      // 3. 初始化游标为当前时间戳
      const now = Date.now().toString();
      for (const account of accounts) {
        this.cursors.set(account.id, now);
      }

      useSyncStore.getState().setLastSyncAt(Date.now());
    } catch (error) {
      console.error("[SyncEngine] Initial load failed:", error);
      throw error;
    }
  }

  /**
   * 启动轮询
   */
  startPolling(): void {
    if (this.pollTimer) {
      console.log("[SyncEngine] Polling already started");
      return;
    }

    console.log("[SyncEngine] Starting polling...");
    useSyncStore.getState().setIsPolling(true);

    // 立即执行一次
    this.poll();

    // 设置定时器
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.POLL_INTERVAL);
  }

  /**
   * 停止轮询
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      useSyncStore.getState().setIsPolling(false);
      console.log("[SyncEngine] Polling stopped");
    }
  }

  /**
   * 单次轮询：同步所有账号的增量消息
   */
  private async poll(): Promise<void> {
    const accounts = useChatStore.getState().accounts;

    if (accounts.length === 0) {
      console.log("[SyncEngine] No accounts to sync");
      return;
    }

    try {
      for (const account of accounts) {
        await this.pollAccount(account.id);
      }

      // 重置重试计数
      this.retryCount = 0;
      useSyncStore.getState().setLastSyncAt(Date.now());
      useSyncStore.getState().setError(null);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 轮询单个账号
   */
  private async pollAccount(accountId: string): Promise<void> {
    const cursor = this.cursors.get(accountId);

    const result = await apiImtpWhatsappPollMessages({
      imUserId: accountId,
      clientCursor: cursor,
      limit: 100,
    });

    if (result.messages.length > 0) {
      console.log(
        `[SyncEngine] Received ${result.messages.length} messages for account ${accountId}`
      );

      // 合并数据到 chatStore
      useChatStore.getState().mergeData({
        accountId,
        messages: result.messages,
      });

      // 更新游标
      if (result.nextCursor) {
        this.cursors.set(accountId, result.nextCursor);
      }
    }
  }

  /**
   * 错误处理：静默重试
   */
  private handleError(error: Error): void {
    this.retryCount++;
    console.error(`[SyncEngine] Poll failed (attempt ${this.retryCount}):`, error);

    if (this.retryCount <= this.MAX_RETRIES) {
      // 指数退避重试
      const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
      console.log(`[SyncEngine] Retrying in ${delay}ms...`);

      setTimeout(() => {
        this.poll();
      }, delay);
    } else {
      // 超过最大重试次数，显示错误
      useSyncStore.getState().setError("同步失败，请检查网络连接");
      console.error("[SyncEngine] Max retries exceeded, stopping polling");
    }
  }
}

// 导出单例
export const syncEngine = new SyncEngine();
```

**Step 2: 提交**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/services/SyncEngine.ts
git commit -m "feat(sync): 创建 SyncEngine 同步调度器"
```

---

### Task 3: 导出 SyncEngine

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts`

**Step 1: 修改 services/index.ts**

```typescript
// apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts
import { mockChatService } from "./mockChatService";
import { realChatService } from "./realChatService";
import { syncEngine } from "./SyncEngine";

const USE_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true";

export const chatService = USE_MOCK ? mockChatService : realChatService;

// 导出 SyncEngine
export { syncEngine } from "./SyncEngine";
export type { SyncEngine } from "./SyncEngine";
```

**Step 2: 提交**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts
git commit -m "feat(sync): 导出 SyncEngine 实例"
```

---

## Phase 3: 状态管理扩展

### Task 4: 扩展 syncStore

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/store/syncStore.ts`

**Step 1: 添加同步状态**

```typescript
// apps/global-chat-desktop/src/modules/aggregated-chat/store/syncStore.ts
import { create } from "zustand";

interface SyncState {
  // 同步状态
  isPolling: boolean;
  lastSyncAt: number | null;
  error: string | null;
  errorCount: number;

  // Actions
  setIsPolling: (isPolling: boolean) => void;
  setLastSyncAt: (timestamp: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  isPolling: false,
  lastSyncAt: null,
  error: null,
  errorCount: 0,
};

export const useSyncStore = create<SyncState>((set) => ({
  ...initialState,

  setIsPolling: (isPolling) => set({ isPolling }),

  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),

  setError: (error) =>
    set((state) => ({
      error,
      errorCount: error ? state.errorCount + 1 : 0,
    })),

  reset: () => set(initialState),
}));
```

**Step 2: 提交**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/store/syncStore.ts
git commit -m "feat(store): 扩展 syncStore 添加同步状态管理"
```

---

### Task 5: 扩展 chatStore 添加 mergeData

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/store/chatStore.ts`

**Step 1: 添加 mergeData action**

在 chatStore 中找到合适的位置添加：

```typescript
// 在 ChatState interface 中添加
interface ChatState {
  // ... 现有状态

  // 新增：合并增量数据
  mergeData: (params: {
    accountId: string;
    messages: ImtpMessage[];
  }) => void;
}

// 在 create 函数中添加实现
export const useChatStore = create<ChatState>((set, get) => ({
  // ... 现有实现

  mergeData: ({ accountId, messages }) => {
    if (messages.length === 0) return;

    set((state) => {
      const newMessages = { ...state.messages };
      const newConversations = [...state.conversations];

      for (const msg of messages) {
        const conversationId = `${accountId}:${msg.keyRemoteJid}`;

        // 1. 合并消息（按 keyId 去重）
        if (!newMessages[conversationId]) {
          newMessages[conversationId] = [];
        }

        const existingIndex = newMessages[conversationId].findIndex(
          (m) => m.id === msg.keyId
        );

        const transformedMsg: Message = {
          id: msg.keyId,
          conversationId,
          senderId: msg.data.sender.id,
          senderName: msg.data.sender.name,
          content: msg.data.content,
          timestamp: msg.data.messageTimestamp,
          status: MessageStatus.Sent,
          direction: MessageDirection.Incoming,
        };

        if (existingIndex >= 0) {
          // 更新现有消息
          newMessages[conversationId][existingIndex] = transformedMsg;
        } else {
          // 添加新消息
          newMessages[conversationId].push(transformedMsg);
          // 按时间排序
          newMessages[conversationId].sort(
            (a, b) => a.timestamp - b.timestamp
          );
        }

        // 2. 更新对话
        const conversationIndex = newConversations.findIndex(
          (c) => c.id === conversationId
        );

        if (conversationIndex >= 0) {
          // 更新现有对话
          newConversations[conversationIndex] = {
            ...newConversations[conversationIndex],
            lastMessage: msg.data.content,
            lastActivityAt: msg.data.messageTimestamp,
            unreadCount: newConversations[conversationIndex].unreadCount + 1,
          };
        } else {
          // 创建新对话
          newConversations.push({
            id: conversationId,
            accountId,
            contact: {
              id: msg.keyRemoteJid,
              name: msg.data.sender.name,
              isGroup: msg.keyRemoteJid.endsWith("@g.us"),
            },
            lastMessage: msg.data.content,
            lastActivityAt: msg.data.messageTimestamp,
            unreadCount: 1,
          });
        }
      }

      // 3. 按最后活动时间排序对话
      newConversations.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

      return {
        messages: newMessages,
        conversations: newConversations,
      };
    });
  },
}));
```

**注意**: 需要导入 `ImtpMessage` 类型，并确保 `Message` 类型兼容。

**Step 2: 提交**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/store/chatStore.ts
git commit -m "feat(store): 添加 mergeData action 用于增量消息合并"
```

---

## Phase 4: UI 集成

### Task 6: 集成生命周期到 AggregatedChat

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/AggregatedChat.tsx`

**Step 1: 修改 AggregatedChat 组件**

```typescript
// apps/global-chat-desktop/src/modules/aggregated-chat/AggregatedChat.tsx
import { useEffect } from "react";
import { syncEngine } from "./services";
import { MainLayout } from "./components/layout/MainLayout";

export function AggregatedChat() {
  useEffect(() => {
    // 组件挂载：初始加载并启动轮询
    const init = async () => {
      try {
        await syncEngine.initialLoad();
        syncEngine.startPolling();
      } catch (error) {
        console.error("[AggregatedChat] Failed to initialize sync:", error);
      }
    };

    init();

    // 组件卸载：停止轮询
    return () => {
      syncEngine.stopPolling();
    };
  }, []);

  return <MainLayout />;
}

export default AggregatedChat;
```

**Step 2: 提交**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/AggregatedChat.tsx
git commit -m "feat(ui): 在 AggregatedChat 集成同步生命周期"
```

---

### Task 7: 添加同步状态指示器

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/components/sidebar/ChatSidebarHeader.tsx`

**Step 1: 修改 ChatSidebarHeader**

```typescript
// apps/global-chat-desktop/src/modules/aggregated-chat/components/sidebar/ChatSidebarHeader.tsx
import { RefreshCw, AlertCircle } from "lucide-react";
import { useSyncStore } from "../../store/syncStore";
import { syncEngine } from "../../services";

export function ChatSidebarHeader() {
  const { isPolling, error } = useSyncStore();

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <h2 className="text-lg font-semibold">消息</h2>

      {/* 同步状态指示器 */}
      <div className="flex items-center gap-2">
        {error ? (
          <button
            onClick={() => syncEngine.startPolling()}
            className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm"
            title={error}
          >
            <AlertCircle className="w-4 h-4" />
            <span>同步失败</span>
          </button>
        ) : isPolling ? (
          <div className="flex items-center gap-1 text-green-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>同步中</span>
          </div>
        ) : null}
      </div>

      {/* ... 其他头部内容 */}
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/sidebar/ChatSidebarHeader.tsx
git commit -m "feat(ui): 添加同步状态指示器"
```

---

## Phase 5: 验证与测试

### Task 8: 类型检查

**Step 1: 运行类型检查**

```bash
cd apps/global-chat-desktop
bun run typecheck
```

**预期输出**: 无类型错误

**Step 2: 提交（如需要修复）**

```bash
git add -A
git commit -m "fix(types): 修复类型错误"
```

---

### Task 9: 功能验证

**Step 1: 启动开发服务器**

```bash
cd apps/global-chat-desktop
task dev
```

**Step 2: 验证功能**

1. 打开聚合聊天页面
2. 检查控制台输出：`[SyncEngine] Starting polling...`
3. 检查网络面板：每 5 秒有 `imtpWhatsappPollMessages` 请求
4. 检查侧边栏：显示"同步中"状态
5. 模拟断网：检查错误处理和重试逻辑

---

## 完成总结

实施完成后，聚合聊天模块将具备：

1. **自动同步**: 每 5 秒自动拉取增量消息
2. **增量合并**: 新消息自动合并到对话列表
3. **错误恢复**: 网络错误自动重试，最多 3 次
4. **状态显示**: UI 显示同步状态

---

## 回滚计划

如需回滚，执行：

```bash
git log --oneline -10  # 查看提交历史
git revert <commit-hash>...  # 按相反顺序回滚提交
```
