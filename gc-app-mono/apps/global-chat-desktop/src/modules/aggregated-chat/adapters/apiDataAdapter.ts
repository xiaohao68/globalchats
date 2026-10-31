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
    jid: raw.contactId,
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
