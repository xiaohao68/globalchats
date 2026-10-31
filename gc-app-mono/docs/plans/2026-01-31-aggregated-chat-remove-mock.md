# 聚合聊天模块：移除 Mock 数据实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将聚合聊天模块从 mock 数据切换到真实 GraphQL API

**Architecture:** 移除所有 mock 相关代码，数据通过 `syncStore.startPolling()` 从 `ChatTpcaPoll` GraphQL 接口获取，发送消息通过 `SendMessage` mutation 实现

**Tech Stack:** React, Zustand, GraphQL, @gc/api

---

## Task 1: 修改入口文件 AggregatedChat.tsx

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/AggregatedChat.tsx`

**Step 1: 移除 USE_MOCK 分支，直接使用轮询**

将 ChatApp 组件从：

```typescript
function ChatApp({ currentUserKey }: { currentUserKey?: string }) {
  const { loadAccounts, loadConversations } = useChatStore();
  const { startPolling, stopPolling } = useSyncStore();

  useEffect(() => {
    const USE_MOCK = import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API;

    if (USE_MOCK) {
      loadAccounts();
      loadConversations();
    } else {
      if (currentUserKey) {
        startPolling(currentUserKey);
      } else {
        console.warn("No current user found, cannot start polling");
      }
    }

    return () => {
      if (!USE_MOCK) {
        stopPolling();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserKey]);

  return <MainLayout />;
}
```

改为：

```typescript
function ChatApp({ currentUserKey }: { currentUserKey?: string }) {
  const { startPolling, stopPolling } = useSyncStore();

  useEffect(() => {
    if (currentUserKey) {
      startPolling(currentUserKey);
    } else {
      console.warn("No current user found, cannot start polling");
    }

    return () => {
      stopPolling();
    };
  }, [currentUserKey, startPolling, stopPolling]);

  return <MainLayout />;
}
```

**Step 2: 移除未使用的 import**

移除 `useChatStore` 的 import（如果不再使用）。

**Step 3: 验证编译**

Run: `cd apps/global-chat-desktop && bun run build --mode development 2>&1 | head -50`
Expected: 编译通过（可能有 unused import 警告）

---

## Task 2: 清理 services/index.ts

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts`

**Step 1: 移除 mock 相关导出**

将文件从：

```typescript
import type { ChatService } from "../types";
import { mockChatService } from "./mockChatService";

const USE_MOCK = true;

export const chatService: ChatService = USE_MOCK
  ? mockChatService
  : mockChatService;

export { mockChatService };
```

改为：

```typescript
// Services 通过 syncStore 的轮询服务提供数据
// 发送消息使用 @gc/api 的 apiSendMessage
export {};
```

**Step 2: 验证编译**

Run: `cd apps/global-chat-desktop && bun run build --mode development 2>&1 | head -50`
Expected: 可能有编译错误（chatStore 依赖 chatService）

---

## Task 3: 重构 chatStore.ts

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/store/chatStore.ts`

**Step 1: 移除 chatService import，添加 apiSendMessage**

移除：
```typescript
import { chatService } from "../services";
```

添加：
```typescript
import { apiSendMessage } from "@gc/api";
```

**Step 2: 移除 loadAccounts 方法的实现（保留空壳）**

将 loadAccounts 改为空操作（数据来自轮询）：

```typescript
loadAccounts: async () => {
  // 数据通过 syncStore 轮询获取，此方法保留以兼容接口
  set({ accountsState: "success" });
},
```

**Step 3: 移除 loadConversations 方法的实现（保留空壳）**

```typescript
loadConversations: async (_accountId?: string) => {
  // 数据通过 syncStore 轮询获取，此方法保留以兼容接口
  set({ conversationsState: "success" });
},
```

**Step 4: 移除 loadMessages 方法的实现（保留空壳）**

```typescript
loadMessages: async (_conversationId: string) => {
  // 消息数据通过 syncStore 轮询获取
  // 历史消息加载待后续实现
},
```

**Step 5: 移除 loadMoreMessages 方法的实现**

```typescript
loadMoreMessages: async (_conversationId: string) => {
  // 历史消息加载待后续通过 GraphQL 分页查询实现
  return false;
},
```

**Step 6: 重构 sendMessage 使用 GraphQL**

```typescript
sendMessage: async (conversationId: string, content: string) => {
  const state = get();
  const conversation = state.conversations.find(c => c.id === conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // 调用 GraphQL mutation
  const result = await apiSendMessage({
    content,
    senderId: conversation.accountId,
    receiverId: conversation.contact.id,
  });

  // 构造本地消息对象
  const message: Message = {
    id: result.id,
    conversationId,
    senderId: result.senderId,
    content: result.content,
    timestamp: result.timestamp,
    status: MessageStatus.Sent,
    direction: MessageDirection.Outgoing,
  };

  // 添加到本地状态
  set((state) => {
    const currentMessages = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: [...currentMessages, message],
      },
    };
  });
},
```

**Step 7: 移除 refreshAll 中的 mock 调用**

```typescript
refreshAll: async (opts) => {
  // 触发同步刷新
  const { syncNow } = await import("./syncStore").then(m => m.useSyncStore.getState());
  await syncNow();
  // 如果指定了 conversationId，消息会在下次轮询时更新
},
```

**Step 8: 验证编译**

Run: `cd apps/global-chat-desktop && bun run build --mode development 2>&1 | head -50`
Expected: 编译通过

---

## Task 4: 删除 mockChatService.ts

**Files:**
- Delete: `apps/global-chat-desktop/src/modules/aggregated-chat/services/mockChatService.ts`

**Step 1: 删除文件**

```bash
rm apps/global-chat-desktop/src/modules/aggregated-chat/services/mockChatService.ts
```

**Step 2: 验证编译**

Run: `cd apps/global-chat-desktop && bun run build --mode development 2>&1 | head -50`
Expected: 编译通过

---

## Task 5: 删除 mock 目录

**Files:**
- Delete: `apps/global-chat-desktop/src/modules/aggregated-chat/mock/` (entire directory)

**Step 1: 删除整个 mock 目录**

```bash
rm -rf apps/global-chat-desktop/src/modules/aggregated-chat/mock
```

**Step 2: 验证编译**

Run: `cd apps/global-chat-desktop && bun run build --mode development 2>&1 | head -50`
Expected: 编译通过

---

## Task 6: 移除 types 中未使用的 ChatService 接口（如果有）

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/types/index.ts` (if needed)

**Step 1: 检查并移除 ChatService 接口**

如果 `ChatService` 接口不再被使用，移除它。

**Step 2: 验证编译**

Run: `cd apps/global-chat-desktop && bun run build --mode development 2>&1 | head -50`
Expected: 编译通过

---

## Task 7: 最终验证和提交

**Step 1: 完整构建测试**

Run: `cd apps/global-chat-desktop && bun run build --mode development`
Expected: 编译成功，无错误

**Step 2: 提交改动**

```bash
git add -A
git commit -m "refactor(aggregated-chat): 移除 mock 数据，切换到 GraphQL API

- 移除 mock/ 目录和所有 mock 数据文件
- 移除 mockChatService.ts
- 重构 chatStore 使用 GraphQL 轮询和 mutation
- 简化 AggregatedChat.tsx 入口，移除 USE_MOCK 分支
- 数据通过 syncStore.startPolling() 获取
- 发送消息通过 apiSendMessage mutation"
```
