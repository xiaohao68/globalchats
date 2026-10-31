// @vitest-environment jsdom
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
    vi.mocked(sendNotification).mockClear();
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
