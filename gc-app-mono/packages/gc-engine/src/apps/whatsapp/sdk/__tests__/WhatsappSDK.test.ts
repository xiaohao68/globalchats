/**
 * Tests for WhatsappSDK main class
 *
 * @module WhatsappSDK.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockContact,
  createMockChatModel,
  createMockStoreChat,
  createMockStoreContact,
  createMockWid,
} from "./mocks/moduleLoader.mock";

// Mock dependencies
vi.mock("@gc/utils", () => ({
  domReady: vi.fn().mockResolvedValue(undefined),
  isSideWebview: vi.fn().mockReturnValue(false),
  isMainWebview: vi.fn().mockReturnValue(false),
  sleep: vi.fn().mockResolvedValue(undefined),
  getCurrentWebviewId: vi.fn().mockReturnValue("test-webview"),
  Nullable: null,
}));

vi.mock("@gc/api", () => ({
  apiGetChatMessages: vi.fn(),
  apiGetContacts: vi.fn(),
  apiSendMessage: vi.fn(),
  apiSyncAccount: vi.fn(),
  apiSyncChatMessages: vi.fn(),
  apiSyncContacts: vi.fn(),
}));

vi.mock("@gc/store", () => ({
  appStore: {
    getCurrentChatUserByAppId: vi.fn().mockReturnValue(null),
  },
}));

vi.mock("../modules/moduleLoader", () => ({
  moduleLoader: {
    get: vi.fn(),
  },
}));

vi.mock("../modules/authStore", () => ({
  initAuthStore: vi.fn(),
  getAppState: vi.fn(),
  getAuthCmd: vi.fn(),
  getAuthConn: vi.fn(),
}));

import { moduleLoader } from "../modules/moduleLoader";
import { getAppState, getAuthConn } from "../modules/authStore";
import { WhatsAppSDK } from "../WhatsappSDK";
import {
  NotLoggedInError,
  ChatNotFoundError,
  MessageSendError,
} from "../types";

describe("WhatsAppSDK", () => {
  let sdk: WhatsAppSDK;

  beforeEach(() => {
    vi.clearAllMocks();
    sdk = new WhatsAppSDK();
  });

  afterEach(() => {
    sdk.destroy();
    vi.restoreAllMocks();
  });

  describe("login state", () => {
    it("should return false for isLoggedIn when not injected", () => {
      expect(sdk.isLoggedIn).toBe(false);
    });

    it("should return false for isLoggedIn when appState is null", () => {
      vi.mocked(getAppState).mockReturnValue(null);

      expect(sdk.isLoggedIn).toBe(false);
    });

    it("should return true for isLoggedIn when hasSynced is true", () => {
      // Simulate injection
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });

      // Access private property for testing
      (sdk as any)._isInjected = true;

      expect(sdk.isLoggedIn).toBe(true);
    });

    it("should return correct isLoginPage value", () => {
      expect(sdk.isLoginPage).toBe(true); // Not logged in

      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      (sdk as any)._isInjected = true;

      expect(sdk.isLoginPage).toBe(false); // Logged in
    });

    it("should return correct isChatPage value", () => {
      expect(sdk.isChatPage).toBe(false); // Not logged in

      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      (sdk as any)._isInjected = true;

      expect(sdk.isChatPage).toBe(true); // Logged in
    });
  });

  describe("currentUserId", () => {
    it("should return null when not logged in", () => {
      expect(sdk.currentUserId).toBeNull();
    });

    it("should return user ID when logged in", () => {
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      vi.mocked(getAuthConn).mockReturnValue({
        wid: {
          _serialized: "1234567890@c.us",
        },
      });
      (sdk as any)._isInjected = true;

      expect(sdk.currentUserId).toBe("1234567890@c.us");
    });

    it("should return null when conn.wid is not available", () => {
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      vi.mocked(getAuthConn).mockReturnValue({
        wid: null,
      });
      (sdk as any)._isInjected = true;

      expect(sdk.currentUserId).toBeNull();
    });
  });

  describe("getContacts", () => {
    it("should return empty array when not logged in", () => {
      const contacts = sdk.getContacts();

      expect(contacts).toEqual([]);
    });

    it("should return contacts when logged in", () => {
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      (sdk as any)._isInjected = true;

      const mockChats = [
        createMockChatModel("1234567890@c.us", "Alice"),
        createMockChatModel("0987654321@c.us", "Bob"),
      ];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const contacts = sdk.getContacts();

      expect(contacts).toHaveLength(2);
    });
  });

  describe("getContactById", () => {
    it("should return undefined when not logged in", () => {
      const contact = sdk.getContactById("1234567890@c.us");

      expect(contact).toBeUndefined();
    });
  });

  describe("sendTextMessage", () => {
    it("should throw NotLoggedInError when not logged in", async () => {
      await expect(
        sdk.sendTextMessage("1234567890@c.us", "Hello"),
      ).rejects.toThrow(NotLoggedInError);
    });

    it("should throw ChatNotFoundError when chat does not exist", async () => {
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      (sdk as any)._isInjected = true;
      (sdk as any)._storeChat = {
        get: vi.fn().mockReturnValue(null),
      };

      await expect(
        sdk.sendTextMessage("9999999999@c.us", "Hello"),
      ).rejects.toThrow(ChatNotFoundError);
    });

    it("should throw MessageSendError when send module is not available", async () => {
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      (sdk as any)._isInjected = true;

      const mockChat = createMockChatModel("1234567890@c.us", "Alice");
      (sdk as any)._storeChat = {
        get: vi.fn().mockReturnValue(mockChat),
      };

      vi.mocked(moduleLoader.get).mockReturnValue(null);

      await expect(
        sdk.sendTextMessage("1234567890@c.us", "Hello"),
      ).rejects.toThrow(MessageSendError);
    });

    it("should send message successfully", async () => {
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      (sdk as any)._isInjected = true;

      const mockChat = createMockChatModel("1234567890@c.us", "Alice");
      (sdk as any)._storeChat = {
        get: vi.fn().mockReturnValue(mockChat),
      };

      const mockSendFn = vi.fn();
      vi.mocked(moduleLoader.get).mockReturnValue({
        sendTextMsgToChat: mockSendFn,
      });

      await sdk.sendTextMessage("1234567890@c.us", "Hello");

      expect(mockSendFn).toHaveBeenCalledWith(mockChat, "Hello");
    });
  });

  describe("isGroup", () => {
    it("should return true for group IDs", () => {
      expect(sdk.isGroup("123456789012345@g.us")).toBe(true);
    });

    it("should return false for individual IDs", () => {
      expect(sdk.isGroup("1234567890@c.us")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(sdk.isGroup("")).toBe(false);
    });
  });

  describe("getCurrentUserInfo", () => {
    it("should return null when not logged in", async () => {
      const userInfo = await sdk.getCurrentUserInfo();

      expect(userInfo).toBeNull();
    });

    it("should return null when storeContact is not available", async () => {
      vi.mocked(getAppState).mockReturnValue({
        hasSynced: true,
        on: vi.fn(),
        off: vi.fn(),
      });
      (sdk as any)._isInjected = true;
      (sdk as any)._storeContact = null;

      const userInfo = await sdk.getCurrentUserInfo();

      expect(userInfo).toBeNull();
    });
  });

  describe("sendMessageToCurrentChat", () => {
    it("should return false when no current chat", () => {
      const result = sdk.sendMessageToCurrentChat("Hello");

      expect(result).toBe(false);
    });
  });

  describe("destroy", () => {
    it("should cleanup event handlers", () => {
      sdk.destroy();

      // After destroy, isInjected should be false
      expect((sdk as any)._isInjected).toBe(false);
    });
  });
});
