import type { IThirdAppUserInfo } from "@gc/model";
import type { BaseAdapter } from "./baseAdapter.ts";
import type {
  MiddlewareContact,
  MiddlewareConversation,
  MiddlewareMessage,
  MiddlewareUser,
  ConversationType,
} from "../types.ts";
import type {
  WAUserInfo,
  WAContact,
  WAChat,
  WAMessage,
  WAHistoryMessage,
} from "../../apps/whatsapp/sdk/types/index.ts";

function isGroupId(userId: string): boolean {
  return userId.endsWith("@g.us");
}

function isJid(value: string): boolean {
  return /^\d{5,}$/.test(value);
}

function filterJidName(name: string | undefined, jidUser: string): string {
  if (!name || name === jidUser || isJid(name)) return "";
  return name;
}

export class WhatsappAdapter
  implements
    BaseAdapter<
      WAUserInfo,
      WAContact,
      WAChat,
      WAMessage | WAHistoryMessage
    >
{
  toMiddlewareUser(user: WAUserInfo): MiddlewareUser {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      isGroup: false,
      phone: user.phone,
      remarkName: user.remarkName,
      version: 1,
      updatedAt: Date.now(),
    };
  }

  toMiddlewareContact(contact: WAContact): MiddlewareContact {
    return {
      contactId: contact.id._serialized,
      nickname: contact.name,
      avatar: contact.avatar,
      phone: contact.phone,
      version: 1,
      updatedAt: Date.now(),
    };
  }

  toMiddlewareConversation(chat: WAChat): MiddlewareConversation {
    const isGroup = isGroupId(chat.id._serialized);
    const type: ConversationType = isGroup ? "group" : "private";

    return {
      conversationId: chat.id._serialized,
      type,
      title: filterJidName(chat.contact?.name, chat.id.user),
      avatar: chat.contact?.avatar,
      lastMessageTime: chat.t ? chat.t * 1000 : undefined,
      unreadCount: chat.unreadCount,
      memberCount: chat.contact?.memberCount,
      version: 1,
      updatedAt: Date.now(),
    };
  }

  toMiddlewareMessage(msg: WAMessage | WAHistoryMessage): MiddlewareMessage {
    const timestampMs =
      "clientReceivedTsMillis" in msg && msg.clientReceivedTsMillis
        ? msg.clientReceivedTsMillis
        : msg.t * 1000;

    const senderId = "author" in msg && msg.author ? msg.author : msg.from;
    const serialized = msg.id._serialized ?? "";
    const fromMe = msg.id.fromMe === true || serialized.startsWith("true_");

    return {
      messageId: serialized || msg.id.id,
      chatId: msg.id.remote,
      senderId,
      senderName: (msg as any).notifyName || undefined,
      fromMe,
      content: msg.body ?? "",
      timestamp: timestampMs,
      messageType: msg.type ?? "unknown",
      version: 1,
      updatedAt: timestampMs,
    };
  }

  toThirdAppUserInfo(user: WAUserInfo): IThirdAppUserInfo {
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      isGroup: false,
      phone: user.phone,
      remarkName: user.remarkName,
    };
  }

  toMiddlewareContactFromChat(chat: WAChat): MiddlewareContact {
    const isGroup = isGroupId(chat.id._serialized);
    return {
      contactId: chat.id._serialized,
      nickname: filterJidName(chat.contact?.name, chat.id.user),
      avatar: chat.contact?.avatar,
      phone: isGroup ? undefined : chat.id.user,
      version: 1,
      updatedAt: Date.now(),
    };
  }
}

export const whatsappAdapter = new WhatsappAdapter();
