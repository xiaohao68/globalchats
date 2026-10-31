import { create } from "zustand";
import { EPlatform } from "@gc/model";
import { createLogger } from "@gc/logger";
import type {
  ImtpWhatsappMessage,
  ImtpWhatsappConversation,
  ImtpWhatsappParticipant,
} from "@gc/api/gen/graphql";
import type { Account, Conversation, Message, Contact } from "../types";
import { MessageStatus, MessageDirection } from "../types";
import { notificationService } from "../services/notificationService";
import { useUIStore } from "./uiStore";

const logger = createLogger("aggregated-chat", "chat-store");

interface ChatState {
  accounts: Account[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  pendingMessages: Message[];
  isLoading: boolean;
  accountsState: "idle" | "loading" | "success" | "error";
  conversationsState: "idle" | "loading" | "success" | "error";
  messagesStateByConversationId: Record<
    string,
    "idle" | "loading" | "success" | "error"
  >;
  accountsError: string | null;
  conversationsError: string | null;
  messagesErrorByConversationId: Record<string, string | null>;
  lastSyncAt: number | null;
  searchQuery: string;

  // Actions
  setAccounts: (accounts: Account[]) => void;
  loadAccounts: () => Promise<void>;
  loadConversations: (accountId?: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<boolean>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  refreshAll: (opts?: { conversationId?: string | null }) => Promise<void>;
  getAccountById: (accountId: string) => Account | undefined;
  getPlatformByAccountId: (accountId: string) => EPlatform | undefined;
  setSearchQuery: (query: string) => void;
  getFilteredConversations: (filters?: {
    accountIds?: string[];
  }) => Conversation[];
  mergeImtpMessages: (params: {
    accountId: string;
    messages: ImtpWhatsappMessage[];
  }) => void;
  mergeImtpConversations: (params: {
    accountId: string;
    conversations: ImtpWhatsappConversation[];
  }) => void;
  mergeImtpParticipants: (params: {
    accountId: string;
    participants: ImtpWhatsappParticipant[];
  }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  accounts: [],
  contacts: [],
  conversations: [],
  messages: {},
  pendingMessages: [],
  isLoading: false,
  accountsState: "idle",
  conversationsState: "idle",
  messagesStateByConversationId: {},
  accountsError: null,
  conversationsError: null,
  messagesErrorByConversationId: {},
  lastSyncAt: null,
  searchQuery: "",

  setAccounts: (accounts: Account[]) => {
    set({ accounts, accountsState: "success" });
  },

  loadAccounts: async () => {
    set({ accountsState: "success" });
  },

  loadConversations: async (_accountId?: string) => {
    set({ conversationsState: "success" });
  },

  loadMessages: async (_conversationId: string) => {},

  loadMoreMessages: async (_conversationId: string) => {
    return false;
  },

  sendMessage: async (conversationId: string, content: string) => {
    const state = get();
    const conversation = state.conversations.find(
      (c) => c.id === conversationId,
    );
    if (!conversation) {
      logger.warn("sendMessage: conversation not found", { conversationId });
      return;
    }

    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const pendingMessage: Message = {
      id: tempId,
      conversationId,
      senderId: "me",
      content,
      timestamp: Date.now(),
      status: MessageStatus.Sending,
      direction: MessageDirection.Outgoing,
    };

    // 乐观更新
    const existingMessages = state.messages[conversationId] || [];
    set({
      messages: {
        ...state.messages,
        [conversationId]: [...existingMessages, pendingMessage],
      },
      pendingMessages: [...state.pendingMessages, pendingMessage],
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: content, lastActivityAt: Date.now() }
          : c,
      ),
    });

    // TODO: 调用服务端 API 发送消息（等服务端接口就绪后对接）
    // try {
    //   const result = await apiImtpWhatsappSendMessage({ ... });
    //   // 更新消息状态为 Sent
    // } catch (error) {
    //   // 更新消息状态为 Failed
    // }

    logger.debug("sendMessage: optimistic update", { conversationId, tempId });
    logger.warn("sendMessage: 服务端接口未就绪，消息已乐观更新但未实际发送");

    // 模拟发送成功
    setTimeout(() => {
      const currentState = get();
      const msgs = currentState.messages[conversationId] || [];
      set({
        messages: {
          ...currentState.messages,
          [conversationId]: msgs.map((m) =>
            m.id === tempId ? { ...m, status: MessageStatus.Sent } : m,
          ),
        },
        pendingMessages: currentState.pendingMessages.filter(
          (m) => m.id !== tempId,
        ),
      });
    }, 500);
  },

  refreshAll: async (_opts) => {
    const { syncNow } = await import("./syncStore").then((m) =>
      m.useSyncStore.getState(),
    );
    await syncNow();
  },

  getAccountById: (accountId: string) => {
    return get().accounts.find((a) => a.id === accountId);
  },

  getPlatformByAccountId: (accountId: string) => {
    return get().accounts.find((a) => a.id === accountId)?.platform;
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getFilteredConversations: (filters) => {
    const { conversations, searchQuery } = get();
    let filtered = conversations;

    const accountIds = filters?.accountIds ?? [];

    if (accountIds.length > 0) {
      const accountIdSet = new Set(accountIds);
      filtered = filtered.filter((conv) => accountIdSet.has(conv.accountId));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.contact.name.toLowerCase().includes(query) ||
          conv.lastMessage?.toLowerCase().includes(query),
      );
    }

    return filtered;
  },

  mergeImtpConversations: (params: {
    accountId: string;
    conversations: ImtpWhatsappConversation[];
  }) => {
    const { accountId, conversations: imtpConversations } = params;
    const state = get();
    logger.debug("mergeImtpConversations", { accountId, count: imtpConversations.length });

    const conversationsMap = new Map(
      state.conversations.map((c) => [c.id, c]),
    );
    const contactsMap = new Map(state.contacts.map((c) => [c.id, c]));

    for (const imtpConv of imtpConversations) {
      const conversationId = `${accountId}:${imtpConv.id}`;
      const data = (imtpConv.data || {}) as Record<string, any>;
      const jid = imtpConv.jid;
      const isGroup = jid.includes("@g.us");

      const contact: Contact = contactsMap.get(jid) || {
        id: jid,
        name: data.name || jid.split("@")[0] || jid,
        avatar: data.avatar,
        isGroup,
        memberCount: data.memberCount,
      };

      if (data.name) {
        contact.name = data.name;
      }
      if (data.avatar) {
        contact.avatar = data.avatar;
      }
      contactsMap.set(jid, contact);

      const existing = conversationsMap.get(conversationId);
      const oldUnread = existing?.unreadCount ?? 0;
      const newUnread = data.unreadCount ?? existing?.unreadCount ?? 0;
      if (newUnread < oldUnread) {
        notificationService.dismiss(conversationId);
      }
      conversationsMap.set(conversationId, {
        id: conversationId,
        accountId,
        jid,
        contact,
        lastMessage: data.lastMessage || existing?.lastMessage,
        lastActivityAt:
          data.lastMessageTime ||
          new Date(imtpConv.updatedAt).getTime() ||
          existing?.lastActivityAt ||
          0,
        unreadCount: data.unreadCount ?? existing?.unreadCount ?? 0,
      });
    }

    const sortedConversations = Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastActivityAt - a.lastActivityAt,
    );

    logger.info("mergeImtpConversations completed", {
      accountId,
      totalConversations: sortedConversations.length,
      totalContacts: contactsMap.size,
    });

    set({
      contacts: Array.from(contactsMap.values()),
      conversations: sortedConversations,
      conversationsState: "success",
    });
  },

  mergeImtpMessages: (params: {
    accountId: string;
    messages: ImtpWhatsappMessage[];
  }) => {
    const { accountId, messages: imtpMessages } = params;
    const state = get();
    logger.debug("mergeImtpMessages", { accountId, count: imtpMessages.length });

    const newMessages: Message[] = [];
    const conversationUpdates = new Map<
      string,
      { lastMessage: string; lastActivityAt: number }
    >();

    const existingConvIds = new Set(state.conversations.map((c) => c.id));
    const jidToConvIdMap = new Map<string, string>();
    for (const conv of state.conversations) {
      if (conv.accountId === accountId) {
        jidToConvIdMap.set(conv.jid, conv.id);
        if (conv.contact.id !== conv.jid) {
          jidToConvIdMap.set(conv.contact.id, conv.id);
        }
      }
    }

    for (const imtpMsg of imtpMessages) {
      const data = (imtpMsg.data || {}) as Record<string, any>;
      let conversationId = `${accountId}:${imtpMsg.imtpWhatsappConversationId}`;
      if (!existingConvIds.has(conversationId)) {
        const matchByJid = jidToConvIdMap.get(imtpMsg.imtpWhatsappConversationId)
          || jidToConvIdMap.get(imtpMsg.remoteJid);
        if (matchByJid) {
          conversationId = matchByJid;
        }
      }
      const timestamp =
        data.messageTimestamp || new Date(imtpMsg.createdAt).getTime();

      const direction = imtpMsg.fromMe
        ? MessageDirection.Outgoing
        : MessageDirection.Incoming;

      const senderId = imtpMsg.fromMe
        ? accountId
        : imtpMsg.participant || imtpMsg.remoteJid;

      const senderData = data.sender || {};
      const senderIdStr = senderData.id || senderId;
      const contactForSender = state.contacts.find((c) => c.id === senderIdStr);
      const rawName = senderData.name || contactForSender?.name;
      const isJidName = !rawName || rawName.includes("@");
      const senderName = isJidName
        ? contactForSender?.name?.split("@")[0] || senderIdStr.split("@")[0]
        : rawName;
      const senderAvatar = senderData.avatar || contactForSender?.avatar;

      const contentType = data.messageType || "";
      const content = data.content ||
        (contentType === "image" ? "[图片]" :
         contentType === "video" ? "[视频]" :
         contentType === "ptt" || contentType === "audio" ? "[语音]" :
         contentType === "document" ? "[文件]" :
         contentType === "sticker" ? "[贴纸]" :
         contentType === "location" ? "[位置]" :
         contentType === "vcard" ? "[名片]" :
         "");

      const message: Message = {
        id: imtpMsg.id,
        conversationId,
        senderId,
        senderName,
        senderAvatar,
        content,
        timestamp,
        status: MessageStatus.Sent,
        direction,
      };

      newMessages.push(message);

      const existing = conversationUpdates.get(conversationId);
      if (!existing || timestamp > existing.lastActivityAt) {
        conversationUpdates.set(conversationId, {
          lastMessage: content || "",
          lastActivityAt: timestamp,
        });
      }
    }

    const messagesMap = new Map<string, Message[]>(
      Object.entries(state.messages),
    );

    const deduped = newMessages.filter((msg) => {
      const existing = messagesMap.get(msg.conversationId) || [];
      return !existing.some((m) => m.id === msg.id);
    });

    for (const msg of newMessages) {
      const existing = messagesMap.get(msg.conversationId) || [];
      const exists = existing.some((m) => m.id === msg.id);

      if (!exists) {
        const merged = [...existing, msg].sort(
          (a, b) => a.timestamp - b.timestamp,
        );
        messagesMap.set(msg.conversationId, merged);
      }
    }

    const conversationsMap = new Map(
      state.conversations.map((c) => [c.id, c]),
    );

    for (const [conversationId, update] of conversationUpdates) {
      const existingConv = conversationsMap.get(conversationId);

      if (existingConv) {
        conversationsMap.set(conversationId, {
          ...existingConv,
          lastMessage: update.lastMessage || existingConv.lastMessage,
          lastActivityAt: Math.max(
            existingConv.lastActivityAt,
            update.lastActivityAt,
          ),
        });
      }
    }

    const sortedConversations = Array.from(conversationsMap.values()).sort(
      (a, b) => b.lastActivityAt - a.lastActivityAt,
    );

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

    logger.info("mergeImtpMessages completed", {
      accountId,
      incoming: imtpMessages.length,
      newMessages: deduped.length,
      skippedDuplicates: imtpMessages.length - deduped.length,
      conversationsUpdated: conversationUpdates.size,
    });

    set({
      messages: Object.fromEntries(messagesMap),
      conversations: sortedConversations,
      lastSyncAt: Date.now(),
    });
  },

  mergeImtpParticipants: (params: {
    accountId: string;
    participants: ImtpWhatsappParticipant[];
  }) => {
    const { participants: imtpParticipants } = params;
    const state = get();
    logger.debug("mergeImtpParticipants", { accountId: params.accountId, count: imtpParticipants.length });

    const contactsMap = new Map(state.contacts.map((c) => [c.id, c]));

    for (const participant of imtpParticipants) {
      const data = (participant.data || {}) as Record<string, any>;
      const jid = participant.jid;
      const lid = participant.lid;

      const contactInfo: Contact = {
        id: jid,
        name: data.name || contactsMap.get(jid)?.name || jid.split("@")[0] || jid,
        avatar: data.avatar || contactsMap.get(jid)?.avatar,
        isGroup: jid.includes("@g.us"),
        status: data.status,
      };

      contactsMap.set(jid, contactInfo);
      // LID 也指向同一个联系人，方便消息中用 LID 查找
      if (lid && lid !== jid) {
        contactsMap.set(lid, contactInfo);
      }
    }

    logger.info("mergeImtpParticipants completed", {
      accountId: params.accountId,
      totalContacts: contactsMap.size,
    });

    set({
      contacts: Array.from(contactsMap.values()),
    });

    // 更新对话中的联系人信息（保留 contact.id 不变，只更新 name/avatar）
    const conversations = get().conversations.map((conv) => {
      const updatedContact = contactsMap.get(conv.jid) || contactsMap.get(conv.contact.id);
      if (updatedContact && updatedContact.name && updatedContact.name !== conv.contact.name) {
        return {
          ...conv,
          contact: { ...conv.contact, name: updatedContact.name, avatar: updatedContact.avatar || conv.contact.avatar },
        };
      }
      return conv;
    });

    set({ conversations });
  },
}));
