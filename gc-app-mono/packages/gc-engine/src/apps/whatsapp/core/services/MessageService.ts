import type { IWAWebAdapter } from "../ports/outbound/IWAWebAdapter";
import type { IReporter } from "../ports/outbound/IReporter";
import type { IEventBus } from "../ports/outbound/IEventBus";
import type { WAMessage } from "../../sdk/types";
import type { MiddlewareMessage } from "../../../../middleware/types";

const DEBOUNCE_MS = 500;
const MAX_BUFFER_SIZE = 100;

/**
 * 消息服务
 * 负责管理消息监听和发送
 */
export class MessageService {
  private messageBuffer: MiddlewareMessage[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly waAdapter: IWAWebAdapter,
    private readonly reporter: IReporter,
    private readonly eventBus: IEventBus,
  ) {}

  /**
   * 初始化消息监听
   */
  initialize(): () => void {
    console.log("[MessageService] Initializing message listener");

    const unsubscribe = this.waAdapter.onNewMessage((message) => {
      const isFromMe = !!message.id?.fromMe;

      console.log(`[MessageService] New message: id=${message.id?._serialized}, chat=${message.id?.remote}, fromMe=${isFromMe}`);

      if (!isFromMe) {
        this.eventBus.emit({
          type: "message:new",
          timestamp: Date.now(),
          payload: { message },
        });
      }

      this.bufferMessage(message);
    });

    return () => {
      unsubscribe();
      this.flush();
    };
  }

  private bufferMessage(message: WAMessage): void {
    const reportable = this.toMiddlewareMessage(message);
    this.messageBuffer.push(reportable);

    if (this.messageBuffer.length >= MAX_BUFFER_SIZE) {
      this.flush();
      return;
    }

    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  private flush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.messageBuffer.length === 0) return;

    const batch = this.messageBuffer.splice(0);
    console.log(`[MessageService] Flushing ${batch.length} messages`);
    void this.reporter.reportMessages(batch);
  }

  destroy(): void {
    this.flush();
  }

  toMiddlewareMessage(msg: WAMessage): MiddlewareMessage {
    const timestampMs = msg.clientReceivedTsMillis ?? Math.floor(msg.t * 1000);
    const serialized = msg.id?._serialized ?? "";
    const fromMe = msg.id?.fromMe === true || serialized.startsWith("true_");
    return {
      messageId: serialized || msg.id?.id || "",
      chatId: msg.id?.remote ?? "",
      senderId: msg.author ?? msg.from ?? "",
      senderName: msg.notifyName || undefined,
      fromMe,
      content: msg.body ?? "",
      timestamp: timestampMs,
      messageType: msg.type ?? "unknown",
      version: 1,
      updatedAt: timestampMs,
    };
  }

  async sendTextMessage(chatId: string, text: string): Promise<void> {
    return this.waAdapter.sendTextMessage(chatId, text);
  }

  getMessagesByChat(chatId: string): WAMessage[] {
    return this.waAdapter.getMessagesByChat(chatId);
  }
}
