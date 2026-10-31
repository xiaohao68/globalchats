import type { IReporter } from "../../core/ports/outbound/IReporter";
import type { GCEngineMiddleware } from "../../../../middleware/GCEngineMiddleware";
import type { IThirdAppUserInfo } from "@gc/model";
import type {
  MiddlewareMessage,
  MiddlewareConversation,
  MiddlewareContact,
  MiddlewareStatusEvent,
  ReportResult,
} from "../../../../middleware/types";
import { MessageQueue } from "./MessageQueue";
import { ImtpBackend } from "../../../../middleware/backend/imtpBackend.ts";

type QueueItemType = "messages" | "conversations" | "contacts" | "history";

interface QueueItem {
  type: QueueItemType;
  data: unknown;
  timestamp: number;
}

/**
 * 上报适配器
 * 实现本地队列 + 异步上报 + 重试机制
 * 使用 IMTP 协议上报
 */
export class ReporterAdapter implements IReporter {
  private messageQueue: MessageQueue<QueueItem>;
  private middleware: GCEngineMiddleware;
  private imtpBackend: ImtpBackend;
  private _isReporting = true;

  constructor(middleware: GCEngineMiddleware, imtpBackend?: ImtpBackend) {
    this.middleware = middleware;
    this.imtpBackend = imtpBackend ?? new ImtpBackend();
    this.messageQueue = new MessageQueue<QueueItem>({
      maxSize: 1000,
      flushInterval: 1000,
      flushThreshold: 50,
    });
    this.messageQueue.onFlush(this.processQueue.bind(this));
  }

  // ========== 状态上报（立即） ==========
  async reportStatusChange(event: MiddlewareStatusEvent): Promise<ReportResult> {
    return this.middleware.reportStatusChange(event);
  }

  async reportCurrentUser(user: IThirdAppUserInfo): Promise<ReportResult> {
    console.log(`[ReporterAdapter] reportCurrentUser: id=${user.id}, nickname=${user.nickname}`);
    const result = await this.middleware.reportCurrentUser(user);
    console.log(`[ReporterAdapter] reportCurrentUser result: status=${result.status}, accountId=${this.imtpBackend.getCurrentAccountId()}`);
    return result;
  }

  // ========== 数据上报（走队列） ==========
  async reportConversations(
    conversations: MiddlewareConversation[],
  ): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    console.log(`[ReporterAdapter] reportConversations: count=${conversations.length}`);
    this.messageQueue.enqueue({
      type: "conversations",
      data: conversations,
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: conversations.length };
  }

  async reportContacts(contacts: MiddlewareContact[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    console.log(`[ReporterAdapter] reportContacts: count=${contacts.length}`);
    this.messageQueue.enqueue({
      type: "contacts",
      data: contacts,
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: contacts.length };
  }

  async reportMessages(messages: MiddlewareMessage[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    console.log(`[ReporterAdapter] reportMessages: count=${messages.length}`);
    this.messageQueue.enqueue({
      type: "messages",
      data: messages,
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: messages.length };
  }

  async reportHistory(
    chatId: string,
    messages: MiddlewareMessage[],
  ): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: "success", correlationId: "", acceptedCount: 0 };
    }

    console.log(`[ReporterAdapter] reportHistory: chatId=${chatId}, count=${messages.length}`);
    this.messageQueue.enqueue({
      type: "history",
      data: { chatId, messages },
      timestamp: Date.now(),
    });

    return { status: "success", correlationId: "", acceptedCount: messages.length };
  }

  // ========== 控制 ==========
  pause(): void {
    this._isReporting = false;
    console.log("[ReporterAdapter] Reporting paused");
  }

  resume(): void {
    this._isReporting = true;
    console.log("[ReporterAdapter] Reporting resumed");
  }

  isReporting(): boolean {
    return this._isReporting;
  }

  destroy(): void {
    this.messageQueue.destroy();
  }

  // ========== 私有方法 ==========
  private async processQueue(items: QueueItem[]): Promise<void> {
    const grouped = this.groupByType(items);
    const types = Object.keys(grouped);

    console.log(`[ReporterAdapter] Processing queue: ${items.length} items, types: [${types.join(", ")}]`);

    for (const [type, data] of Object.entries(grouped)) {
      try {
        await this.processGroupedItems(type as QueueItemType, data);
      } catch (error) {
        console.error(`[ReporterAdapter] Failed to process ${type}, requeueing ${data.length} items:`, error);
        data.forEach((item) => this.messageQueue.enqueue(item));
      }
    }

    console.log(`[ReporterAdapter] Queue processed: ${items.length} items`);
  }

  private groupByType(items: QueueItem[]): Record<string, QueueItem[]> {
    const result: Record<string, QueueItem[]> = {};
    for (const item of items) {
      if (!result[item.type]) {
        result[item.type] = [];
      }
      result[item.type]!.push(item);
    }
    return result;
  }

  private async processGroupedItems(
    type: QueueItemType,
    items: QueueItem[],
  ): Promise<void> {
    console.log(`[ReporterAdapter] processGroupedItems: type=${type}, items=${items.length}, accountId=${this.imtpBackend.getCurrentAccountId()}`);
    switch (type) {
      case "messages": {
        const messages = items.flatMap((i) => i.data as MiddlewareMessage[]);
        await this.imtpBackend.pushMessages(
          this.middleware.scope,
          messages,
        );
        break;
      }
      case "conversations": {
        const conversations = items.flatMap(
          (i) => i.data as MiddlewareConversation[],
        );
        await this.imtpBackend.pushConversations(
          this.middleware.scope,
          conversations,
        );
        break;
      }
      case "contacts": {
        const contacts = items.flatMap((i) => i.data as MiddlewareContact[]);
        await this.imtpBackend.pushContacts(
          this.middleware.scope,
          contacts,
        );
        break;
      }
      case "history": {
        for (const item of items) {
          const { chatId, messages } = item.data as {
            chatId: string;
            messages: MiddlewareMessage[];
          };
          await this.imtpBackend.pushHistory(
            this.middleware.scope,
            chatId,
            messages,
          );
        }
        break;
      }
    }
  }
}
