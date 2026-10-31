import type {
  MiddlewareContact,
  MiddlewareConversation,
  MiddlewareDomainEvent,
  MiddlewareMessage,
  MiddlewareStatusEvent,
  MiddlewareUser,
  ListData,
  PaginationInput,
  SourceScope,
} from "../types.ts";

export type BackendReportSummary = {
  acceptedCount: number;
};

export interface BackendApi {
  // === 上报接口 ===

  pushCurrentUser: (
    scope: SourceScope,
    user: MiddlewareUser,
  ) => Promise<BackendReportSummary>;

  pushStatusEvent: (
    scope: SourceScope,
    event: MiddlewareStatusEvent,
  ) => Promise<BackendReportSummary>;

  pushContacts: (
    scope: SourceScope,
    contacts: MiddlewareContact[],
  ) => Promise<BackendReportSummary>;

  pushConversations: (
    scope: SourceScope,
    conversations: MiddlewareConversation[],
  ) => Promise<BackendReportSummary>;

  pushMessages: (
    scope: SourceScope,
    messages: MiddlewareMessage[],
  ) => Promise<BackendReportSummary>;

  pushEvents: (
    scope: SourceScope,
    events: MiddlewareDomainEvent[],
  ) => Promise<BackendReportSummary | "not_supported">;

  pushHistory: (
    scope: SourceScope,
    conversationId: string,
    messages: MiddlewareMessage[],
  ) => Promise<BackendReportSummary>;

  // === 查询接口 ===

  getContacts: (
    scope: SourceScope,
    input: PaginationInput,
  ) => Promise<ListData<MiddlewareContact>>;

  getConversations: (
    scope: SourceScope,
    input: PaginationInput,
  ) => Promise<ListData<MiddlewareConversation>>;

  getMessages: (
    scope: SourceScope,
    input: {
      conversationId?: string;
      userId?: string;
      cursor?: string;
      limit?: number;
    },
  ) => Promise<ListData<MiddlewareMessage>>;

  getUserById: (
    scope: SourceScope,
    userId: string,
  ) => Promise<MiddlewareUser | null | "not_supported">;

  // === 操作接口 ===

  sendMessage: (
    scope: SourceScope,
    input: { senderId: string; receiverId: string; content: string },
  ) => Promise<MiddlewareMessage>;

  searchContacts: (
    scope: SourceScope,
    input: { query: string; limit?: number },
  ) => Promise<ListData<MiddlewareContact> | "not_supported">;

  searchConversations: (
    scope: SourceScope,
    input: { query: string; limit?: number },
  ) => Promise<ListData<MiddlewareConversation> | "not_supported">;

  addContact: (
    scope: SourceScope,
    contactId: string,
  ) => Promise<"not_supported" | { success: true }>;

  removeContact: (
    scope: SourceScope,
    contactId: string,
  ) => Promise<"not_supported" | { success: true }>;
}
