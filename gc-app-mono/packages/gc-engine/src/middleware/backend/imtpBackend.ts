import {
  apiImtpWhatsappPushMessages,
  apiImtpWhatsappPushConversations,
  apiImtpWhatsappPushParticipants,
  apiImtpWhatsappPushAccounts,
  apiImtpWhatsappConnectionConversations,
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
import type { ImtpUpsertMessageInput } from "@gc/api/gen/graphql";
import { createLogger } from "@gc/logger";
import { userStore } from "@gc/store";

const logger = createLogger("whatsapp", "imtp-backend");

// IMTP 设备信息
export interface ImtpDeviceInfo {
  platform: string;
  version: string;
}

/**
 * IMTP Backend 实现
 * 用于 WhatsApp 平台的 IMTP 协议上报
 */
export class ImtpBackend implements BackendApi {
  private currentUserId: string = "";
  private currentAccountId: string = "";
  private conversationJidToIdMap: Map<string, string> = new Map();

  constructor(_deviceInfo?: ImtpDeviceInfo) {
    // deviceInfo 保留用于未来扩展
  }

  setCurrentUser(userId: string): void {
    this.currentUserId = userId;
    logger.debug("setCurrentUser", { userId });
  }

  setCurrentAccountId(accountId: string): void {
    this.currentAccountId = accountId;
    logger.debug("setCurrentAccountId", { accountId });
  }

  getCurrentAccountId(): string {
    return this.currentAccountId;
  }

  private getConversationId(jid: string): string {
    return this.conversationJidToIdMap.get(jid) || jid;
  }

  private async refreshConversationMapping(): Promise<void> {
    if (!this.currentAccountId) return;

    this.conversationJidToIdMap.clear();
    let after: string | undefined;

    while (true) {
      const result = await apiImtpWhatsappConnectionConversations({
        accountId: this.currentAccountId,
        first: 100,
        ...(after ? { after } : {}),
      });

      for (const edge of result.edges) {
        this.conversationJidToIdMap.set(edge.jid, edge.nodeId);
      }

      if (!result.pageInfo.hasNextPage) break;
      after = result.pageInfo.endCursor ?? undefined;
    }

    logger.info("Refreshed conversation JID→ID mapping", {
      count: this.conversationJidToIdMap.size,
    });
  }

  // ========== BackendApi 实现 ==========

  private getJwtSub(): string | undefined {
    try {
      const token = userStore.userInfo.accessToken;
      if (!token) return undefined;
      const payload = token.split(".")[1];
      if (!payload) return undefined;
      const decoded = JSON.parse(atob(payload));
      return decoded.sub;
    } catch {
      return undefined;
    }
  }

  async pushCurrentUser(
    _scope: SourceScope,
    user: MiddlewareUser,
  ): Promise<BackendReportSummary> {
    const jwtSub = this.getJwtSub();
    const imUserId = userStore.userInfo.id;
    const hasToken = !!userStore.userInfo.accessToken;
    logger.info("Pushing current user", {
      userId: user.id,
      nickname: user.nickname,
      phone: user.phone,
      imUserId,
      jwtSub,
      hasToken,
    });

    try {
      // 构建 data 对象，只包含有值的字段
      const data: Record<string, unknown> = {};
      if (user.nickname) data.name = user.nickname;
      if (user.avatar) data.avatar = user.avatar;
      if (user.phone) data.phone = user.phone;

      const result = await apiImtpWhatsappPushAccounts({
        hijackImUserId: jwtSub || imUserId,
        assignImUserId: jwtSub || imUserId,
        accounts: [{
          lid: user.id,
          jid: user.id,
          data: Object.keys(data).length > 0 ? data : undefined,
        }],
      });

      if (result.successCount > 0 && result.results[0]?.account) {
        this.currentAccountId = result.results[0].account.id;
        this.currentUserId = user.id;
        logger.info("Account registered", { accountId: this.currentAccountId });
      }

      return { acceptedCount: result.successCount };
    } catch (error) {
      const errDetail = error instanceof Error ? {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        source: (error as any).source,
        context: (error as any).context,
      } : String(error);
      logger.error("Failed to push current user", { error: errDetail, userId: user.id });
      return { acceptedCount: 0 };
    }
  }

  async pushStatusEvent(
    _scope: SourceScope,
    _event: MiddlewareStatusEvent,
  ): Promise<BackendReportSummary> {
    // 状态事件暂不上报
    return { acceptedCount: 1 };
  }

  async pushContacts(
    _scope: SourceScope,
    contacts: MiddlewareContact[],
  ): Promise<BackendReportSummary> {
    if (contacts.length === 0) {
      return { acceptedCount: 0 };
    }

    if (!this.currentAccountId) {
      throw new Error("No accountId set, cannot push contacts. User registration may not be complete.");
    }

    logger.info("Pushing contacts as participants", { count: contacts.length });

    const participants = contacts.map((contact) => ({
      jid: contact.contactId,
      lid: contact.contactId,
      data: {
        name: contact.nickname,
        avatar: contact.avatar,
        phone: contact.phone,
      },
    }));

    const result = await apiImtpWhatsappPushParticipants({
      imtpWhatsappAccountId: this.currentAccountId,
      participants,
    });

    const accepted = result.inserted + result.updated;
    logger.info("Push participants result", { accepted, inserted: result.inserted, updated: result.updated });

    return {
      acceptedCount: accepted,
    };
  }

  async pushConversations(
    _scope: SourceScope,
    conversations: MiddlewareConversation[],
  ): Promise<BackendReportSummary> {
    if (conversations.length === 0) {
      return { acceptedCount: 0 };
    }

    if (!this.currentAccountId) {
      throw new Error("No accountId set, cannot push conversations. User registration may not be complete.");
    }

    logger.info("Pushing conversations", { count: conversations.length });

    // 调试：打印前5个会话的 title
    for (const conv of conversations.slice(0, 5)) {
      logger.info("Conv debug", { jid: conv.conversationId, title: conv.title, avatar: conv.avatar ? "yes" : "no" });
    }

    const result = await apiImtpWhatsappPushConversations({
      imtpWhatsappAccountId: this.currentAccountId,
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
      })),
    });

    const accepted = result.inserted + result.updated;
    logger.info("Push conversations result", { accepted, inserted: result.inserted, updated: result.updated, skipped: result.skipped, failed: result.failed });
    if (result.failed > 0) {
      logger.error("Push conversations had failures", { failedJids: result.failedJids });
    }

    await this.refreshConversationMapping();

    return {
      acceptedCount: accepted,
    };
  }

  async pushMessages(
    _scope: SourceScope,
    messages: MiddlewareMessage[],
  ): Promise<BackendReportSummary> {
    if (messages.length === 0) {
      return { acceptedCount: 0 };
    }

    if (!this.currentAccountId) {
      throw new Error("No accountId set, cannot push messages. User registration may not be complete.");
    }

    // 按 chatId 分组消息
    const groupedByChat = this.groupMessagesByChat(messages);
    const chatCount = Object.keys(groupedByChat).length;
    logger.info("Pushing messages", { count: messages.length, chatCount });

    let totalAccepted = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const [chatId, chatMessages] of Object.entries(groupedByChat)) {
      try {
        const conversationId = this.getConversationId(chatId);
        if (conversationId === chatId) {
          logger.warn("No server-side ID found for conversation JID, using JID as fallback", { chatId });
        }
        const result = await apiImtpWhatsappPushMessages({
          imtpWhatsappAccountId: this.currentAccountId,
          imtpWhatsappConversationId: conversationId,
          messages: chatMessages.map((msg) => this.toImtpMessageInput(msg)),
        });

        totalAccepted += result.inserted + result.updated;
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;

        if (result.failed > 0) {
          logger.error("Failed to push messages", { chatId, failed: result.failed });
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error("pushMessages API call failed", { chatId, error: errMsg });
        throw error;
      }
    }

    logger.info("Push messages result", { accepted: totalAccepted, inserted: totalInserted, updated: totalUpdated, skipped: totalSkipped });
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

    if (!this.currentAccountId) {
      throw new Error("No accountId set, cannot push history. User registration may not be complete.");
    }

    const serverConvId = this.getConversationId(conversationId);
    logger.info("Pushing history messages", { conversationId, serverConvId, count: messages.length });

    const result = await apiImtpWhatsappPushMessages({
      imtpWhatsappAccountId: this.currentAccountId,
      imtpWhatsappConversationId: serverConvId,
      messages: messages.map((msg) => this.toImtpMessageInput(msg)),
    });

    const accepted = result.inserted + result.updated;
    logger.info("Push history result", { accepted, inserted: result.inserted, updated: result.updated, skipped: result.skipped });

    return {
      acceptedCount: accepted,
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

    logger.debug("groupMessagesByChat", { totalMessages: messages.length, chatCount: Object.keys(grouped).length });
    return grouped;
  }

  private getContentForType(msg: MiddlewareMessage): string {
    const placeholders: Record<string, string> = {
      image: "[图片]",
      video: "[视频]",
      audio: "[语音]",
      ptt: "[语音]",
      document: "[文件]",
      sticker: "[贴纸]",
      vcard: "[名片]",
      location: "[位置]",
      revoked: "[已撤回]",
      gp2: "[群通知]",
      e2e_notification: "[加密通知]",
      notification_template: "[通知]",
      call_log: "[通话]",
      protocol: "[协议消息]",
      ciphertext: "[加密消息]",
    };
    if (placeholders[msg.messageType]) {
      return placeholders[msg.messageType];
    }
    return msg.content;
  }

  private toImtpMessageInput(msg: MiddlewareMessage): ImtpUpsertMessageInput {
    const content = this.getContentForType(msg);
    const input = {
      messageId: msg.messageId,
      fromMe: msg.fromMe ?? false,
      remoteJid: msg.chatId,
      participant: msg.chatId.includes("@g.us") ? msg.senderId : undefined,
      data: {
        messageTimestamp: msg.timestamp,
        content,
        sender: {
          id: msg.senderId,
          name: msg.senderName || undefined,
        },
        messageType: msg.messageType,
      },
    };
    logger.debug("toImtpMessageInput", { messageId: msg.messageId, fromMe: input.fromMe, isGroup: !!input.participant });
    return input;
  }
}
