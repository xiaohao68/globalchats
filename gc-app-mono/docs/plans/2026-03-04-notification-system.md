# 聚合聊天系统通知 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 当收到新消息且应用不在前台时，通过操作系统原生通知提醒用户，支持点击跳转到对话。

**Architecture:** 在 chatStore 的 mergeImtpMessages/mergeImtpConversations 中检测新消息和未读数变化，调用独立的 notificationService 发送系统通知。通知服务通过 `document.visibilityState` 检测窗口焦点状态，使用 `@tauri-apps/plugin-notification`（已安装 v2.3.3）发送原生通知。

**Tech Stack:** Tauri plugin-notification v2.3.3, Tauri window API, Zustand, Vitest

---

### Task 1: 创建 notificationService

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/services/notificationService.ts`

**Step 1: 创建通知服务核心**

```typescript
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { Window } from "@tauri-apps/api/window";
import { createLogger } from "@gc/logger";
import type { Message, Conversation } from "../types";
import { MessageDirection } from "../types";

const logger = createLogger("aggregated-chat", "notification");

const MERGE_WINDOW_MS = 5000;

interface PendingNotification {
  conversationId: string;
  messages: Message[];
  conversation: Conversation | undefined;
  timer: ReturnType<typeof setTimeout>;
}

class NotificationService {
  private isFocused = true;
  private hasPermission = false;
  private initialized = false;
  private isInitialLoad = true;
  private pendingNotifications = new Map<string, PendingNotification>();

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.isFocused = document.visibilityState === "visible";
    document.addEventListener("visibilitychange", () => {
      this.isFocused = document.visibilityState === "visible";
      logger.debug("Visibility changed", { isFocused: this.isFocused });
    });

    try {
      this.hasPermission = await isPermissionGranted();
      if (!this.hasPermission) {
        const permission = await requestPermission();
        this.hasPermission = permission === "granted";
      }
      logger.info("Notification permission", { granted: this.hasPermission });
    } catch {
      logger.warn("Notification permission check failed (non-Tauri env)");
      this.hasPermission = false;
    }
  }

  markInitialLoadComplete(): void {
    this.isInitialLoad = false;
  }

  shouldNotify(conversationId: string, selectedConversationId: string | null): boolean {
    if (this.isInitialLoad) return false;
    if (!this.hasPermission) return false;
    if (this.isFocused && selectedConversationId === conversationId) return false;
    return true;
  }

  notifyNewMessages(
    conversationId: string,
    messages: Message[],
    conversation: Conversation | undefined,
    selectedConversationId: string | null,
  ): void {
    const incomingMessages = messages.filter(
      (m) => m.direction === MessageDirection.Incoming,
    );
    if (incomingMessages.length === 0) return;
    if (!this.shouldNotify(conversationId, selectedConversationId)) return;

    const existing = this.pendingNotifications.get(conversationId);
    if (existing) {
      clearTimeout(existing.timer);
      existing.messages.push(...incomingMessages);
      existing.timer = setTimeout(() => this.flush(conversationId), MERGE_WINDOW_MS);
    } else {
      const timer = setTimeout(() => this.flush(conversationId), MERGE_WINDOW_MS);
      this.pendingNotifications.set(conversationId, {
        conversationId,
        messages: [...incomingMessages],
        conversation,
        timer,
      });
    }
  }

  dismiss(conversationId: string): void {
    const pending = this.pendingNotifications.get(conversationId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingNotifications.delete(conversationId);
    }
  }

  private flush(conversationId: string): void {
    const pending = this.pendingNotifications.get(conversationId);
    if (!pending) return;
    this.pendingNotifications.delete(conversationId);

    const { messages, conversation } = pending;
    if (messages.length === 0) return;

    const contactName = conversation?.contact.name || "未知联系人";
    const isGroup = conversation?.contact.isGroup ?? false;
    const lastMsg = messages[messages.length - 1];

    let title: string;
    if (isGroup && lastMsg.senderName) {
      title = `${contactName} - ${lastMsg.senderName}`;
    } else {
      title = contactName;
    }

    let body: string;
    if (messages.length === 1) {
      body = lastMsg.content.slice(0, 100);
    } else {
      body = `你有 ${messages.length} 条新消息`;
    }

    logger.info("Sending notification", { conversationId, title, count: messages.length });

    try {
      sendNotification({ title, body });
    } catch (error) {
      logger.error("Failed to send notification", { error: String(error) });
    }
  }

  async focusWindow(): Promise<void> {
    try {
      const win = Window.getCurrent();
      await win.unminimize();
      await win.setFocus();
    } catch (error) {
      logger.error("Failed to focus window", { error: String(error) });
    }
  }

  destroy(): void {
    for (const pending of this.pendingNotifications.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingNotifications.clear();
    this.initialized = false;
  }
}

export const notificationService = new NotificationService();
```

**Step 2: 导出通知服务**

Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts`

在文件末尾添加：

```typescript
export { notificationService } from "./notificationService";
```

**Step 3: 验证 TypeScript 编译**

Run: `cd apps/global-chat-desktop && bunx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无与 notificationService 相关的错误

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/services/notificationService.ts
git add apps/global-chat-desktop/src/modules/aggregated-chat/services/index.ts
git commit -m "feat(aggregated-chat): 添加系统通知服务"
```

---

### Task 2: chatStore 集成 — mergeImtpMessages 触发通知

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/store/chatStore.ts:270-416`

**Step 1: 添加导入**

在 `chatStore.ts` 顶部 import 区域添加：

```typescript
import { notificationService } from "../services/notificationService";
import { useUIStore } from "./uiStore";
```

**Step 2: 在 mergeImtpMessages 的 set() 调用之前添加通知逻辑**

在 `chatStore.ts` 的 `mergeImtpMessages` 方法中，在 `logger.info("mergeImtpMessages completed"` 之前（约第 404 行），插入以下代码：

```typescript
    // 通知：检测新的 incoming 消息
    if (deduped.length > 0) {
      const selectedConversationId = useUIStore.getState().selectedConversationId;
      const incomingByConversation = new Map<string, Message[]>();
      for (const msg of deduped) {
        if (msg.direction === MessageDirection.Incoming) {
          const list = incomingByConversation.get(msg.conversationId) || [];
          list.push(msg);
          incomingByConversation.set(msg.conversationId, list);
        }
      }
      for (const [convId, msgs] of incomingByConversation) {
        const conv = conversationsMap.get(convId);
        notificationService.notifyNewMessages(convId, msgs, conv, selectedConversationId);
      }
    }
```

**Step 3: 验证 TypeScript 编译**

Run: `cd apps/global-chat-desktop && bunx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无错误

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/store/chatStore.ts
git commit -m "feat(aggregated-chat): mergeImtpMessages 触发新消息通知"
```

---

### Task 3: chatStore 集成 — mergeImtpConversations 未读清零时关闭通知

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/store/chatStore.ts:202-268`

**Step 1: 在 mergeImtpConversations 中检测未读数减少**

在 `mergeImtpConversations` 方法的 for 循环内，在 `conversationsMap.set(conversationId, { ... })` 之前（约第 238 行），添加：

```typescript
      const existing = conversationsMap.get(conversationId);
      const oldUnread = existing?.unreadCount ?? 0;
      const newUnread = data.unreadCount ?? existing?.unreadCount ?? 0;
      if (newUnread < oldUnread) {
        notificationService.dismiss(conversationId);
      }
```

注意：`existing` 变量在第 237 行已声明，需要把通知逻辑放在该行之后、`conversationsMap.set` 之前。

**Step 2: 验证 TypeScript 编译**

Run: `cd apps/global-chat-desktop && bunx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无错误

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/store/chatStore.ts
git commit -m "feat(aggregated-chat): 未读数清零时关闭通知"
```

---

### Task 4: AggregatedChat.tsx 初始化通知服务

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/AggregatedChat.tsx`

**Step 1: 添加通知服务初始化**

修改 `ChatApp` 组件中的 useEffect，在 `initialLoad` 完成后标记 initialLoad 完成：

```typescript
import { useEffect, ReactNode } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { useSyncStore } from "./store/syncStore";
import { cn } from "@gc/ui/lib/utils";
import { useGlobalStore } from "@gc/store";
import { notificationService } from "./services/notificationService";

interface AggregatedChatProps {
  currentUserKey?: string;
  onConversationSelect?: (id: string) => void;
  rightSidebarContent?: ReactNode;
  className?: string;
}

function ChatApp() {
  const isSignedIn = useGlobalStore((s) => !!s.currentSignInUserId);

  useEffect(() => {
    if (!isSignedIn) return;

    const init = async () => {
      await notificationService.init();
      await useSyncStore.getState().initialLoad();
      notificationService.markInitialLoadComplete();
      useSyncStore.getState().startPolling();
    };

    init();

    return () => {
      useSyncStore.getState().stopPolling();
      notificationService.destroy();
    };
  }, [isSignedIn]);

  if (!isSignedIn) return null;

  return <MainLayout />;
}

export function AggregatedChat({
  className,
}: AggregatedChatProps) {
  return (
    <div className={cn("h-full w-full", className)}>
      <ChatApp />
    </div>
  );
}

export default AggregatedChat;
```

**Step 2: 验证 TypeScript 编译**

Run: `cd apps/global-chat-desktop && bunx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无错误

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/AggregatedChat.tsx
git commit -m "feat(aggregated-chat): 初始化通知服务生命周期"
```

---

### Task 5: 单元测试 — notificationService

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/services/__tests__/notificationService.test.ts`

**Step 1: 编写测试**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn().mockResolvedValue(true),
  requestPermission: vi.fn().mockResolvedValue("granted"),
  sendNotification: vi.fn(),
}));

vi.mock("@tauri-apps/api/window", () => ({
  Window: {
    getCurrent: vi.fn().mockReturnValue({
      unminimize: vi.fn().mockResolvedValue(undefined),
      setFocus: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@gc/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { sendNotification } from "@tauri-apps/plugin-notification";
import { MessageDirection, MessageStatus } from "../../types";
import type { Message, Conversation, Contact } from "../../types";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.random()}`,
    conversationId: "conv-1",
    senderId: "sender-1",
    senderName: "Alice",
    content: "hello",
    timestamp: Date.now(),
    status: MessageStatus.Sent,
    direction: MessageDirection.Incoming,
    ...overrides,
  };
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  const contact: Contact = {
    id: "jid-1",
    name: "Alice",
    isGroup: false,
  };
  return {
    id: "conv-1",
    accountId: "acc-1",
    jid: "jid-1",
    contact,
    lastActivityAt: Date.now(),
    unreadCount: 1,
    ...overrides,
  };
}

describe("NotificationService", () => {
  let notificationService: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const mod = await import("../notificationService");
    notificationService = mod.notificationService;
    await notificationService.init();
    notificationService.markInitialLoadComplete();
  });

  afterEach(() => {
    notificationService.destroy();
    vi.useRealTimers();
  });

  it("initialLoad 期间不发送通知", async () => {
    vi.resetModules();
    const mod = await import("../notificationService");
    const svc = mod.notificationService;
    await svc.init();
    // 不调用 markInitialLoadComplete

    const msg = makeMessage();
    const conv = makeConversation();
    svc.notifyNewMessages("conv-1", [msg], conv, null);

    vi.advanceTimersByTime(6000);
    expect(sendNotification).not.toHaveBeenCalled();
    svc.destroy();
  });

  it("窗口前台 + 当前对话不发送通知", () => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const msg = makeMessage({ conversationId: "conv-1" });
    const conv = makeConversation({ id: "conv-1" });
    notificationService.notifyNewMessages("conv-1", [msg], conv, "conv-1");

    vi.advanceTimersByTime(6000);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("窗口后台时发送通知", () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const msg = makeMessage();
    const conv = makeConversation();
    notificationService.notifyNewMessages("conv-1", [msg], conv, null);

    vi.advanceTimersByTime(6000);
    expect(sendNotification).toHaveBeenCalledWith({
      title: "Alice",
      body: "hello",
    });
  });

  it("outgoing 消息不触发通知", () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const msg = makeMessage({ direction: MessageDirection.Outgoing });
    const conv = makeConversation();
    notificationService.notifyNewMessages("conv-1", [msg], conv, null);

    vi.advanceTimersByTime(6000);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("同一对话多条消息合并通知", () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const conv = makeConversation();
    notificationService.notifyNewMessages("conv-1", [makeMessage()], conv, null);
    vi.advanceTimersByTime(2000);
    notificationService.notifyNewMessages("conv-1", [makeMessage(), makeMessage()], conv, null);

    vi.advanceTimersByTime(6000);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith({
      title: "Alice",
      body: "你有 3 条新消息",
    });
  });

  it("群聊通知标题包含群名和发送者", () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const groupContact: Contact = { id: "g1@g.us", name: "工作群", isGroup: true };
    const conv = makeConversation({ contact: groupContact });
    const msg = makeMessage({ senderName: "Bob" });
    notificationService.notifyNewMessages("conv-1", [msg], conv, null);

    vi.advanceTimersByTime(6000);
    expect(sendNotification).toHaveBeenCalledWith({
      title: "工作群 - Bob",
      body: "hello",
    });
  });

  it("dismiss 取消待发通知", () => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const msg = makeMessage();
    const conv = makeConversation();
    notificationService.notifyNewMessages("conv-1", [msg], conv, null);

    notificationService.dismiss("conv-1");
    vi.advanceTimersByTime(6000);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("窗口前台但查看其他对话时发送通知", () => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const msg = makeMessage({ conversationId: "conv-1" });
    const conv = makeConversation({ id: "conv-1" });
    notificationService.notifyNewMessages("conv-1", [msg], conv, "conv-2");

    vi.advanceTimersByTime(6000);
    expect(sendNotification).toHaveBeenCalled();
  });
});
```

**Step 2: 运行测试确认通过**

Run: `cd apps/global-chat-desktop && bunx vitest run src/modules/aggregated-chat/services/__tests__/notificationService.test.ts`
Expected: 全部 PASS

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/services/__tests__/notificationService.test.ts
git commit -m "test(aggregated-chat): 通知服务单元测试"
```

---

### Task 6: 验证整体编译 + 现有测试不受影响

**Step 1: TypeScript 全量检查**

Run: `cd apps/global-chat-desktop && bunx tsc --noEmit --pretty 2>&1 | tail -10`
Expected: 无错误

**Step 2: 运行所有聚合聊天相关测试**

Run: `cd apps/global-chat-desktop && bunx vitest run src/modules/aggregated-chat/`
Expected: 全部 PASS

**Step 3: 最终 Commit（如有格式调整）**

```bash
git add -A
git commit -m "chore(aggregated-chat): 通知系统最终清理"
```
