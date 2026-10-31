/**
 * Tests for messageCollection module
 *
 * @module messageCollection.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockChatModel,
  createMockStoreChat,
  createMockStoreMsg,
  createMockMessage,
  createMockHistoryMessage,
} from "./mocks/moduleLoader.mock";

// Mock the moduleLoader
vi.mock("../modules/moduleLoader", () => ({
  moduleLoader: {
    get: vi.fn(),
  },
}));

import { moduleLoader } from "../modules/moduleLoader";
import {
  getMessagesByChatId,
  onNewMessage,
  getStoreMsg,
} from "../modules/messageCollection";

describe("messageCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMessagesByChatId", () => {
    it("should return undefined when WAWebCollections is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue(null);

      const messages = getMessagesByChatId("1234567890@c.us");

      expect(messages).toBeUndefined();
    });

    it("should return undefined when Chat collection is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue({});

      const messages = getMessagesByChatId("1234567890@c.us");

      expect(messages).toBeUndefined();
    });

    it("should return undefined when chat is not found", () => {
      const mockChats = [createMockChatModel("1234567890@c.us", "Alice")];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const messages = getMessagesByChatId("9999999999@c.us");

      expect(messages).toBeUndefined();
    });

    it("should return messages for existing chat by full ID", () => {
      const testMessages = [
        createMockHistoryMessage("Hello!", "1234567890@c.us", "me@c.us"),
        createMockHistoryMessage("Hi there!", "me@c.us", "1234567890@c.us"),
      ];
      const mockChats = [
        createMockChatModel("1234567890@c.us", "Alice", testMessages),
      ];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const messages = getMessagesByChatId("1234567890@c.us");

      expect(messages).toBeDefined();
      expect(messages).toHaveLength(2);
      expect(messages![0].body).toBe("Hello!");
      expect(messages![1].body).toBe("Hi there!");
    });

    it("should return messages for existing chat by user ID", () => {
      const testMessages = [
        createMockHistoryMessage("Hello!", "1234567890@c.us", "me@c.us"),
      ];
      const mockChats = [
        createMockChatModel("1234567890@c.us", "Alice", testMessages),
      ];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const messages = getMessagesByChatId("1234567890");

      expect(messages).toBeDefined();
      expect(messages).toHaveLength(1);
    });

    it("should return empty array when chat has no messages", () => {
      const mockChats = [createMockChatModel("1234567890@c.us", "Alice", [])];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const messages = getMessagesByChatId("1234567890@c.us");

      expect(messages).toBeDefined();
      expect(messages).toHaveLength(0);
    });
  });

  describe("onNewMessage", () => {
    it("should return no-op cleanup when Store.Msg is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue(null);

      const callback = vi.fn();
      const cleanup = onNewMessage(callback);

      // Should return a function
      expect(typeof cleanup).toBe("function");

      // Calling cleanup should not throw
      expect(() => cleanup()).not.toThrow();
    });

    it("should subscribe to new messages", () => {
      const mockStoreMsg = createMockStoreMsg();
      vi.mocked(moduleLoader.get).mockReturnValue({
        Msg: mockStoreMsg,
      });

      const callback = vi.fn();
      onNewMessage(callback);

      // Simulate new message
      const testMessage = createMockMessage(
        "New message!",
        "1234567890@c.us",
        "me@c.us",
      );
      mockStoreMsg._simulateNewMessage(testMessage);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(testMessage);
    });

    it("should stop receiving messages after cleanup", () => {
      const mockStoreMsg = createMockStoreMsg();
      vi.mocked(moduleLoader.get).mockReturnValue({
        Msg: mockStoreMsg,
      });

      const callback = vi.fn();
      const cleanup = onNewMessage(callback);

      // First message should trigger callback
      const msg1 = createMockMessage("First", "1234567890@c.us", "me@c.us");
      mockStoreMsg._simulateNewMessage(msg1);
      expect(callback).toHaveBeenCalledTimes(1);

      // Cleanup
      cleanup();

      // Second message should not trigger callback
      const msg2 = createMockMessage("Second", "1234567890@c.us", "me@c.us");
      mockStoreMsg._simulateNewMessage(msg2);
      expect(callback).toHaveBeenCalledTimes(1); // Still 1
    });

    it("should handle multiple subscribers", () => {
      const mockStoreMsg = createMockStoreMsg();
      vi.mocked(moduleLoader.get).mockReturnValue({
        Msg: mockStoreMsg,
      });

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const cleanup1 = onNewMessage(callback1);
      const cleanup2 = onNewMessage(callback2);

      const testMessage = createMockMessage(
        "Broadcast",
        "1234567890@c.us",
        "me@c.us",
      );
      mockStoreMsg._simulateNewMessage(testMessage);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      // Cleanup first subscriber
      cleanup1();

      const testMessage2 = createMockMessage(
        "After cleanup",
        "1234567890@c.us",
        "me@c.us",
      );
      mockStoreMsg._simulateNewMessage(testMessage2);

      expect(callback1).toHaveBeenCalledTimes(1); // Not called again
      expect(callback2).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe("getStoreMsg", () => {
    it("should return null when WAWebCollections is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue(null);

      const storeMsg = getStoreMsg();

      expect(storeMsg).toBeNull();
    });

    it("should return Store.Msg when available", () => {
      const mockStoreMsg = createMockStoreMsg();
      vi.mocked(moduleLoader.get).mockReturnValue({
        Msg: mockStoreMsg,
      });

      const storeMsg = getStoreMsg();

      expect(storeMsg).toBeDefined();
      expect(storeMsg).toBe(mockStoreMsg);
    });
  });
});
