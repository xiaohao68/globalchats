import type { BackendApi } from "../backend/backendApi.ts";

export function createMockBackend(
  overrides: Partial<BackendApi> = {},
): BackendApi {
  return {
    pushCurrentUser: async () => ({ acceptedCount: 0 }),
    pushStatusEvent: async () => ({ acceptedCount: 0 }),
    pushContacts: async () => ({ acceptedCount: 0 }),
    pushConversations: async () => ({ acceptedCount: 0 }),
    pushMessages: async () => ({ acceptedCount: 0 }),
    pushEvents: async () => ({ acceptedCount: 0 }),
    pushHistory: async () => ({ acceptedCount: 0 }),
    getContacts: async () => ({ items: [], hasMore: false }),
    getConversations: async () => ({ items: [], hasMore: false }),
    getMessages: async () => ({ items: [], hasMore: false }),
    getUserById: async () => null,
    sendMessage: async () => {
      throw new Error("unused");
    },
    searchContacts: async () => "not_supported",
    searchConversations: async () => "not_supported",
    addContact: async () => "not_supported",
    removeContact: async () => "not_supported",
    ...overrides,
  };
}
