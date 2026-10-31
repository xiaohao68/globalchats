import type { IWAWebAdapter } from "../ports/outbound/IWAWebAdapter";
import type { IReporter } from "../ports/outbound/IReporter";
import type { WAChat, WAContact, WAMessage } from "../../sdk/types";
import type {
  MiddlewareConversation,
  MiddlewareContact,
  MiddlewareMessage,
} from "../../../../middleware/types";

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

  constructor(
    private readonly waAdapter: IWAWebAdapter,
    private readonly reporter: IReporter,
    config?: Partial<SyncConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行初始同步
   * 在登录后调用，同步会话、联系人、历史消息
   */
  async performInitialSync(): Promise<void> {
    console.log("[SyncService] Starting initial sync with IMTP protocol");

    try {
      // 1. 先同步联系人（名称先到达后端）
      await this.syncContacts();

      // 2. 再同步会话
      await this.syncConversations();

      // 3. 同步历史消息
      await this.syncHistoryMessages();

      console.log("[SyncService] Initial sync completed successfully");
    } catch (error) {
      console.error("[SyncService] Initial sync failed:", error);
      throw error;
    }
  }

  private async syncConversations(): Promise<void> {
    const chats = this.waAdapter.getAllChats();
    if (chats.length === 0) {
      console.log("[SyncService] No conversations to sync");
      return;
    }

    console.log(`[SyncService] Syncing ${chats.length} conversations`);

    const conversations = chats.map((chat) =>
      this.toMiddlewareConversation(chat),
    );
    await this.reporter.reportConversations(conversations);

    console.log(`[SyncService] Conversations synced: ${conversations.length}`);
  }

  private async syncContacts(): Promise<void> {
    const contacts = this.waAdapter.getAllContacts();
    if (contacts.length === 0) {
      console.log("[SyncService] No contacts to sync");
      return;
    }

    console.log(`[SyncService] Syncing ${contacts.length} contacts`);

    const reportable = contacts.map((c) => this.toMiddlewareContact(c));
    await this.reporter.reportContacts(reportable);

    console.log(`[SyncService] Contacts synced: ${reportable.length}`);
  }

  private async syncHistoryMessages(): Promise<void> {
    const cutoffTime =
      Date.now() - this.config.daysBack * 24 * 60 * 60 * 1000;
    const chats = this.waAdapter.getAllChats();

    const recentChats = chats.filter(
      (chat) => chat.t && chat.t * 1000 >= cutoffTime,
    );

    console.log(`[SyncService] Syncing history for ${recentChats.length} chats (last ${this.config.daysBack} days)`);

    for (let i = 0; i < recentChats.length; i++) {
      const chat = recentChats[i]!;
      try {
        await this.syncChatHistory(chat.id._serialized, cutoffTime);
        console.log(`[SyncService] Progress: ${i + 1}/${recentChats.length} chats`);
        await this.delay(this.config.delayBetweenBatches);
      } catch (error) {
        console.error(
          `[SyncService] Failed to sync history for chat ${chat.id._serialized}:`,
          error,
        );
      }
    }

    console.log(`[SyncService] History sync completed from ${recentChats.length} chats`);
  }

  private async syncChatHistory(
    chatId: string,
    cutoffTime: number,
  ): Promise<void> {
    const messages = this.waAdapter.getMessagesByChat(chatId);
    if (!messages || messages.length === 0) return;

    const recentMessages = messages.filter(
      (msg) => msg.t * 1000 >= cutoffTime,
    );
    if (recentMessages.length === 0) return;

    const reportable = recentMessages.map((msg) =>
      this.toMiddlewareMessage(msg),
    );

    const batchCount = Math.ceil(reportable.length / this.config.batchSize);

    console.log(`[SyncService] Syncing chat ${chatId}: ${reportable.length} messages (${batchCount} batches)`);

    for (let i = 0; i < reportable.length; i += this.config.batchSize) {
      const batch = reportable.slice(i, i + this.config.batchSize);
      await this.reporter.reportHistory(chatId, batch);
    }
  }

  private toMiddlewareConversation(chat: WAChat): MiddlewareConversation {
    const rawName = chat.contact?.name || "";
    const jidUser = chat.id._serialized.split("@")[0] || "";
    const name = (rawName && rawName !== jidUser && rawName !== chat.id._serialized && !/^\d{5,}$/.test(rawName))
      ? rawName
      : "";
    return {
      conversationId: chat.id._serialized,
      type: chat.id.server === "g.us" ? "group" : "private",
      title: name,
      avatar: chat.contact?.avatar,
      lastMessageTime: chat.t ? chat.t * 1000 : Date.now(),
      unreadCount: chat.unreadCount ?? 0,
      memberCount: chat.contact?.memberCount,
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
    const serialized = msg.id?._serialized ?? "";
    const fromMe = msg.id?.fromMe === true || serialized.startsWith("true_");
    return {
      messageId: serialized || msg.id?.id || "",
      chatId: msg.id?.remote ?? "",
      senderId: msg.author ?? msg.from ?? "",
      senderName: msg.notifyName || undefined,
      fromMe,
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
