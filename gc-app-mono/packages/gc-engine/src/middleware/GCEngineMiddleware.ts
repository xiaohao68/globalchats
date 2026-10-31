import type { IThirdAppUserInfo } from "@gc/model";
import { generateCorrelationId } from "./observability/correlation.ts";
import { normalizeError } from "./errors/normalizeError.ts";
import { withRetry } from "./retry/retry.ts";
import { DedupeStore } from "./dedupe/dedupeStore.ts";
import type { BackendApi } from "./backend/backendApi.ts";
import { toMiddlewareUser } from "./mappers/index.ts";
import { RealtimeEventBus } from "./realtime/eventBus.ts";
import type {
  BaseResult,
  ListData,
  MiddlewareContact,
  MiddlewareConversation,
  MiddlewareDomainEvent,
  MiddlewareMessage,
  MiddlewareStatusEvent,
  ReportResult,
  RetryOptions,
  SourceScope,
} from "./types.ts";

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 2_000,
  jitterRatio: 0.2,
};

const RETRYABLE_CATEGORIES = new Set<string>(["network", "ratelimit", "backend"]);

function isRetryableCategory(category: string): boolean {
  return RETRYABLE_CATEGORIES.has(category);
}

export type MiddlewareOptions = {
  backend: BackendApi;
  dedupeStore?: DedupeStore;
  retry?: RetryOptions;
  now?: () => number;
  getCurrentUser?: () => IThirdAppUserInfo | null;
  eventBus?: RealtimeEventBus;
};

export class GCEngineMiddleware {
  readonly scope: SourceScope;
  readonly #backend: BackendApi;
  readonly #dedupe: DedupeStore;
  readonly #retry: RetryOptions;
  readonly #now: () => number;
  readonly #getCurrentUser?: () => IThirdAppUserInfo | null;
  readonly #eventBus: RealtimeEventBus;
  #isReporting = true;

  get backend(): BackendApi {
    return this.#backend;
  }

  constructor(scope: SourceScope, options: MiddlewareOptions) {
    this.scope = scope;
    this.#backend = options.backend;
    this.#dedupe =
      options.dedupeStore ??
      new DedupeStore({ windowMs: 2 * 60_000, maxKeysPerScope: 10_000 });
    this.#retry = options.retry ?? DEFAULT_RETRY_OPTIONS;
    this.#now = options.now ?? (() => Date.now());
    this.#getCurrentUser = options.getCurrentUser;
    this.#eventBus = options.eventBus ?? new RealtimeEventBus();
  }

  isReporting(): boolean {
    return this.#isReporting;
  }

  pauseReporting(): void {
    this.#isReporting = false;
  }

  resumeReporting(): void {
    this.#isReporting = true;
  }

  async #withRetryAndResult<T>(
    correlationId: string,
    fn: () => Promise<T>,
  ): Promise<BaseResult<T>> {
    try {
      const data = await withRetry(fn, {
        ...this.#retry,
        shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
      });
      return { status: "success", correlationId, data };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  onNewMessage(handler: (message: MiddlewareMessage) => void): () => void {
    return this.#eventBus.onNewMessage(handler);
  }

  publishNewMessages(messages: MiddlewareMessage[]): void {
    this.#eventBus.publishNewMessages(messages);
  }

  getCurrentUser(): BaseResult<IThirdAppUserInfo> {
    const correlationId = generateCorrelationId();
    const user = this.#getCurrentUser?.() ?? null;
    if (!user || !user.id) {
      return {
        status: "fatal_error",
        correlationId,
        error: {
          category: "sdk",
          message: "当前 WebView 未提供可用的登录用户信息（userInfo 为空）",
        },
      };
    }

    return { status: "success", correlationId, data: user };
  }

  async getContacts(input: {
    cursor?: string;
    limit?: number;
  }): Promise<BaseResult<ListData<MiddlewareContact>>> {
    const correlationId = generateCorrelationId();
    return this.#withRetryAndResult(correlationId, () =>
      this.#backend.getContacts(this.scope, input),
    );
  }

  async getUserById(userId: string): Promise<BaseResult<IThirdAppUserInfo>> {
    const correlationId = generateCorrelationId();
    const current = this.#getCurrentUser?.() ?? null;
    if (current?.id && current.id === userId) {
      return { status: "success", correlationId, data: current };
    }

    try {
      const data = await withRetry(
        () => this.#backend.getUserById(this.scope, userId),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      if (data === "not_supported") {
        return { status: "not_supported", correlationId };
      }

      if (!data) {
        return {
          status: "fatal_error",
          correlationId,
          error: { category: "backend", message: "用户不存在或不可访问" },
        };
      }

      return {
        status: "success",
        correlationId,
        data: {
          id: data.id,
          nickname: data.nickname,
          avatar: data.avatar,
          isGroup: data.isGroup,
          remarkName: data.remarkName,
          phone: data.phone,
        },
      };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async getMessages(input: {
    conversationId?: string;
    userId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<BaseResult<ListData<MiddlewareMessage>>> {
    const correlationId = generateCorrelationId();
    return this.#withRetryAndResult(correlationId, () =>
      this.#backend.getMessages(this.scope, input),
    );
  }

  async sendMessage(input: {
    receiverId: string;
    content: string;
  }): Promise<BaseResult<MiddlewareMessage>> {
    const correlationId = generateCorrelationId();
    const current = this.#getCurrentUser?.() ?? null;
    if (!current?.id) {
      return {
        status: "fatal_error",
        correlationId,
        error: {
          category: "sdk",
          message: "发送消息前必须已登录且有 current userId",
        },
      };
    }

    return this.#withRetryAndResult(correlationId, () =>
      this.#backend.sendMessage(this.scope, {
        senderId: current.id,
        receiverId: input.receiverId,
        content: input.content,
      }),
    );
  }

  async searchContacts(input: {
    query: string;
    limit?: number;
  }): Promise<BaseResult<ListData<MiddlewareContact>>> {
    const correlationId = generateCorrelationId();
    try {
      const data = await withRetry(
        () => this.#backend.searchContacts(this.scope, input),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      if (data === "not_supported") {
        return { status: "not_supported", correlationId };
      }

      return { status: "success", correlationId, data };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async addContact(contactId: string): Promise<BaseResult<void>> {
    const correlationId = generateCorrelationId();
    try {
      const res = await withRetry(
        () => this.#backend.addContact(this.scope, contactId),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      if (res === "not_supported") {
        return { status: "not_supported", correlationId };
      }

      return { status: "success", correlationId };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async removeContact(contactId: string): Promise<BaseResult<void>> {
    const correlationId = generateCorrelationId();
    try {
      const res = await withRetry(
        () => this.#backend.removeContact(this.scope, contactId),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      if (res === "not_supported") {
        return { status: "not_supported", correlationId };
      }

      return { status: "success", correlationId };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async reportCurrentUser(user: IThirdAppUserInfo): Promise<ReportResult> {
    const correlationId = generateCorrelationId();
    const middlewareUser = toMiddlewareUser(user, this.#now());

    try {
      await withRetry(
        () => this.#backend.pushCurrentUser(this.scope, middlewareUser),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      return { status: "success", correlationId, acceptedCount: 1 };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async reportContacts(contacts: MiddlewareContact[]): Promise<ReportResult> {
    if (!this.#isReporting) {
      return { status: "success", correlationId: generateCorrelationId(), acceptedCount: 0 };
    }

    const correlationId = generateCorrelationId();
    try {
      await withRetry(
        () => this.#backend.pushContacts(this.scope, contacts),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      return { status: "success", correlationId, acceptedCount: contacts.length };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async reportStatusChange(event: MiddlewareStatusEvent): Promise<ReportResult> {
    const correlationId = generateCorrelationId();

    if (event.eventType === "logout") {
      this.pauseReporting();
    } else if (event.eventType === "login") {
      this.resumeReporting();
    }

    try {
      await withRetry(
        () => this.#backend.pushStatusEvent(this.scope, event),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      return { status: "success", correlationId, acceptedCount: 1 };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async reportConversations(conversations: MiddlewareConversation[]): Promise<ReportResult> {
    if (!this.#isReporting) {
      return { status: "success", correlationId: generateCorrelationId(), acceptedCount: 0 };
    }

    const correlationId = generateCorrelationId();
    try {
      await withRetry(
        () => this.#backend.pushConversations(this.scope, conversations),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      return { status: "success", correlationId, acceptedCount: conversations.length };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async getConversations(input: {
    cursor?: string;
    limit?: number;
  }): Promise<BaseResult<ListData<MiddlewareConversation>>> {
    const correlationId = generateCorrelationId();
    return this.#withRetryAndResult(correlationId, () =>
      this.#backend.getConversations(this.scope, input),
    );
  }

  async searchConversations(input: {
    query: string;
    limit?: number;
  }): Promise<BaseResult<ListData<MiddlewareConversation>>> {
    const correlationId = generateCorrelationId();
    try {
      const data = await withRetry(
        () => this.#backend.searchConversations(this.scope, input),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      if (data === "not_supported") {
        return { status: "not_supported", correlationId };
      }

      return { status: "success", correlationId, data };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async reportMessages(messages: MiddlewareMessage[]): Promise<ReportResult> {
    if (!this.#isReporting) {
      return { status: "success", correlationId: generateCorrelationId(), acceptedCount: 0 };
    }

    const correlationId = generateCorrelationId();
    const now = this.#now();

    let dedupedCount = 0;
    const accepted = messages.filter((message) => {
      const key = `msg:${message.messageId}`;
      const isNew = this.#dedupe.checkAndMark(this.scope, key, now);
      if (!isNew) dedupedCount += 1;
      return isNew;
    });

    if (accepted.length === 0) {
      return { status: "success", correlationId, acceptedCount: 0, dedupedCount };
    }

    try {
      const res = await withRetry(
        () => this.#backend.pushMessages(this.scope, accepted),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      return { status: "success", correlationId, acceptedCount: res.acceptedCount, dedupedCount };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized, dedupedCount };
    }
  }

  async reportHistory(
    conversationId: string,
    messages: MiddlewareMessage[],
  ): Promise<ReportResult> {
    const correlationId = generateCorrelationId();
    try {
      const res = await withRetry(
        () => this.#backend.pushHistory(this.scope, conversationId, messages),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      return { status: "success", correlationId, acceptedCount: res.acceptedCount };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized };
    }
  }

  async reportEvents(events: MiddlewareDomainEvent[]): Promise<ReportResult> {
    const correlationId = generateCorrelationId();
    const now = this.#now();

    let dedupedCount = 0;
    const accepted = events.filter((event) => {
      const stableKey = event.eventId
        ? `evt:${event.eventId}`
        : `evt:${event.type}:${event.occurredAt}`;
      const isNew = this.#dedupe.checkAndMark(this.scope, stableKey, now);
      if (!isNew) dedupedCount += 1;
      return isNew;
    });

    if (accepted.length === 0) {
      return { status: "success", correlationId, acceptedCount: 0, dedupedCount };
    }

    try {
      const res = await withRetry(
        () => this.#backend.pushEvents(this.scope, accepted),
        {
          ...this.#retry,
          shouldRetry: (error) => isRetryableCategory(normalizeError(error).category),
        },
      );

      if (res === "not_supported") {
        return { status: "not_supported", correlationId, dedupedCount };
      }

      return { status: "success", correlationId, acceptedCount: res.acceptedCount, dedupedCount };
    } catch (error) {
      const normalized = normalizeError(error);
      const status = isRetryableCategory(normalized.category)
        ? "retryable_error"
        : "fatal_error";
      return { status, correlationId, error: normalized, dedupedCount };
    }
  }
}
