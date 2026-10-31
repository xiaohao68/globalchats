import { describe, it, expect, vi, beforeEach } from "vitest";
import { ImtpBackend } from "../imtpBackend";
import type { SourceScope, MiddlewareMessage, MiddlewareContact, MiddlewareConversation } from "../../types";

vi.mock("@gc/api", () => ({
  apiImtpWhatsappPushMessages: vi.fn(),
  apiImtpWhatsappPushConversations: vi.fn(),
  apiImtpWhatsappPushParticipants: vi.fn(),
  apiImtpWhatsappPushAccounts: vi.fn(),
  apiImtpWhatsappConnectionConversations: vi.fn(),
}));

vi.mock("@gc/logger", () => ({
  createLogger: () => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  apiImtpWhatsappPushMessages,
  apiImtpWhatsappPushConversations,
  apiImtpWhatsappPushParticipants,
  apiImtpWhatsappPushAccounts,
  apiImtpWhatsappConnectionConversations,
} from "@gc/api";

const mockScope: SourceScope = {
  appId: "test-app",
  platform: "whatsapp" as any,
  webviewId: "test-webview",
};

const mockPushResult = { inserted: 1, updated: 0, skipped: 0, failed: 0, failedKeyIds: [] };
const mockConvResult = { inserted: 1, updated: 0, skipped: 0, failed: 0, failedJids: [] };
const mockParticipantResult = { inserted: 1, updated: 0, skipped: 0, failed: 0, failedLids: [] };

describe("ImtpBackend", () => {
  let backend: ImtpBackend;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new ImtpBackend();
    vi.mocked(apiImtpWhatsappConnectionConversations).mockResolvedValue({
      edges: [],
      totalCount: 0,
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
    } as any);
  });

  describe("toImtpMessageInput (via pushMessages)", () => {
    it("should map fields correctly for private chat", async () => {
      backend.setCurrentAccountId("account-123");
      backend.setCurrentUser("user@s.whatsapp.net");

      vi.mocked(apiImtpWhatsappPushMessages).mockResolvedValue(mockPushResult);

      const msg: MiddlewareMessage = {
        messageId: "msg-001",
        chatId: "contact@s.whatsapp.net",
        senderId: "contact@s.whatsapp.net",
        content: "Hello",
        timestamp: 1700000000000,
        messageType: "text",
        version: 1,
        updatedAt: 1700000000000,
      };

      await backend.pushMessages(mockScope, [msg]);

      expect(apiImtpWhatsappPushMessages).toHaveBeenCalledWith({
        imtpWhatsappAccountId: "account-123",
        imtpWhatsappConversationId: "contact@s.whatsapp.net",
        messages: [
          expect.objectContaining({
            messageId: "msg-001",
            fromMe: false,
            remoteJid: "contact@s.whatsapp.net",
            participant: undefined,
          }),
        ],
      });
    });

    it("should pass fromMe flag through to IMTP input", async () => {
      backend.setCurrentAccountId("account-123");
      backend.setCurrentUser("me@s.whatsapp.net");

      vi.mocked(apiImtpWhatsappPushMessages).mockResolvedValue(mockPushResult);

      const msg: MiddlewareMessage = {
        messageId: "msg-002",
        chatId: "contact@s.whatsapp.net",
        senderId: "me@s.whatsapp.net",
        content: "Hi",
        timestamp: 1700000000000,
        messageType: "text",
        version: 1,
        updatedAt: 1700000000000,
        fromMe: true,
      };

      await backend.pushMessages(mockScope, [msg]);

      const call = vi.mocked(apiImtpWhatsappPushMessages).mock.calls[0]![0];
      expect(call.messages[0]!.fromMe).toBe(true);
    });

    it("should set participant for group chats", async () => {
      backend.setCurrentAccountId("account-123");
      backend.setCurrentUser("me@s.whatsapp.net");

      vi.mocked(apiImtpWhatsappPushMessages).mockResolvedValue(mockPushResult);

      const msg: MiddlewareMessage = {
        messageId: "msg-003",
        chatId: "group@g.us",
        senderId: "member@s.whatsapp.net",
        content: "Group msg",
        timestamp: 1700000000000,
        messageType: "text",
        version: 1,
        updatedAt: 1700000000000,
      };

      await backend.pushMessages(mockScope, [msg]);

      const call = vi.mocked(apiImtpWhatsappPushMessages).mock.calls[0]![0];
      expect(call.messages[0]!.participant).toBe("member@s.whatsapp.net");
    });
  });

  describe("pushMessages", () => {
    it("should throw when no accountId", async () => {
      await expect(
        backend.pushMessages(mockScope, [
          { messageId: "m1", chatId: "c1", senderId: "s1", content: "x", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
        ]),
      ).rejects.toThrow("No accountId set");
      expect(apiImtpWhatsappPushMessages).not.toHaveBeenCalled();
    });

    it("should group messages by chatId", async () => {
      backend.setCurrentAccountId("acc-1");
      vi.mocked(apiImtpWhatsappPushMessages).mockResolvedValue(mockPushResult);

      const messages: MiddlewareMessage[] = [
        { messageId: "m1", chatId: "chat-a", senderId: "s1", content: "a1", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
        { messageId: "m2", chatId: "chat-b", senderId: "s1", content: "b1", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
        { messageId: "m3", chatId: "chat-a", senderId: "s1", content: "a2", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
      ];

      await backend.pushMessages(mockScope, messages);

      expect(apiImtpWhatsappPushMessages).toHaveBeenCalledTimes(2);
    });

    it("should return 0 for empty messages", async () => {
      const result = await backend.pushMessages(mockScope, []);
      expect(result.acceptedCount).toBe(0);
    });
  });

  describe("pushCurrentUser", () => {
    it("should call pushAccounts and set accountId", async () => {
      vi.mocked(apiImtpWhatsappPushAccounts).mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        results: [{ lid: "user@lid", success: true, account: { id: "server-acc-id", lid: "user@lid", jid: "user@s.whatsapp.net", hijackImUserId: "h1", assignImUserId: "a1", createdAt: "", updatedAt: "" } }],
      });

      const user = { id: "user@lid", nickname: "Test", avatar: "", isGroup: false, version: 1, updatedAt: Date.now() } as any;
      const result = await backend.pushCurrentUser(mockScope, user);

      expect(result.acceptedCount).toBe(1);
      expect(backend.getCurrentAccountId()).toBe("server-acc-id");
    });
  });

  describe("pushContacts", () => {
    it("should push contacts as participants", async () => {
      backend.setCurrentAccountId("acc-1");
      vi.mocked(apiImtpWhatsappPushParticipants).mockResolvedValue(mockParticipantResult);

      const contacts: MiddlewareContact[] = [
        { contactId: "c1@s.whatsapp.net", nickname: "Alice", version: 1, updatedAt: 0 },
      ];

      const result = await backend.pushContacts(mockScope, contacts);

      expect(apiImtpWhatsappPushParticipants).toHaveBeenCalledWith({
        imtpWhatsappAccountId: "acc-1",
        participants: [{ jid: "c1@s.whatsapp.net", lid: "c1@s.whatsapp.net", data: { name: "Alice", avatar: undefined, phone: undefined } }],
      });
      expect(result.acceptedCount).toBe(1);
    });

    it("should throw when no accountId", async () => {
      await expect(
        backend.pushContacts(mockScope, [{ contactId: "c1", nickname: "A", version: 1, updatedAt: 0 }]),
      ).rejects.toThrow("No accountId set");
    });
  });

  describe("pushConversations", () => {
    it("should push conversations with correct format and refresh mapping", async () => {
      backend.setCurrentAccountId("acc-1");
      vi.mocked(apiImtpWhatsappPushConversations).mockResolvedValue(mockConvResult);

      const conversations: MiddlewareConversation[] = [
        { conversationId: "chat@s.whatsapp.net", type: "private", title: "Chat", version: 1, updatedAt: 0 },
      ];

      const result = await backend.pushConversations(mockScope, conversations);

      expect(apiImtpWhatsappPushConversations).toHaveBeenCalledWith({
        imtpWhatsappAccountId: "acc-1",
        conversations: [{ jid: "chat@s.whatsapp.net", data: expect.objectContaining({ name: "Chat", type: "private" }) }],
      });
      expect(apiImtpWhatsappConnectionConversations).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: "acc-1" }),
      );
      expect(result.acceptedCount).toBe(1);
    });

    it("should use server-side conversation ID for subsequent pushMessages", async () => {
      backend.setCurrentAccountId("acc-1");
      vi.mocked(apiImtpWhatsappPushConversations).mockResolvedValue(mockConvResult);
      vi.mocked(apiImtpWhatsappConnectionConversations).mockResolvedValue({
        edges: [{ nodeId: "server-conv-123", jid: "chat@s.whatsapp.net", cursor: "c1", imtpWhatsappAccountId: "acc-1", data: null, createdAt: "", updatedAt: "" }],
        totalCount: 1,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      } as any);
      vi.mocked(apiImtpWhatsappPushMessages).mockResolvedValue(mockPushResult);

      await backend.pushConversations(mockScope, [
        { conversationId: "chat@s.whatsapp.net", type: "private", title: "Chat", version: 1, updatedAt: 0 },
      ]);

      await backend.pushMessages(mockScope, [
        { messageId: "m1", chatId: "chat@s.whatsapp.net", senderId: "s1", content: "hi", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
      ]);

      expect(apiImtpWhatsappPushMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          imtpWhatsappConversationId: "server-conv-123",
        }),
      );
    });
  });

  describe("sync session", () => {
    // TODO: Implement startSync, completeSync, getCurrentSyncId methods and ImtpSyncType enum
    it.skip("should manage sync lifecycle", () => {});

    it.skip("should return early when completing without active session", () => {});
  });

  describe("pushHistory", () => {
    it("should push history messages for a conversation", async () => {
      backend.setCurrentAccountId("acc-1");
      backend.setCurrentUser("me@s.whatsapp.net");
      vi.mocked(apiImtpWhatsappPushMessages).mockResolvedValue(mockPushResult);

      const messages: MiddlewareMessage[] = [
        { messageId: "h1", chatId: "conv@s.whatsapp.net", senderId: "me@s.whatsapp.net", content: "old msg", timestamp: 1600000000000, messageType: "text", version: 1, updatedAt: 1600000000000, fromMe: true },
        { messageId: "h2", chatId: "conv@s.whatsapp.net", senderId: "other@s.whatsapp.net", content: "reply", timestamp: 1600000001000, messageType: "text", version: 1, updatedAt: 1600000001000 },
      ];

      const result = await backend.pushHistory(mockScope, "conv@s.whatsapp.net", messages);

      expect(apiImtpWhatsappPushMessages).toHaveBeenCalledWith({
        imtpWhatsappAccountId: "acc-1",
        imtpWhatsappConversationId: "conv@s.whatsapp.net",
        messages: expect.arrayContaining([
          expect.objectContaining({ messageId: "h1", fromMe: true }),
          expect.objectContaining({ messageId: "h2", fromMe: false }),
        ]),
      });
      expect(result.acceptedCount).toBe(1);
    });

    it("should return 0 for empty messages", async () => {
      backend.setCurrentAccountId("acc-1");
      const result = await backend.pushHistory(mockScope, "conv@s.whatsapp.net", []);
      expect(result.acceptedCount).toBe(0);
      expect(apiImtpWhatsappPushMessages).not.toHaveBeenCalled();
    });

    it("should throw when no accountId", async () => {
      const messages: MiddlewareMessage[] = [
        { messageId: "h1", chatId: "conv@s.whatsapp.net", senderId: "s1", content: "x", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
      ];
      await expect(
        backend.pushHistory(mockScope, "conv@s.whatsapp.net", messages),
      ).rejects.toThrow("No accountId set");
      expect(apiImtpWhatsappPushMessages).not.toHaveBeenCalled();
    });
  });

  describe("pushMessages error scenarios", () => {
    it("should log error when some messages fail to push", async () => {
      backend.setCurrentAccountId("acc-1");
      const failedResult = { inserted: 1, updated: 0, skipped: 0, failed: 2, failedKeyIds: ["k1", "k2"] };
      vi.mocked(apiImtpWhatsappPushMessages).mockResolvedValue(failedResult);

      const messages: MiddlewareMessage[] = [
        { messageId: "m1", chatId: "chat-a", senderId: "s1", content: "a1", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
        { messageId: "m2", chatId: "chat-a", senderId: "s1", content: "a2", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
        { messageId: "m3", chatId: "chat-a", senderId: "s1", content: "a3", timestamp: 0, messageType: "text", version: 1, updatedAt: 0 },
      ];

      const result = await backend.pushMessages(mockScope, messages);

      expect(apiImtpWhatsappPushMessages).toHaveBeenCalledTimes(1);
      expect(result.acceptedCount).toBe(1);
    });
  });

  describe("pushContacts edge cases", () => {
    it("should return 0 for empty contacts list", async () => {
      backend.setCurrentAccountId("acc-1");
      const result = await backend.pushContacts(mockScope, []);
      expect(result.acceptedCount).toBe(0);
      expect(apiImtpWhatsappPushParticipants).not.toHaveBeenCalled();
    });
  });

  describe("pushConversations edge cases", () => {
    it("should return 0 for empty conversations list", async () => {
      backend.setCurrentAccountId("acc-1");
      const result = await backend.pushConversations(mockScope, []);
      expect(result.acceptedCount).toBe(0);
      expect(apiImtpWhatsappPushConversations).not.toHaveBeenCalled();
    });

    it("should throw when no accountId", async () => {
      const conversations: MiddlewareConversation[] = [
        { conversationId: "chat@s.whatsapp.net", type: "private", title: "Chat", version: 1, updatedAt: 0 },
      ];
      await expect(
        backend.pushConversations(mockScope, conversations),
      ).rejects.toThrow("No accountId set");
      expect(apiImtpWhatsappPushConversations).not.toHaveBeenCalled();
    });
  });

  describe("startSync error handling", () => {
    it.skip("should propagate error when API fails", () => {});
  });

  describe("completeSync with errors", () => {
    it.skip("should complete sync even when result contains errors", () => {});
  });

  describe("pushCurrentUser failure", () => {
    it("should not set accountId when successCount is 0", async () => {
      vi.mocked(apiImtpWhatsappPushAccounts).mockResolvedValue({
        successCount: 0,
        failedCount: 1,
        results: [{ lid: "user@lid", success: false }],
      });

      const user = { id: "user@lid", nickname: "Test", avatar: "", isGroup: false, version: 1, updatedAt: Date.now() } as any;
      const result = await backend.pushCurrentUser(mockScope, user);

      expect(result.acceptedCount).toBe(0);
      expect(backend.getCurrentAccountId()).toBe("");
    });
  });
});
