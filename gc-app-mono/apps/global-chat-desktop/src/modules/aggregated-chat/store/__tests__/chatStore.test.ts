import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@gc/logger", () => ({
  createLogger: () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@gc/model", () => ({
  EPlatform: {
    Whatsapp: "whatsapp",
    Telegram: "telegram",
    Instagram: "instagram",
    Messenger: "messenger",
    Facebook: "facebook",
    Tiktok: "tiktok",
    Linkedin: "linkedin",
    Teams: "teams",
    Line: "line",
    Zalo: "zalo",
  },
}));

import { useChatStore } from "../chatStore";
import { MessageDirection, MessageStatus } from "../../types";
import type { ImtpWhatsappMessage, ImtpWhatsappConversation, ImtpWhatsappParticipant } from "@gc/api/gen/graphql";

describe("chatStore", () => {
  beforeEach(() => {
    useChatStore.setState({
      accounts: [],
      contacts: [],
      conversations: [],
      messages: {},
      pendingMessages: [],
      isLoading: false,
      lastSyncAt: null,
      searchQuery: "",
    });
  });

  describe("mergeImtpMessages", () => {
    it("should convert IMTP messages to internal format", () => {
      const imtpMessages: ImtpWhatsappMessage[] = [
        {
          id: "msg-1",
          messageId: "wa-msg-1",
          fromMe: false,
          remoteJid: "contact@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-1",
          data: { content: "Hello", messageTimestamp: 1700000000000, sender: { name: "Alice" } },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpMessages({
        accountId: "acc-1",
        messages: imtpMessages,
      });

      const state = useChatStore.getState();
      const convId = "acc-1:conv-1";
      const msgs = state.messages[convId];

      expect(msgs).toHaveLength(1);
      expect(msgs![0]!.direction).toBe(MessageDirection.Incoming);
      expect(msgs![0]!.content).toBe("Hello");
      expect(msgs![0]!.senderName).toBe("Alice");
    });

    it("should set direction=Outgoing when fromMe=true", () => {
      const imtpMessages: ImtpWhatsappMessage[] = [
        {
          id: "msg-2",
          messageId: "wa-msg-2",
          fromMe: true,
          remoteJid: "contact@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-1",
          data: { content: "Hi back" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpMessages({
        accountId: "acc-1",
        messages: imtpMessages,
      });

      const msgs = useChatStore.getState().messages["acc-1:conv-1"];
      expect(msgs![0]!.direction).toBe(MessageDirection.Outgoing);
    });

    it("should deduplicate messages by id", () => {
      const msg: ImtpWhatsappMessage = {
        id: "msg-dup",
        messageId: "wa-dup",
        fromMe: false,
        remoteJid: "c@s.whatsapp.net",
        imtpWhatsappAccountId: "acc-1",
        imtpWhatsappConversationId: "conv-1",
        data: { content: "Dup" },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      useChatStore.getState().mergeImtpMessages({ accountId: "acc-1", messages: [msg] });
      useChatStore.getState().mergeImtpMessages({ accountId: "acc-1", messages: [msg] });

      const msgs = useChatStore.getState().messages["acc-1:conv-1"];
      expect(msgs).toHaveLength(1);
    });

    it("should store messages even if conversation was not loaded yet", () => {
      const msg: ImtpWhatsappMessage = {
        id: "msg-new",
        messageId: "wa-new",
        fromMe: false,
        remoteJid: "new-contact@s.whatsapp.net",
        imtpWhatsappAccountId: "acc-1",
        imtpWhatsappConversationId: "conv-new",
        data: { content: "New chat", messageTimestamp: 1700000000000 },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      useChatStore.getState().mergeImtpMessages({ accountId: "acc-1", messages: [msg] });

      const msgs = useChatStore.getState().messages["acc-1:conv-new"];
      expect(msgs).toHaveLength(1);
      expect(msgs![0]!.content).toBe("New chat");
    });

    it("should sort messages by timestamp", () => {
      const imtpMessages: ImtpWhatsappMessage[] = [
        {
          id: "msg-late",
          messageId: "wa-late",
          fromMe: false,
          remoteJid: "c@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-1",
          data: { content: "Late", messageTimestamp: 1700000002000 },
          createdAt: "2024-01-01T00:00:02Z",
          updatedAt: "2024-01-01T00:00:02Z",
        },
        {
          id: "msg-early",
          messageId: "wa-early",
          fromMe: false,
          remoteJid: "c@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-1",
          data: { content: "Early", messageTimestamp: 1700000000000 },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "msg-mid",
          messageId: "wa-mid",
          fromMe: false,
          remoteJid: "c@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-1",
          data: { content: "Mid", messageTimestamp: 1700000001000 },
          createdAt: "2024-01-01T00:00:01Z",
          updatedAt: "2024-01-01T00:00:01Z",
        },
      ];

      useChatStore.getState().mergeImtpMessages({ accountId: "acc-1", messages: imtpMessages });

      const msgs = useChatStore.getState().messages["acc-1:conv-1"]!;
      expect(msgs).toHaveLength(3);
      expect(msgs[0]!.content).toBe("Early");
      expect(msgs[1]!.content).toBe("Mid");
      expect(msgs[2]!.content).toBe("Late");
    });

    it("should merge messages for multiple conversations simultaneously", () => {
      const imtpMessages: ImtpWhatsappMessage[] = [
        {
          id: "msg-c1",
          messageId: "wa-c1",
          fromMe: false,
          remoteJid: "alice@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-1",
          data: { content: "Hello from conv-1" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "msg-c2",
          messageId: "wa-c2",
          fromMe: false,
          remoteJid: "bob@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-2",
          data: { content: "Hello from conv-2" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpMessages({ accountId: "acc-1", messages: imtpMessages });

      const state = useChatStore.getState();
      expect(state.messages["acc-1:conv-1"]).toHaveLength(1);
      expect(state.messages["acc-1:conv-2"]).toHaveLength(1);
    });

    it("should update existing conversation lastMessage and lastActivityAt", () => {
      useChatStore.setState({
        conversations: [
          {
            id: "acc-1:conv-1",
            accountId: "acc-1",
            jid: "alice@s.whatsapp.net",
            contact: { id: "alice@s.whatsapp.net", name: "Alice", isGroup: false },
            lastMessage: "Old message",
            lastActivityAt: 1700000000000,
            unreadCount: 0,
          },
        ],
      });

      const imtpMessages: ImtpWhatsappMessage[] = [
        {
          id: "msg-new",
          messageId: "wa-new",
          fromMe: false,
          remoteJid: "alice@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-1",
          data: { content: "New message", messageTimestamp: 1700000005000 },
          createdAt: "2024-01-01T00:00:05Z",
          updatedAt: "2024-01-01T00:00:05Z",
        },
      ];

      useChatStore.getState().mergeImtpMessages({ accountId: "acc-1", messages: imtpMessages });

      const conv = useChatStore.getState().conversations.find((c) => c.id === "acc-1:conv-1")!;
      expect(conv.lastMessage).toBe("New message");
      expect(conv.lastActivityAt).toBe(1700000005000);
    });

    it("should use participant field as senderId for group messages", () => {
      const imtpMessages: ImtpWhatsappMessage[] = [
        {
          id: "msg-group",
          messageId: "wa-group",
          fromMe: false,
          remoteJid: "group@g.us",
          participant: "member@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          imtpWhatsappConversationId: "conv-group",
          data: { content: "Group msg", sender: { name: "Member" } },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpMessages({ accountId: "acc-1", messages: imtpMessages });

      const msgs = useChatStore.getState().messages["acc-1:conv-group"]!;
      expect(msgs[0]!.senderId).toBe("member@s.whatsapp.net");
      expect(msgs[0]!.senderName).toBe("Member");
    });
  });

  describe("mergeImtpConversations", () => {
    it("should merge conversations and create contacts", () => {
      const convs: ImtpWhatsappConversation[] = [
        {
          id: "conv-1",
          jid: "alice@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Alice", unreadCount: 3 },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpConversations({
        accountId: "acc-1",
        conversations: convs,
      });

      const state = useChatStore.getState();
      expect(state.conversations).toHaveLength(1);
      expect(state.conversations[0]!.contact.name).toBe("Alice");
      expect(state.conversations[0]!.unreadCount).toBe(3);
      expect(state.contacts).toHaveLength(1);
      expect(state.contacts[0]!.id).toBe("alice@s.whatsapp.net");
    });

    it("should detect group chats by JID", () => {
      const convs: ImtpWhatsappConversation[] = [
        {
          id: "conv-g",
          jid: "group@g.us",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Team Chat" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpConversations({
        accountId: "acc-1",
        conversations: convs,
      });

      expect(useChatStore.getState().contacts[0]!.isGroup).toBe(true);
    });

    it("should update existing conversation instead of creating new one", () => {
      useChatStore.setState({
        conversations: [
          {
            id: "acc-1:conv-1",
            accountId: "acc-1",
            jid: "alice@s.whatsapp.net",
            contact: { id: "alice@s.whatsapp.net", name: "Alice", isGroup: false },
            lastMessage: "Old msg",
            lastActivityAt: 1700000000000,
            unreadCount: 1,
          },
        ],
        contacts: [{ id: "alice@s.whatsapp.net", name: "Alice", isGroup: false }],
      });

      const convs: ImtpWhatsappConversation[] = [
        {
          id: "conv-1",
          jid: "alice@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Alice Updated", unreadCount: 5, lastMessage: "Updated msg" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpConversations({ accountId: "acc-1", conversations: convs });

      const state = useChatStore.getState();
      expect(state.conversations).toHaveLength(1);
      expect(state.conversations[0]!.contact.name).toBe("Alice Updated");
      expect(state.conversations[0]!.unreadCount).toBe(5);
      expect(state.conversations[0]!.lastMessage).toBe("Updated msg");
    });

    it("should merge multiple conversations at once", () => {
      const convs: ImtpWhatsappConversation[] = [
        {
          id: "conv-1",
          jid: "alice@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Alice" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "conv-2",
          jid: "bob@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Bob" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "conv-3",
          jid: "charlie@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Charlie" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpConversations({ accountId: "acc-1", conversations: convs });

      const state = useChatStore.getState();
      expect(state.conversations).toHaveLength(3);
      expect(state.contacts).toHaveLength(3);
    });

    it("should sort conversations by lastActivityAt descending", () => {
      const convs: ImtpWhatsappConversation[] = [
        {
          id: "conv-old",
          jid: "old@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Old", lastMessageTime: 1700000001000 },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "conv-new",
          jid: "new@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "New", lastMessageTime: 1700000005000 },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "conv-mid",
          jid: "mid@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Mid", lastMessageTime: 1700000003000 },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpConversations({ accountId: "acc-1", conversations: convs });

      const state = useChatStore.getState();
      expect(state.conversations[0]!.contact.name).toBe("New");
      expect(state.conversations[1]!.contact.name).toBe("Mid");
      expect(state.conversations[2]!.contact.name).toBe("Old");
    });
  });

  describe("mergeImtpParticipants", () => {
    it("should merge participants as contacts (JID + LID alias in map)", () => {
      const participants: ImtpWhatsappParticipant[] = [
        {
          id: "p-1",
          lid: "alice@lid",
          jid: "alice@s.whatsapp.net",
          imtpWhatsappAccountId: "acc-1",
          data: { name: "Alice", avatar: "https://example.com/alice.jpg" },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      useChatStore.getState().mergeImtpParticipants({
        accountId: "acc-1",
        participants,
      });

      const contacts = useChatStore.getState().contacts;
      // JID + LID alias both stored in contacts map (both have id=jid)
      expect(contacts).toHaveLength(2);
      const aliceByJid = contacts.find((c) => c.id === "alice@s.whatsapp.net");
      expect(aliceByJid!.name).toBe("Alice");
      expect(aliceByJid!.avatar).toBe("https://example.com/alice.jpg");
    });

    it("should update existing contact names", () => {
      useChatStore.setState({
        contacts: [{ id: "alice@s.whatsapp.net", name: "Unknown", isGroup: false }],
        conversations: [
          {
            id: "acc-1:conv-1",
            accountId: "acc-1",
            jid: "alice@s.whatsapp.net",
            contact: { id: "alice@s.whatsapp.net", name: "Unknown", isGroup: false },
            lastActivityAt: 0,
            unreadCount: 0,
          },
        ],
      });

      useChatStore.getState().mergeImtpParticipants({
        accountId: "acc-1",
        participants: [
          {
            id: "p-1",
            lid: "alice@lid",
            jid: "alice@s.whatsapp.net",
            imtpWhatsappAccountId: "acc-1",
            data: { name: "Alice Chen" },
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const state = useChatStore.getState();
      expect(state.contacts[0]!.name).toBe("Alice Chen");
      expect(state.conversations[0]!.contact.name).toBe("Alice Chen");
    });

    it("should preserve existing contact avatar when new data has no avatar", () => {
      useChatStore.setState({
        contacts: [
          { id: "alice@s.whatsapp.net", name: "Alice", avatar: "https://example.com/old-avatar.jpg", isGroup: false },
        ],
      });

      useChatStore.getState().mergeImtpParticipants({
        accountId: "acc-1",
        participants: [
          {
            id: "p-1",
            lid: "alice@lid",
            jid: "alice@s.whatsapp.net",
            imtpWhatsappAccountId: "acc-1",
            data: { name: "Alice Updated" },
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const contact = useChatStore.getState().contacts[0]!;
      expect(contact.name).toBe("Alice Updated");
      expect(contact.avatar).toBe("https://example.com/old-avatar.jpg");
    });

    it("should not affect existing data when participants list is empty", () => {
      useChatStore.setState({
        contacts: [
          { id: "alice@s.whatsapp.net", name: "Alice", isGroup: false },
          { id: "bob@s.whatsapp.net", name: "Bob", isGroup: false },
        ],
      });

      useChatStore.getState().mergeImtpParticipants({
        accountId: "acc-1",
        participants: [],
      });

      const contacts = useChatStore.getState().contacts;
      expect(contacts).toHaveLength(2);
      expect(contacts[0]!.name).toBe("Alice");
      expect(contacts[1]!.name).toBe("Bob");
    });
  });

  describe("sendMessage", () => {
    it("should optimistically add message", async () => {
      useChatStore.setState({
        conversations: [
          {
            id: "conv-1",
            accountId: "acc-1",
            jid: "c1",
            contact: { id: "c1", name: "Alice", isGroup: false },
            lastActivityAt: 0,
            unreadCount: 0,
          },
        ],
      });

      await useChatStore.getState().sendMessage("conv-1", "Test message");

      const state = useChatStore.getState();
      const msgs = state.messages["conv-1"];
      expect(msgs).toHaveLength(1);
      expect(msgs![0]!.content).toBe("Test message");
      expect(msgs![0]!.direction).toBe(MessageDirection.Outgoing);
      expect(msgs![0]!.status).toBe(MessageStatus.Sending);
    });

    it("should not send when conversation does not exist", async () => {
      await useChatStore.getState().sendMessage("non-existent", "Test");

      const state = useChatStore.getState();
      expect(state.messages["non-existent"]).toBeUndefined();
      expect(state.pendingMessages).toHaveLength(0);
    });

    it("should transition message status from Sending to Sent after 500ms", async () => {
      vi.useFakeTimers();

      useChatStore.setState({
        conversations: [
          {
            id: "conv-1",
            accountId: "acc-1",
            jid: "c1",
            contact: { id: "c1", name: "Alice", isGroup: false },
            lastActivityAt: 0,
            unreadCount: 0,
          },
        ],
      });

      await useChatStore.getState().sendMessage("conv-1", "Timer test");

      const msgsBefore = useChatStore.getState().messages["conv-1"]!;
      expect(msgsBefore[0]!.status).toBe(MessageStatus.Sending);
      expect(useChatStore.getState().pendingMessages).toHaveLength(1);

      vi.advanceTimersByTime(500);

      const msgsAfter = useChatStore.getState().messages["conv-1"]!;
      expect(msgsAfter[0]!.status).toBe(MessageStatus.Sent);
      expect(useChatStore.getState().pendingMessages).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe("getFilteredConversations", () => {
    it("should filter by accountIds", () => {
      useChatStore.setState({
        conversations: [
          { id: "c1", accountId: "acc-1", jid: "x", contact: { id: "x", name: "A", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
          { id: "c2", accountId: "acc-2", jid: "y", contact: { id: "y", name: "B", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
        ],
      });

      const filtered = useChatStore.getState().getFilteredConversations({ accountIds: ["acc-1"] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.accountId).toBe("acc-1");
    });

    it("should filter by search query", () => {
      useChatStore.setState({
        conversations: [
          { id: "c1", accountId: "acc-1", jid: "x", contact: { id: "x", name: "Alice", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
          { id: "c2", accountId: "acc-1", jid: "y", contact: { id: "y", name: "Bob", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
        ],
        searchQuery: "alice",
      });

      const filtered = useChatStore.getState().getFilteredConversations();
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.contact.name).toBe("Alice");
    });

    it("should filter by both accountIds and searchQuery", () => {
      useChatStore.setState({
        conversations: [
          { id: "c1", accountId: "acc-1", jid: "x", contact: { id: "x", name: "Alice", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
          { id: "c2", accountId: "acc-2", jid: "y", contact: { id: "y", name: "Alice B", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
          { id: "c3", accountId: "acc-1", jid: "z", contact: { id: "z", name: "Bob", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
        ],
        searchQuery: "alice",
      });

      const filtered = useChatStore.getState().getFilteredConversations({ accountIds: ["acc-1"] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe("c1");
    });

    it("should return all conversations when accountIds is empty", () => {
      useChatStore.setState({
        conversations: [
          { id: "c1", accountId: "acc-1", jid: "x", contact: { id: "x", name: "A", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
          { id: "c2", accountId: "acc-2", jid: "y", contact: { id: "y", name: "B", isGroup: false }, lastActivityAt: 0, unreadCount: 0 },
        ],
      });

      const filtered = useChatStore.getState().getFilteredConversations({ accountIds: [] });
      expect(filtered).toHaveLength(2);
    });

    it("should search by lastMessage content", () => {
      useChatStore.setState({
        conversations: [
          { id: "c1", accountId: "acc-1", jid: "x", contact: { id: "x", name: "Alice", isGroup: false }, lastMessage: "Hello world", lastActivityAt: 0, unreadCount: 0 },
          { id: "c2", accountId: "acc-1", jid: "y", contact: { id: "y", name: "Bob", isGroup: false }, lastMessage: "Goodbye", lastActivityAt: 0, unreadCount: 0 },
        ],
        searchQuery: "hello",
      });

      const filtered = useChatStore.getState().getFilteredConversations();
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe("c1");
    });
  });

  describe("setAccounts", () => {
    it("should set accounts list and update accountsState", () => {
      const accounts = [
        { id: "acc-1", name: "WhatsApp Account", platform: "whatsapp" as any, isActive: true },
        { id: "acc-2", name: "Telegram Account", platform: "telegram" as any, isActive: true },
      ];

      useChatStore.getState().setAccounts(accounts);

      const state = useChatStore.getState();
      expect(state.accounts).toHaveLength(2);
      expect(state.accounts[0]!.id).toBe("acc-1");
      expect(state.accounts[1]!.name).toBe("Telegram Account");
      expect(state.accountsState).toBe("success");
    });
  });

});
