/**
 * Tests for sendMessage module
 *
 * @module sendMessage.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockChatModel } from "./mocks/moduleLoader.mock";

// Mock the moduleLoader
vi.mock("../modules/moduleLoader", () => ({
  moduleLoader: {
    get: vi.fn(),
  },
}));

import { moduleLoader } from "../modules/moduleLoader";
import { getSendMessageModule, sendTextMessage } from "../modules/sendMessage";

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSendMessageModule", () => {
    it("should return null when WAWebSendTextMsgChatAction is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue(null);

      const module = getSendMessageModule();

      expect(module).toBeNull();
    });

    it("should return the send message module when available", () => {
      const mockSendModule = {
        sendTextMsgToChat: vi.fn(),
      };
      vi.mocked(moduleLoader.get).mockReturnValue(mockSendModule);

      const module = getSendMessageModule();

      expect(module).toBeDefined();
      expect(module?.sendTextMsgToChat).toBe(mockSendModule.sendTextMsgToChat);
    });
  });

  describe("sendTextMessage", () => {
    it("should throw error when send module is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue(null);

      const mockChat = createMockChatModel("1234567890@c.us", "Alice");

      expect(() => sendTextMessage(mockChat as any, "Hello")).toThrow(
        "Send message module not available",
      );
    });

    it("should call sendTextMsgToChat with correct arguments", () => {
      const mockSendFn = vi.fn();
      const mockSendModule = {
        sendTextMsgToChat: mockSendFn,
      };
      vi.mocked(moduleLoader.get).mockReturnValue(mockSendModule);

      const mockChat = createMockChatModel("1234567890@c.us", "Alice");
      const text = "Hello, World!";

      sendTextMessage(mockChat as any, text);

      expect(mockSendFn).toHaveBeenCalledTimes(1);
      expect(mockSendFn).toHaveBeenCalledWith(mockChat, text);
    });

    it("should handle empty message", () => {
      const mockSendFn = vi.fn();
      const mockSendModule = {
        sendTextMsgToChat: mockSendFn,
      };
      vi.mocked(moduleLoader.get).mockReturnValue(mockSendModule);

      const mockChat = createMockChatModel("1234567890@c.us", "Alice");

      sendTextMessage(mockChat as any, "");

      expect(mockSendFn).toHaveBeenCalledWith(mockChat, "");
    });

    it("should handle message with special characters", () => {
      const mockSendFn = vi.fn();
      const mockSendModule = {
        sendTextMsgToChat: mockSendFn,
      };
      vi.mocked(moduleLoader.get).mockReturnValue(mockSendModule);

      const mockChat = createMockChatModel("1234567890@c.us", "Alice");
      const text = "Hello 你好 👋 <script>alert('xss')</script>";

      sendTextMessage(mockChat as any, text);

      expect(mockSendFn).toHaveBeenCalledWith(mockChat, text);
    });

    it("should handle multiline message", () => {
      const mockSendFn = vi.fn();
      const mockSendModule = {
        sendTextMsgToChat: mockSendFn,
      };
      vi.mocked(moduleLoader.get).mockReturnValue(mockSendModule);

      const mockChat = createMockChatModel("1234567890@c.us", "Alice");
      const text = "Line 1\nLine 2\nLine 3";

      sendTextMessage(mockChat as any, text);

      expect(mockSendFn).toHaveBeenCalledWith(mockChat, text);
    });
  });
});
