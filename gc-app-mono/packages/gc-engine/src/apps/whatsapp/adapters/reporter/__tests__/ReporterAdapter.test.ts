import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReporterAdapter } from "../ReporterAdapter";
import type { GCEngineMiddleware } from "../../../../../middleware/GCEngineMiddleware";
import type {
  MiddlewareMessage,
  MiddlewareConversation,
  MiddlewareContact,
} from "../../../../../middleware/types";

const createMockMiddleware = (): GCEngineMiddleware => ({
  reportStatusChange: vi.fn().mockResolvedValue({ status: "success", correlationId: "test", acceptedCount: 1 }),
  reportCurrentUser: vi.fn().mockResolvedValue({ status: "success", correlationId: "test", acceptedCount: 1 }),
  reportMessages: vi.fn().mockResolvedValue({ status: "success", correlationId: "test", acceptedCount: 1 }),
  reportConversations: vi.fn().mockResolvedValue({ status: "success", correlationId: "test", acceptedCount: 1 }),
  reportContacts: vi.fn().mockResolvedValue({ status: "success", correlationId: "test", acceptedCount: 1 }),
  reportHistory: vi.fn().mockResolvedValue({ status: "success", correlationId: "test", acceptedCount: 1 }),
}) as unknown as GCEngineMiddleware;

describe("ReporterAdapter", () => {
  let middleware: GCEngineMiddleware;
  let reporter: ReporterAdapter;

  beforeEach(() => {
    middleware = createMockMiddleware();
    reporter = new ReporterAdapter(middleware);
  });

  afterEach(() => {
    reporter.destroy();
  });

  describe("reportStatusChange", () => {
    it("should immediately report status change", async () => {
      const event = {
        eventType: "login" as const,
        status: "logged_in" as const,
        timestamp: Date.now(),
      };

      await reporter.reportStatusChange(event);

      expect(middleware.reportStatusChange).toHaveBeenCalledWith(event);
    });
  });

  describe("reportCurrentUser", () => {
    it("should immediately report current user", async () => {
      const user = {
        id: "user123",
        nickname: "Test User",
        avatar: "https://example.com/avatar.jpg",
        isGroup: false,
      };

      await reporter.reportCurrentUser(user);

      expect(middleware.reportCurrentUser).toHaveBeenCalledWith(user);
    });
  });

  describe("reportMessages", () => {
    it("should queue messages for batch reporting", async () => {
      const messages: MiddlewareMessage[] = [
        {
          messageId: "msg1",
          chatId: "chat1",
          senderId: "sender1",
          content: "Hello",
          timestamp: Date.now(),
          messageType: "text",
          version: 1,
          updatedAt: Date.now(),
        },
      ];

      const result = await reporter.reportMessages(messages);

      expect(result.status).toBe("success");
      expect(result.acceptedCount).toBe(1);
    });

    it("should not report when paused", async () => {
      reporter.pause();

      const messages: MiddlewareMessage[] = [
        {
          messageId: "msg1",
          chatId: "chat1",
          senderId: "sender1",
          content: "Hello",
          timestamp: Date.now(),
          messageType: "text",
          version: 1,
          updatedAt: Date.now(),
        },
      ];

      const result = await reporter.reportMessages(messages);

      expect(result.acceptedCount).toBe(0);
    });
  });

  describe("reportConversations", () => {
    it("should queue conversations for batch reporting", async () => {
      const conversations: MiddlewareConversation[] = [
        {
          conversationId: "conv1",
          type: "private",
          title: "Test Chat",
          lastMessageTime: Date.now(),
          unreadCount: 0,
          version: 1,
          updatedAt: Date.now(),
        },
      ];

      const result = await reporter.reportConversations(conversations);

      expect(result.status).toBe("success");
      expect(result.acceptedCount).toBe(1);
    });
  });

  describe("reportContacts", () => {
    it("should queue contacts for batch reporting", async () => {
      const contacts: MiddlewareContact[] = [
        {
          contactId: "contact1",
          nickname: "Test Contact",
          version: 1,
          updatedAt: Date.now(),
        },
      ];

      const result = await reporter.reportContacts(contacts);

      expect(result.status).toBe("success");
      expect(result.acceptedCount).toBe(1);
    });
  });

  describe("pause/resume", () => {
    it("should pause and resume reporting", () => {
      expect(reporter.isReporting()).toBe(true);

      reporter.pause();
      expect(reporter.isReporting()).toBe(false);

      reporter.resume();
      expect(reporter.isReporting()).toBe(true);
    });
  });
});
