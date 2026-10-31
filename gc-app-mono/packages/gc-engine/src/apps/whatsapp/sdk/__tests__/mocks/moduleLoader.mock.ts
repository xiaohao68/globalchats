/**
 * Mock utilities for WhatsApp SDK tests
 *
 * This module provides mock implementations of WhatsApp Web internal modules
 * that are normally only available in the WebView environment.
 */

import { vi } from "vitest";
import type {
  WAWid,
  WAContact,
  WAMessage,
  WAHistoryMessage,
} from "../../types";

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Create a mock WAWid
 */
export function createMockWid(user: string, isGroup = false): WAWid {
  const server = isGroup ? "g.us" : "c.us";
  return {
    server,
    user,
    _serialized: `${user}@${server}`,
  };
}

/**
 * Create a mock WAContact
 */
export function createMockContact(
  id: string,
  name: string,
  options: Partial<WAContact> = {},
): WAContact {
  const isGroup = id.endsWith("@g.us");
  return {
    id: {
      server: isGroup ? "g.us" : "c.us",
      user: id.replace(/@[cg]\.us$/, ""),
      _serialized: id,
    },
    name,
    isGroup,
    ...options,
  };
}

/**
 * Create a mock WAMessage
 */
export function createMockMessage(
  body: string,
  from: string,
  to: string,
  options: Partial<WAMessage> = {},
): WAMessage {
  const msgId = `MSG_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return {
    id: {
      fromMe: from === "me",
      remote: to,
      id: msgId,
      _serialized: `${from === "me" ? "true" : "false"}_${to}_${msgId}`,
    },
    type: "chat",
    body,
    t: Math.floor(Date.now() / 1000),
    from,
    to,
    isNewMsg: true,
    ack: 1,
    viewed: false,
    ...options,
  };
}

/**
 * Create a mock WAHistoryMessage
 */
export function createMockHistoryMessage(
  body: string,
  from: string,
  to: string,
): WAHistoryMessage {
  const msgId = `MSG_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return {
    id: {
      fromMe: from === "me",
      remote: to,
      id: msgId,
      _serialized: `${from === "me" ? "true" : "false"}_${to}_${msgId}`,
    },
    body,
    type: "chat",
    t: Math.floor(Date.now() / 1000),
    from,
    to,
  };
}

// =============================================================================
// Mock Store Collections
// =============================================================================

export interface MockChatModel {
  id: WAWid;
  contact: {
    id: WAWid;
    serialize: () => WAContact;
  };
  title: () => string;
  msgs?: {
    _models: WAHistoryMessage[];
  };
}

/**
 * Create a mock Chat model
 */
export function createMockChatModel(
  id: string,
  name: string,
  messages: WAHistoryMessage[] = [],
): MockChatModel {
  const isGroup = id.endsWith("@g.us");
  const wid = createMockWid(id.replace(/@[cg]\.us$/, ""), isGroup);
  const contact = createMockContact(id, name);

  return {
    id: wid,
    contact: {
      id: wid,
      serialize: () => contact,
    },
    title: () => name,
    msgs: {
      _models: messages,
    },
  };
}

/**
 * Create a mock Store.Chat collection
 */
export function createMockStoreChat(chats: MockChatModel[]) {
  const handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  return {
    get: (id: string) => chats.find((c) => c.id._serialized === id),
    getModelsArray: () => chats,
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },
    off: (event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
    },
    // Helper for tests to trigger events
    _emit: (event: string, ...args: unknown[]) => {
      handlers.get(event)?.forEach((h) => h(...args));
    },
  };
}

/**
 * Create a mock Store.Msg collection
 */
export function createMockStoreMsg() {
  const handlers: Map<string, Set<(msg: WAMessage) => void>> = new Map();

  return {
    on: (event: string, handler: (msg: WAMessage) => void) => {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
    },
    off: (event: string, handler: (msg: WAMessage) => void) => {
      handlers.get(event)?.delete(handler);
    },
    // Helper for tests to simulate new messages
    _simulateNewMessage: (msg: WAMessage) => {
      handlers.get("add")?.forEach((h) => h(msg));
    },
  };
}

/**
 * Create a mock Store.Contact collection
 */
export function createMockStoreContact(contacts: WAContact[]) {
  const meContact =
    contacts.find((c) => c.id._serialized.includes("me")) || contacts[0];

  return {
    serialize: () => contacts,
    getModelsArray: () =>
      contacts.map((c) => ({
        id: c.id,
        serialize: () => c,
      })),
    getMeContact: () =>
      meContact
        ? {
            id: meContact.id,
            serialize: () => meContact,
          }
        : null,
    getGroupContacts: () =>
      contacts
        .filter((c) => c.isGroup)
        .map((c) => ({
          id: c.id,
          serialize: () => c,
        })),
  };
}

// =============================================================================
// Module Loader Mock
// =============================================================================

export interface MockModules {
  WAWebCollections?: {
    Chat?: ReturnType<typeof createMockStoreChat>;
    Contact?: ReturnType<typeof createMockStoreContact>;
    Msg?: ReturnType<typeof createMockStoreMsg>;
  };
  WAWebSendTextMsgChatAction?: {
    sendTextMsgToChat: ReturnType<typeof vi.fn>;
  };
  WAWebContactGetters?: {
    getIsGroup: (contact: { id: { _serialized: string } }) => boolean;
  };
  WAWebContactProfilePicThumbBridge?: {
    requestProfilePicFromServer: ReturnType<typeof vi.fn>;
  };
}

/**
 * Create a mock moduleLoader.get function
 */
export function createMockModuleLoader(modules: MockModules) {
  return vi.fn((moduleName: string) => {
    switch (moduleName) {
      case "WAWebCollections":
        return modules.WAWebCollections || null;
      case "WAWebSendTextMsgChatAction":
        return modules.WAWebSendTextMsgChatAction || null;
      case "WAWebContactGetters":
        return modules.WAWebContactGetters || null;
      case "WAWebContactProfilePicThumbBridge":
        return modules.WAWebContactProfilePicThumbBridge || null;
      default:
        return null;
    }
  });
}

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Standard test contacts
 */
export const testContacts = {
  alice: createMockContact("1234567890@c.us", "Alice", {
    phone: "1234567890",
    shortName: "Ali",
  }),
  bob: createMockContact("0987654321@c.us", "Bob", {
    phone: "0987654321",
    isBusiness: true,
  }),
  familyGroup: createMockContact("123456789012345@g.us", "Family Group", {
    memberCount: 10,
  }),
};

/**
 * Standard test messages
 */
export const testMessages = {
  hello: createMockHistoryMessage("Hello!", "1234567890@c.us", "me@c.us"),
  reply: createMockHistoryMessage("Hi there!", "me@c.us", "1234567890@c.us"),
};
