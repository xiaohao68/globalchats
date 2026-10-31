/**
 * Tests for contactCollection module
 *
 * @module contactCollection.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockContact,
  createMockChatModel,
  createMockStoreChat,
  testContacts,
} from "./mocks/moduleLoader.mock";

// Mock the moduleLoader
vi.mock("../modules/moduleLoader", () => ({
  moduleLoader: {
    get: vi.fn(),
  },
}));

import { moduleLoader } from "../modules/moduleLoader";
import { getAllContacts, findContactById } from "../modules/contactCollection";

describe("contactCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAllContacts", () => {
    it("should return empty array when WAWebCollections is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue(null);

      const contacts = getAllContacts();

      expect(contacts).toEqual([]);
    });

    it("should return empty array when Chat collection is not available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue({});

      const contacts = getAllContacts();

      expect(contacts).toEqual([]);
    });

    it("should return all contacts from chat models", () => {
      const mockChats = [
        createMockChatModel("1234567890@c.us", "Alice"),
        createMockChatModel("0987654321@c.us", "Bob"),
      ];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const contacts = getAllContacts();

      expect(contacts).toHaveLength(2);
      expect(contacts[0].name).toBe("Alice");
      expect(contacts[1].name).toBe("Bob");
    });

    it("should filter contacts by type 'private'", () => {
      const mockChats = [
        createMockChatModel("1234567890@c.us", "Alice"),
        createMockChatModel("123456789012345@g.us", "Family Group"),
      ];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const contacts = getAllContacts("private");

      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe("Alice");
      expect(contacts[0].isGroup).toBe(false);
    });

    it("should filter contacts by type 'group'", () => {
      const mockChats = [
        createMockChatModel("1234567890@c.us", "Alice"),
        createMockChatModel("123456789012345@g.us", "Family Group"),
      ];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const contacts = getAllContacts("group");

      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe("Family Group");
      expect(contacts[0].isGroup).toBe(true);
    });

    it("should handle chats without contact property", () => {
      const mockChats = [
        {
          id: { server: "c.us", user: "123", _serialized: "123@c.us" },
          contact: undefined,
          title: () => "No Contact",
        },
      ];
      const mockStoreChat = createMockStoreChat(mockChats as any);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });

      const contacts = getAllContacts();

      expect(contacts).toEqual([]);
    });
  });

  describe("findContactById", () => {
    beforeEach(() => {
      const mockChats = [
        createMockChatModel("1234567890@c.us", "Alice"),
        createMockChatModel("0987654321@c.us", "Bob"),
      ];
      const mockStoreChat = createMockStoreChat(mockChats);

      vi.mocked(moduleLoader.get).mockReturnValue({
        Chat: mockStoreChat,
      });
    });

    it("should find contact by full serialized ID", () => {
      const contact = findContactById("1234567890@c.us");

      expect(contact).toBeDefined();
      expect(contact?.name).toBe("Alice");
    });

    it("should find contact by user ID only", () => {
      const contact = findContactById("1234567890");

      expect(contact).toBeDefined();
      expect(contact?.name).toBe("Alice");
    });

    it("should return undefined for non-existent contact", () => {
      const contact = findContactById("9999999999@c.us");

      expect(contact).toBeUndefined();
    });

    it("should return undefined when no contacts available", () => {
      vi.mocked(moduleLoader.get).mockReturnValue(null);

      const contact = findContactById("1234567890@c.us");

      expect(contact).toBeUndefined();
    });
  });
});
