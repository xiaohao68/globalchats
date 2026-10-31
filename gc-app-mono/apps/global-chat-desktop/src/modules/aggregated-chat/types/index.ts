import { EPlatform } from "@gc/model";

// ==================== 账号 ====================
export interface Account {
  id: string;
  name: string;
  platform: EPlatform;
  avatar?: string;
  isActive: boolean;
}

// ==================== 用户状态 ====================
export type UserStatus = "online" | "offline" | "idle" | "dnd";

export const UserStatusConfig: Record<
  UserStatus,
  { color: string; label: string }
> = {
  online: { color: "bg-green-500", label: "在线" },
  offline: { color: "bg-gray-400", label: "离线" },
  idle: { color: "bg-yellow-400", label: "离开" },
  dnd: { color: "bg-red-500", label: "勿扰" },
};

// ==================== 联系人 ====================
export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  isGroup: boolean;
  status?: UserStatus;
  /** 群成员数（仅群聊） */
  memberCount?: number;
  /** 在线成员数（仅群聊） */
  onlineCount?: number;
}

// ==================== 对话 ====================
export interface Conversation {
  id: string;
  accountId: string;
  /** 原始 JID（会话标识符，不可变） */
  jid: string;
  contact: Contact;
  lastMessage?: string;
  lastActivityAt: number;
  unreadCount: number;
}

// ==================== 消息 ====================
export enum MessageStatus {
  Sending = "sending",
  Sent = "sent",
  Delivered = "delivered",
  Read = "read",
  Failed = "failed",
}

export enum MessageDirection {
  Incoming = "incoming",
  Outgoing = "outgoing",
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  /** 发送者名称（群聊显示用） */
  senderName?: string;
  /** 发送者头像（群聊显示用） */
  senderAvatar?: string;
  content: string;
  timestamp: number;
  status: MessageStatus;
  direction: MessageDirection;
}

/** 平台配置 */
export interface PlatformConfig {
  id: EPlatform;
  name: string;
  icon: string;
  color: string;
}

// ==================== API 服务接口 ====================
export interface ChatService {
  getAccounts(): Promise<Account[]>;

  getConversations(params: {
    accountId?: string;
    limit?: number;
    offset?: number;
    updatedAfter?: number; // 新增：增量查询时间戳
  }): Promise<{
    conversations: Conversation[];
    total: number;
    hasMore: boolean;
  }>;

  getMessages(params: {
    conversationId: string;
    limit?: number;
    beforeTimestamp?: number;
  }): Promise<{
    messages: Message[];
    hasMore: boolean;
  }>;

  sendMessage(params: {
    conversationId: string;
    content: string;
  }): Promise<Message>;
}
