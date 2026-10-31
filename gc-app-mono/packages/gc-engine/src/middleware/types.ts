import type { EPlatform, IThirdAppUserInfo } from "@gc/model";

export type TimestampMs = number;

export type SourceScope = {
  appId: string;
  platform: EPlatform;
  webviewId: string;
};

export type ResultStatus =
  | "success"
  | "retryable_error"
  | "fatal_error"
  | "not_supported";

export type ErrorCategory =
  | "network"
  | "ratelimit"
  | "auth"
  | "validation"
  | "sdk"
  | "backend"
  | "unknown";

export type ErrorInfo = {
  category: ErrorCategory;
  message: string;
  retryAfterMs?: number;
};

export type BaseResult<TData> = {
  status: ResultStatus;
  correlationId: string;
  data?: TData;
  error?: ErrorInfo;
};

export type ReportResult = BaseResult<void> & {
  acceptedCount?: number;
  dedupedCount?: number;
};

export type ListData<TItem> = {
  items: TItem[];
  hasMore: boolean;
  nextCursor?: string;
};

export type Versioned = {
  version: number;
  updatedAt: TimestampMs;
};

export type MiddlewareUser = IThirdAppUserInfo & Versioned;

export type MiddlewareContact = {
  contactId: string;
  nickname: string;
  avatar?: string;
  remarkName?: string;
  phone?: string;
} & Versioned;

export type MiddlewareMessage = {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  fromMe?: boolean;
  content: string;
  timestamp: TimestampMs;
  messageType: string;
} & Versioned;

export type MiddlewareDomainEvent = {
  eventId?: string;
  type: string;
  occurredAt: TimestampMs;
  payload?: unknown;
} & Versioned;

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
};

export type ConversationType = "private" | "group";

export type MiddlewareConversation = {
  conversationId: string;
  type: ConversationType;
  title: string;
  avatar?: string;
  lastMessageTime?: TimestampMs;
  unreadCount?: number;
  memberCount?: number;
  participants?: string[];
} & Versioned;

export type LoginStatus = "logged_in" | "logged_out" | "connecting";

export type StatusEventType = "login" | "logout" | "status_change";

export type MiddlewareStatusEvent = {
  eventType: StatusEventType;
  userId?: string;
  status: LoginStatus;
  timestamp: TimestampMs;
};

export type HistoryQueryParams = {
  conversationId: string;
  beforeTime?: TimestampMs;
  limit?: number;
  daysBack?: number;
};

export type HistoryBatchParams = {
  daysBack?: number;
  batchSize?: number;
};

export type PaginationInput = {
  cursor?: string;
  limit?: number;
};

export type SearchInput = {
  query: string;
  limit?: number;
};

export type SearchResult = {
  contacts: ListData<MiddlewareContact>;
  conversations: ListData<MiddlewareConversation>;
};

export type SendMessageInput = {
  senderId: string;
  receiverId: string;
  content: string;
};
