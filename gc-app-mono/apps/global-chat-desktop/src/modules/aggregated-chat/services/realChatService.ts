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
      // 从 conversationId 提取 accountId（假设格式包含 accountId）
      // 实际实现可能需要从 store 获取
      const accountId = params.conversationId.split("_")[0] || "";

      const data = await apiGetChatMessages({
        accountId,
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
