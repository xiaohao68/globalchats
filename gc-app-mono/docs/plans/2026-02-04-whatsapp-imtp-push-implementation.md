# WhatsApp IMTP 上报功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 WhatsApp 上报协议从 TPCA 完全迁移到 IMTP，实现完整的 startSync/pushMessages/completeSync 流程

**Architecture:** 创建新的 `ImtpBackend` 类实现 `BackendApi` 接口，替换现有的 `TpcaBackend`。调整消息格式以适配 IMTP 协议（version 改为 string，添加 data 包装层）。在 `SyncService` 中实现完整的同步会话管理。

**Tech Stack:** TypeScript, GraphQL, Zustand

---

## 前置检查

### Task 0: 确认 GraphQL Schema 已生成

**Step 1: 检查 IMTP 类型定义**

确认 `packages/api/src/gen/graphql.ts` 包含以下类型：
- `ImtpPushMessagesInput`
- `ImtpPushMessagesResult`
- `ImtpStartSyncInput`
- `ImtpStartSyncResult`
- `ImtpCompleteSyncInput`
- `ImtpFullSyncResult`
- `ImtpUpsertMessageInput`

**Step 2: 验证通过**

```bash
grep -n "ImtpPushMessages\|ImtpStartSync\|ImtpCompleteSync" packages/api/src/gen/graphql.ts | head -20
```

预期输出：显示类型定义行号

---

## Phase 1: API 层实现

### Task 1: 创建 IMTP Push Messages API

**Files:**
- Create: `packages/api/src/api/apiImtpWhatsappPushMessages.ts`
- Modify: `packages/api/src/api/index.ts`

**Step 1: 创建 API 文件**

```typescript
// packages/api/src/api/apiImtpWhatsappPushMessages.ts
import { gqlClient } from "../apiClient.ts";
import { parse } from "graphql";
import type {
  ImtpPushMessagesInput,
  ImtpPushMessagesResult,
} from "../gen/graphql.ts";

interface ResponseData {
  imtpWhatsappPushMessages: ImtpPushMessagesResult;
}

const mutation = parse(`
  mutation ImtpWhatsappPushMessages($input: ImtpPushMessagesInput!) {
    imtpWhatsappPushMessages(input: $input) {
      inserted
      updated
      skipped
      failed
      failedKeyIds
    }
  }
`);

export const apiImtpWhatsappPushMessages = async (
  input: ImtpPushMessagesInput,
): Promise<ImtpPushMessagesResult> => {
  const res = await gqlClient<ResponseData>(
    {
      query: mutation,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.imtpWhatsappPushMessages;
};
```

**Step 2: 导出 API**

```typescript
// packages/api/src/api/index.ts
// 在第31行后添加
export * from "./apiImtpWhatsappPushMessages.ts";
```

**Step 3: Commit**

```bash
git add packages/api/src/api/apiImtpWhatsappPushMessages.ts packages/api/src/api/index.ts
git commit -m "feat(api): 添加 imtpWhatsappPushMessages GraphQL API"
```

---

### Task 2: 创建 IMTP Start Sync API

**Files:**
- Create: `packages/api/src/api/apiImtpWhatsappStartSync.ts`
- Modify: `packages/api/src/api/index.ts`

**Step 1: 创建 API 文件**

```typescript
// packages/api/src/api/apiImtpWhatsappStartSync.ts
import { gqlClient } from "../apiClient.ts";
import { parse } from "graphql";
import type {
  ImtpStartSyncInput,
  ImtpStartSyncResult,
} from "../gen/graphql.ts";

interface ResponseData {
  imtpWhatsappStartSync: ImtpStartSyncResult;
}

const mutation = parse(`
  mutation ImtpWhatsappStartSync($input: ImtpStartSyncInput!) {
    imtpWhatsappStartSync(input: $input) {
      syncId
      syncType
      status
      estimatedCount
    }
  }
`);

export const apiImtpWhatsappStartSync = async (
  input: ImtpStartSyncInput,
): Promise<ImtpStartSyncResult> => {
  const res = await gqlClient<ResponseData>(
    {
      query: mutation,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.imtpWhatsappStartSync;
};
```

**Step 2: 导出 API**

```typescript
// packages/api/src/api/index.ts
// 添加导出
export * from "./apiImtpWhatsappStartSync.ts";
```

**Step 3: Commit**

```bash
git add packages/api/src/api/apiImtpWhatsappStartSync.ts packages/api/src/api/index.ts
git commit -m "feat(api): 添加 imtpWhatsappStartSync GraphQL API"
```

---

### Task 3: 创建 IMTP Complete Sync API

**Files:**
- Create: `packages/api/src/api/apiImtpWhatsappCompleteSync.ts`
- Modify: `packages/api/src/api/index.ts`

**Step 1: 创建 API 文件**

```typescript
// packages/api/src/api/apiImtpWhatsappCompleteSync.ts
import { gqlClient } from "../apiClient.ts";
import { parse } from "graphql";
import type {
  ImtpCompleteSyncInput,
  ImtpFullSyncResult,
} from "../gen/graphql.ts";

interface ResponseData {
  imtpWhatsappCompleteSync: ImtpFullSyncResult;
}

const mutation = parse(`
  mutation ImtpWhatsappCompleteSync($input: ImtpCompleteSyncInput!) {
    imtpWhatsappCompleteSync(input: $input) {
      syncId
      syncType
      status
      totalSynced
      syncStats
    }
  }
`);

export const apiImtpWhatsappCompleteSync = async (
  input: ImtpCompleteSyncInput,
): Promise<ImtpFullSyncResult> => {
  const res = await gqlClient<ResponseData>(
    {
      query: mutation,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.imtpWhatsappCompleteSync;
};
```

**Step 2: 导出 API**

```typescript
// packages/api/src/api/index.ts
// 添加导出
export * from "./apiImtpWhatsappCompleteSync.ts";
```

**Step 3: Commit**

```bash
git add packages/api/src/api/apiImtpWhatsappCompleteSync.ts packages/api/src/api/index.ts
git commit -m "feat(api): 添加 imtpWhatsappCompleteSync GraphQL API"
```

---

### Task 4: 创建 IMTP Push Conversations API

**Files:**
- Create: `packages/api/src/api/apiImtpWhatsappPushConversations.ts`
- Modify: `packages/api/src/api/index.ts`

**Step 1: 创建 API 文件**

```typescript
// packages/api/src/api/apiImtpWhatsappPushConversations.ts
import { gqlClient } from "../apiClient.ts";
import { parse } from "graphql";
import type {
  ImtpPushConversationsInput,
  ImtpPushConversationsResult,
} from "../gen/graphql.ts";

interface ResponseData {
  imtpWhatsappPushConversations: ImtpPushConversationsResult;
}

const mutation = parse(`
  mutation ImtpWhatsappPushConversations($input: ImtpPushConversationsInput!) {
    imtpWhatsappPushConversations(input: $input) {
      inserted
      updated
      skipped
      failed
      failedJids
    }
  }
`);

export const apiImtpWhatsappPushConversations = async (
  input: ImtpPushConversationsInput,
): Promise<ImtpPushConversationsResult> => {
  const res = await gqlClient<ResponseData>(
    {
      query: mutation,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.imtpWhatsappPushConversations;
};
```

**Step 2: 导出 API**

```typescript
// packages/api/src/api/index.ts
// 添加导出
export * from "./apiImtpWhatsappPushConversations.ts";
```

**Step 3: Commit**

```bash
git add packages/api/src/api/apiImtpWhatsappPushConversations.ts packages/api/src/api/index.ts
git commit -m "feat(api): 添加 imtpWhatsappPushConversations GraphQL API"
```

---

## Phase 2: Backend 层实现

### Task 5: 创建 IMTP Backend 类

**Files:**
- Create: `packages/gc-engine/src/middleware/backend/imtpBackend.ts`

**Step 1: 创建 Backend 文件**

```typescript
// packages/gc-engine/src/middleware/backend/imtpBackend.ts
import {
  apiImtpWhatsappPushMessages,
  apiImtpWhatsappStartSync,
  apiImtpWhatsappCompleteSync,
  apiImtpWhatsappPushConversations,
} from "@gc/api";
import type {
  BackendApi,
  BackendReportSummary,
} from "./backendApi.ts";
import type {
  MiddlewareContact,
  MiddlewareConversation,
  MiddlewareDomainEvent,
  MiddlewareMessage,
  MiddlewareStatusEvent,
  MiddlewareUser,
  ListData,
  PaginationInput,
  SourceScope,
} from "../types.ts";

// IMTP 同步类型
export enum ImtpSyncType {
  REALTIME = "realtime",
  INCREMENTAL = "incremental",
  HISTORY = "history",
  FULL = "full",
}

// IMTP 设备信息
export interface ImtpDeviceInfo {
  platform: string;
  version: string;
}

// 同步会话状态
interface SyncSession {
  syncId: string;
  syncType: ImtpSyncType;
  startedAt: number;
}

/**
 * IMTP Backend 实现
 * 用于 WhatsApp 平台的 IMTP 协议上报
 */
export class ImtpBackend implements BackendApi {
  private currentSync: SyncSession | null = null;
  private readonly deviceInfo: ImtpDeviceInfo;

  constructor(deviceInfo: ImtpDeviceInfo = { platform: "whatsapp-web", version: "1.0.0" }) {
    this.deviceInfo = deviceInfo;
  }

  /**
   * 开始同步会话
   */
  async startSync(syncType: ImtpSyncType): Promise<string> {
    const result = await apiImtpWhatsappStartSync({
      syncType,
      deviceInfo: this.deviceInfo,
    });

    this.currentSync = {
      syncId: result.syncId,
      syncType,
      startedAt: Date.now(),
    };

    return result.syncId;
  }

  /**
   * 完成同步会话
   */
  async completeSync(syncedCount: number): Promise<void> {
    if (!this.currentSync) {
      console.warn("[ImtpBackend] No active sync session to complete");
      return;
    }

    await apiImtpWhatsappCompleteSync({
      syncId: this.currentSync.syncId,
      syncedCount,
    });

    this.currentSync = null;
  }

  /**
   * 获取当前同步会话 ID
   */
  getCurrentSyncId(): string | null {
    return this.currentSync?.syncId ?? null;
  }

  // ========== BackendApi 实现 ==========

  async pushCurrentUser(
    _scope: SourceScope,
    _user: MiddlewareUser,
  ): Promise<BackendReportSummary> {
    // IMTP 协议中，当前用户通过消息中的 senderId 隐式上报
    // 不需要单独上报
    return { acceptedCount: 1 };
  }

  async pushStatusEvent(
    _scope: SourceScope,
    _event: MiddlewareStatusEvent,
  ): Promise<BackendReportSummary> {
    // 状态事件暂不上报
    return { acceptedCount: 1 };
  }

  async pushContacts(
    scope: SourceScope,
    contacts: MiddlewareContact[],
  ): Promise<BackendReportSummary> {
    if (contacts.length === 0) {
      return { acceptedCount: 0 };
    }

    // 将联系人转换为对话格式上报（IMTP 中联系人和对话统一）
    const conversations = contacts.map((contact) => ({
      jid: contact.contactId,
      data: {
        name: contact.nickname,
        avatar: contact.avatar,
        phone: contact.phone,
      },
      version: "1.0.0",
    }));

    const result = await apiImtpWhatsappPushConversations({
      conversations,
    });

    return {
      acceptedCount: result.inserted + result.updated,
    };
  }

  async pushConversations(
    _scope: SourceScope,
    conversations: MiddlewareConversation[],
  ): Promise<BackendReportSummary> {
    if (conversations.length === 0) {
      return { acceptedCount: 0 };
    }

    const result = await apiImtpWhatsappPushConversations({
      conversations: conversations.map((conv) => ({
        jid: conv.conversationId,
        data: {
          name: conv.title,
          avatar: conv.avatar,
          type: conv.type,
          lastMessageTime: conv.lastMessageTime,
          unreadCount: conv.unreadCount,
          memberCount: conv.memberCount,
        },
        version: String(conv.version),
      })),
    });

    return {
      acceptedCount: result.inserted + result.updated,
    };
  }

  async pushMessages(
    _scope: SourceScope,
    messages: MiddlewareMessage[],
  ): Promise<BackendReportSummary> {
    if (messages.length === 0) {
      return { acceptedCount: 0 };
    }

    // 按 chatId 分组消息
    const groupedByChat = this.groupMessagesByChat(messages);
    let totalAccepted = 0;

    for (const [chatId, chatMessages] of Object.entries(groupedByChat)) {
      const result = await apiImtpWhatsappPushMessages({
        conversationJid: chatId,
        messages: chatMessages.map((msg) => this.toImtpMessageInput(msg)),
        clientCursor: this.currentSync?.syncId ?? undefined,
      });

      totalAccepted += result.inserted + result.updated;
    }

    return { acceptedCount: totalAccepted };
  }

  async pushEvents(
    _scope: SourceScope,
    _events: MiddlewareDomainEvent[],
  ): Promise<BackendReportSummary | "not_supported"> {
    return "not_supported";
  }

  async pushHistory(
    _scope: SourceScope,
    conversationId: string,
    messages: MiddlewareMessage[],
  ): Promise<BackendReportSummary> {
    if (messages.length === 0) {
      return { acceptedCount: 0 };
    }

    const result = await apiImtpWhatsappPushMessages({
      conversationJid: conversationId,
      messages: messages.map((msg) => this.toImtpMessageInput(msg)),
      clientCursor: this.currentSync?.syncId ?? undefined,
    });

    return {
      acceptedCount: result.inserted + result.updated,
    };
  }

  async getContacts(
    _scope: SourceScope,
    _input: PaginationInput,
  ): Promise<ListData<MiddlewareContact>> {
    return { items: [], hasMore: false };
  }

  async getConversations(
    _scope: SourceScope,
    _input: PaginationInput,
  ): Promise<ListData<MiddlewareConversation>> {
    return { items: [], hasMore: false };
  }

  async getMessages(
    _scope: SourceScope,
    _input: {
      conversationId?: string;
      userId?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<ListData<MiddlewareMessage>> {
    return { items: [], hasMore: false };
  }

  async getUserById(
    _scope: SourceScope,
    _userId: string,
  ): Promise<MiddlewareUser | null | "not_supported"> {
    return "not_supported";
  }

  async sendMessage(
    _scope: SourceScope,
    _input: { senderId: string; receiverId: string; content: string },
  ): Promise<MiddlewareMessage> {
    throw new Error("sendMessage should be handled by SDK directly");
  }

  async searchContacts(
    _scope: SourceScope,
    _input: { query: string; limit?: number },
  ): Promise<ListData<MiddlewareContact> | "not_supported"> {
    return "not_supported";
  }

  async searchConversations(
    _scope: SourceScope,
    _input: { query: string; limit?: number },
  ): Promise<ListData<MiddlewareConversation> | "not_supported"> {
    return "not_supported";
  }

  async addContact(
    _scope: SourceScope,
    _contactId: string,
  ): Promise<"not_supported" | { success: true }> {
    return "not_supported";
  }

  async removeContact(
    _scope: SourceScope,
    _contactId: string,
  ): Promise<"not_supported" | { success: true }> {
    return "not_supported";
  }

  // ========== 私有方法 ==========

  private groupMessagesByChat(
    messages: MiddlewareMessage[],
  ): Record<string, MiddlewareMessage[]> {
    const grouped: Record<string, MiddlewareMessage[]> = {};

    for (const msg of messages) {
      const chatId = msg.chatId;
      if (!grouped[chatId]) {
        grouped[chatId] = [];
      }
      grouped[chatId]!.push(msg);
    }

    return grouped;
  }

  private toImtpMessageInput(msg: MiddlewareMessage) {
    return {
      keyId: msg.messageId,
      keyRemoteJid: msg.chatId,
      version: String(msg.version),
      data: {
        messageTimestamp: msg.timestamp,
        content: msg.content,
        sender: {
          id: msg.senderId,
          name: msg.senderId,
        },
        messageType: msg.messageType,
      },
    };
  }
}
```

**Step 2: Commit**

```bash
git add packages/gc-engine/src/middleware/backend/imtpBackend.ts
git commit -m "feat(backend): 创建 ImtpBackend 类实现 IMTP 协议上报"
```

---

### Task 6: 导出 IMTP Backend

**Files:**
- Modify: `packages/gc-engine/src/middleware/backend/index.ts`

**Step 1: 修改 index.ts**

```typescript
// packages/gc-engine/src/middleware/backend/index.ts
// 添加导出
export { ImtpBackend, ImtpSyncType } from "./imtpBackend.ts";
export type { ImtpDeviceInfo } from "./imtpBackend.ts";
```

**Step 2: Commit**

```bash
git add packages/gc-engine/src/middleware/backend/index.ts
git commit -m "feat(backend): 导出 ImtpBackend"
```

---

## Phase 3: WhatsApp SDK 集成

### Task 7: 修改 SyncService 使用 IMTP 协议

**Files:**
- Modify: `packages/gc-engine/src/apps/whatsapp/core/services/SyncService.ts`

**Step 1: 修改 SyncService 添加同步会话管理**

```typescript
// packages/gc-engine/src/apps/whatsapp/core/services/SyncService.ts
import type { IWAWebAdapter } from "../ports/outbound/IWAWebAdapter";
import type { IReporter } from "../ports/outbound/IReporter";
import type { WAChat, WAContact, WAMessage } from "../../sdk/types";
import type {
  MiddlewareConversation,
  MiddlewareContact,
  MiddlewareMessage,
} from "../../../../middleware/types";
import { ImtpBackend, ImtpSyncType } from "../../../../middleware/backend/imtpBackend.ts";

export interface SyncConfig {
  daysBack: number;
  batchSize: number;
  delayBetweenBatches: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  daysBack: 7,
  batchSize: 100,
  delayBetweenBatches: 100,
};

/**
 * 同步服务
 * 负责初始同步和历史消息同步
 */
export class SyncService {
  private config: SyncConfig;
  private imtpBackend: ImtpBackend;

  constructor(
    private readonly waAdapter: IWAWebAdapter,
    private readonly reporter: IReporter,
    config?: Partial<SyncConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.imtpBackend = new ImtpBackend({
      platform: "whatsapp-web",
      version: "2.0.0",
    });
  }

  /**
   * 执行初始同步
   * 在登录后调用，同步会话、联系人、历史消息
   */
  async performInitialSync(): Promise<void> {
    console.log("[SyncService] Starting initial sync with IMTP protocol");

    try {
      // 1. 开始历史同步会话
      await this.imtpBackend.startSync(ImtpSyncType.HISTORY);

      // 2. 同步会话
      await this.syncConversations();

      // 3. 同步联系人
      await this.syncContacts();

      // 4. 同步历史消息
      const syncedCount = await this.syncHistoryMessages();

      // 5. 完成同步会话
      await this.imtpBackend.completeSync(syncedCount);

      console.log("[SyncService] Initial sync completed successfully");
    } catch (error) {
      console.error("[SyncService] Initial sync failed:", error);
      throw error;
    }
  }

  private async syncConversations(): Promise<void> {
    const chats = this.waAdapter.getAllChats();
    if (chats.length === 0) return;

    const conversations = chats.map((chat) =>
      this.toMiddlewareConversation(chat),
    );

    // 使用 reporter 上报（reporter 会使用 ImtpBackend）
    await this.reporter.reportConversations(conversations);
  }

  private async syncContacts(): Promise<void> {
    const contacts = this.waAdapter.getAllContacts();
    if (contacts.length === 0) return;

    const reportable = contacts.map((c) => this.toMiddlewareContact(c));
    await this.reporter.reportContacts(reportable);
  }

  private async syncHistoryMessages(): Promise<number> {
    const cutoffTime =
      Date.now() - this.config.daysBack * 24 * 60 * 60 * 1000;
    const chats = this.waAdapter.getAllChats();

    const recentChats = chats.filter(
      (chat) => chat.t && chat.t * 1000 >= cutoffTime,
    );

    let totalSynced = 0;

    for (const chat of recentChats) {
      try {
        const count = await this.syncChatHistory(chat.id._serialized, cutoffTime);
        totalSynced += count;
        await this.delay(this.config.delayBetweenBatches);
      } catch (error) {
        console.error(
          `Failed to sync history for chat ${chat.id._serialized}:`,
          error,
        );
      }
    }

    return totalSynced;
  }

  private async syncChatHistory(
    chatId: string,
    cutoffTime: number,
  ): Promise<number> {
    const messages = this.waAdapter.getMessagesByChat(chatId);
    if (!messages || messages.length === 0) return 0;

    const recentMessages = messages.filter(
      (msg) => msg.t * 1000 >= cutoffTime,
    );
    if (recentMessages.length === 0) return 0;

    const reportable = recentMessages.map((msg) =>
      this.toMiddlewareMessage(msg),
    );

    let totalSynced = 0;

    for (let i = 0; i < reportable.length; i += this.config.batchSize) {
      const batch = reportable.slice(i, i + this.config.batchSize);
      await this.reporter.reportHistory(chatId, batch);
      totalSynced += batch.length;
    }

    return totalSynced;
  }

  private toMiddlewareConversation(chat: WAChat): MiddlewareConversation {
    return {
      conversationId: chat.id._serialized,
      type: chat.id.server === "g.us" ? "group" : "private",
      title: chat.contact?.name ?? "",
      lastMessageTime: chat.t ? chat.t * 1000 : Date.now(),
      unreadCount: chat.unreadCount ?? 0,
      version: 1,
      updatedAt: Date.now(),
    };
  }

  private toMiddlewareContact(contact: WAContact): MiddlewareContact {
    return {
      contactId: contact.id._serialized,
      nickname: contact.name ?? "",
      avatar: contact.avatar,
      phone: contact.phone,
      version: 1,
      updatedAt: Date.now(),
    };
  }

  private toMiddlewareMessage(msg: WAMessage): MiddlewareMessage {
    const timestampMs = msg.clientReceivedTsMillis ?? Math.floor(msg.t * 1000);
    return {
      messageId: msg.id?._serialized ?? msg.id?.id ?? "",
      chatId: msg.id?.remote ?? "",
      senderId: msg.author ?? msg.from ?? "",
      content: msg.body ?? "",
      timestamp: timestampMs,
      messageType: msg.type ?? "unknown",
      version: 1,
      updatedAt: timestampMs,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Step 2: Commit**

```bash
git add packages/gc-engine/src/apps/whatsapp/core/services/SyncService.ts
git commit -m "feat(sync): 修改 SyncService 使用 IMTP 协议和同步会话管理"
```

---

### Task 8: 修改 ReporterAdapter 使用 ImtpBackend

**Files:**
- Modify: `packages/gc-engine/src/apps/whatsapp/adapters/reporter/ReporterAdapter.ts`

**Step 1: 修改 ReporterAdapter 构造函数**

```typescript
// packages/gc-engine/src/apps/whatsapp/adapters/reporter/ReporterAdapter.ts
import type { IReporter } from "../../core/ports/outbound/IReporter";
import type { GCEngineMiddleware } from "../../../../middleware/GCEngineMiddleware";
import type { IThirdAppUserInfo } from "@gc/model";
import type {
  MiddlewareMessage,
  MiddlewareConversation,
  MiddlewareContact,
  MiddlewareStatusEvent,
  ReportResult,
} from "../../../../middleware/types";
import { MessageQueue } from "./MessageQueue";
import { ImtpBackend } from "../../../../middleware/backend/imtpBackend.ts";

type QueueItemType = "messages" | "conversations" | "contacts" | "history";

interface QueueItem {
  type: QueueItemType;
  data: unknown;
  timestamp: number;
}

/**
 * 上报适配器
 * 实现本地队列 + 异步上报 + 重试机制
 * 使用 IMTP 协议上报
 */
export class ReporterAdapter implements IReporter {
  private messageQueue: MessageQueue<QueueItem>;
  private middleware: GCEngineMiddleware;
  private imtpBackend: ImtpBackend;
  private _isReporting = true;

  constructor(middleware: GCEngineMiddleware, imtpBackend?: ImtpBackend) {
    this.middleware = middleware;
    this.imtpBackend = imtpBackend ?? new ImtpBackend();
    this.messageQueue = new MessageQueue<QueueItem>({
      maxSize: 1000,
      flushInterval: 1000,
      flushThreshold: 50,
    });
    this.messageQueue.onFlush(this.processQueue.bind(this));
  }

  // ========== 状态上报（立即） ==========
  async reportStatusChange(event: MiddlewareStatusEvent): Promise<ReportResult> {
    return this.middleware.reportStatusChange(event);
  }

  async reportCurrentUser(user: IThirdAppUserInfo): Promise<ReportResult> {
    return this.middleware.reportCurrentUser(user);
  }

  // ========== 数据上报（走队列） ==========
  async reportConversations(
    conversations: MiddlewareConversation[],
  ): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: "conversations",
      data: conversations,
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: conversations.length };
  }

  async reportContacts(contacts: MiddlewareContact[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: "contacts",
      data: contacts,
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: contacts.length };
  }

  async reportMessages(messages: MiddlewareMessage[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: "messages",
      data: messages,
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: messages.length };
  }

  async reportHistory(
    chatId: string,
    messages: MiddlewareMessage[],
  ): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: "history",
      data: { chatId, messages },
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: messages.length };
  }

  // ========== 控制 ==========
  pause(): void {
    this._isReporting = false;
  }

  resume(): void {
    this._isReporting = true;
  }

  isReporting(): boolean {
    return this._isReporting;
  }

  destroy(): void {
    this.messageQueue.destroy();
  }

  // ========== 私有方法 ==========
  private async processQueue(items: QueueItem[]): Promise<void> {
    const grouped = this.groupByType(items);

    for (const [type, data] of Object.entries(grouped)) {
      try {
        await this.processGroupedItems(type as QueueItemType, data);
      } catch (error) {
        console.error(`Failed to process ${type}:`, error);
        data.forEach((item) => this.messageQueue.enqueue(item));
      }
    }
  }

  private groupByType(items: QueueItem[]): Record<string, QueueItem[]> {
    const result: Record<string, QueueItem[]> = {};
    for (const item of items) {
      if (!result[item.type]) {
        result[item.type] = [];
      }
      result[item.type]!.push(item);
    }
    return result;
  }

  private async processGroupedItems(
    type: QueueItemType,
    items: QueueItem[],
  ): Promise<void> {
    switch (type) {
      case "messages": {
        const messages = items.flatMap((i) => i.data as MiddlewareMessage[]);
        // 使用 ImtpBackend 直接上报
        await this.imtpBackend.pushMessages(
          this.middleware.scope,
          messages,
        );
        break;
      }
      case "conversations": {
        const conversations = items.flatMap(
          (i) => i.data as MiddlewareConversation[],
        );
        await this.imtpBackend.pushConversations(
          this.middleware.scope,
          conversations,
        );
        break;
      }
      case "contacts": {
        const contacts = items.flatMap((i) => i.data as MiddlewareContact[]);
        await this.imtpBackend.pushContacts(
          this.middleware.scope,
          contacts,
        );
        break;
      }
      case "history": {
        for (const item of items) {
          const { chatId, messages } = item.data as {
            chatId: string;
            messages: MiddlewareMessage[];
          };
          await this.imtpBackend.pushHistory(
            this.middleware.scope,
            chatId,
            messages,
          );
        }
        break;
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add packages/gc-engine/src/apps/whatsapp/adapters/reporter/ReporterAdapter.ts
git commit -m "feat(reporter): 修改 ReporterAdapter 使用 ImtpBackend"
```

---

### Task 9: 修改 WhatsAppSDKV2 使用 ImtpBackend

**Files:**
- Modify: `packages/gc-engine/src/apps/whatsapp/application/WhatsAppSDKV2.ts`

**Step 1: 修改 mount 方法**

```typescript
// packages/gc-engine/src/apps/whatsapp/application/WhatsAppSDKV2.ts
// 在 import 部分添加
import { ImtpBackend } from "../../middleware/backend/imtpBackend.ts";

// 在 mount 方法中，创建 ReporterAdapter 时传入 ImtpBackend
async mount(): Promise<void> {
  super.mount();
  await domReady();

  // 1. 等待 WhatsApp Web 就绪
  await this.waAdapter.waitForReady();

  // 2. 初始化适配器
  this.waAdapter.initialize();

  // 3. 创建 ImtpBackend
  const imtpBackend = new ImtpBackend({
    platform: "whatsapp-web",
    version: "2.0.0",
  });

  // 4. 初始化服务（依赖注入）
  this.authService = new AuthService(this.waAdapter, this.reporter, this.eventBus);
  this.chatService = new ChatService(this.waAdapter, this.eventBus);
  this.messageService = new MessageService(this.waAdapter, this.reporter, this.eventBus);
  this.contactService = new ContactService(this.waAdapter);
  this.syncService = new SyncService(this.waAdapter, this.reporter);

  // 5. 初始化服务并收集清理函数
  this.cleanupFns.push(this.authService.initialize());
  this.cleanupFns.push(this.chatService.initialize());
  this.cleanupFns.push(this.messageService.initialize());

  // 6. 转发事件到 SDK emitter
  this.setupEventForwarding();

  // 7. 如果已登录，执行初始同步
  if (this.authService.isLoggedIn()) {
    void this.syncService.performInitialSync();
  }

  // 8. 监听登录事件，登录后执行同步
  this.cleanupFns.push(
    this.eventBus.on("auth:login", () => {
      void this.syncService.performInitialSync();
    }),
  );
}
```

**Step 2: Commit**

```bash
git add packages/gc-engine/src/apps/whatsapp/application/WhatsAppSDKV2.ts
git commit -m "feat(whatsapp): 修改 WhatsAppSDKV2 使用 ImtpBackend"
```

---

## Phase 4: 验证与测试

### Task 10: 类型检查

**Step 1: 运行类型检查**

```bash
cd packages/gc-engine
bun run typecheck
```

**预期输出**: 无类型错误

**Step 2: 修复类型错误（如有）**

根据错误提示修复类型问题。

**Step 3: Commit**

```bash
git add -A
git commit -m "fix(types): 修复 IMTP 相关类型错误"
```

---

### Task 11: 构建验证

**Step 1: 构建 gc-engine**

```bash
cd packages/gc-engine
bun run build
```

**预期输出**: 构建成功

**Step 2: Commit**

```bash
git add -A
git commit -m "chore(build): 验证 gc-engine 构建成功"
```

---

## 完成总结

实施完成后，WhatsApp 上报功能将具备：

1. **IMTP 协议**: 完全替换 TPCA，使用新的 IMTP 协议
2. **同步会话**: 完整的 startSync → pushMessages → completeSync 流程
3. **消息格式**: version 改为 string，添加 data 包装层
4. **内存队列**: 保持现有的内存队列 + 重试机制
5. **简化版本**: 不包含本地持久化，适合快速上线

---

## 回滚计划

如需回滚，执行：

```bash
git log --oneline -15  # 查看提交历史
git revert <commit-hash>...  # 按相反顺序回滚提交
```
