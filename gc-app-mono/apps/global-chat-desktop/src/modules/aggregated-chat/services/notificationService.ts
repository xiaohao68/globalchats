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
    const lastMsg = messages[messages.length - 1]!;

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
