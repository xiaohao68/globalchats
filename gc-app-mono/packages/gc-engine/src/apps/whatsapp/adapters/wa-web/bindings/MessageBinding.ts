import type { ModuleLoader } from "../ModuleLoader";
import type { WAMessage, IStoreMsg } from "../../../sdk/types";
import type { ChatBinding } from "./ChatBinding";

/**
 * 消息模块绑定
 * 封装与 WhatsApp Web 消息相关的内部模块交互
 */
export class MessageBinding {
  private msgCollection: IStoreMsg | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendModule: any;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private moduleLoader: ModuleLoader,
    private chatBinding: ChatBinding,
  ) {
    this.initModules();
  }

  private initModules(): void {
    this.moduleLoader.clearCache();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collections = this.moduleLoader.get<any>("WAWebCollections");
    this.msgCollection = collections?.Msg ?? null;
    console.log(`[MessageBinding] initModules: msgCollection=${this.msgCollection ? "loaded" : "NULL"}`);

    this.sendModule = this.moduleLoader.get("WAWebSendTextMsgChatAction");

    // 同步刷新 chatBinding 的模块
    this.chatBinding.initModules();
  }

  /**
   * 监听新消息
   * WAWebCollections 可能在 Debug.VERSION 之后才加载（登录后），
   * 所以这里用轮询等待模块可用后再注册监听器
   */
  onNewMessage(callback: (message: WAMessage) => void): () => void {
    this.initModules();

    if (this.msgCollection) {
      return this.registerHandler(callback);
    }

    console.warn("[MessageBinding] msgCollection not available yet, polling until ready...");

    let cleanup: (() => void) | null = null;
    const POLL_INTERVAL = 2000;
    const MAX_POLL_TIME = 5 * 60_000;
    const startTime = Date.now();

    this.pollTimer = setInterval(() => {
      this.initModules();
      if (this.msgCollection) {
        console.log("[MessageBinding] msgCollection became available after polling");
        this.stopPolling();
        cleanup = this.registerHandler(callback);
      } else if (Date.now() - startTime > MAX_POLL_TIME) {
        console.error("[MessageBinding] Gave up waiting for msgCollection after 5 minutes");
        this.stopPolling();
      }
    }, POLL_INTERVAL);

    return () => {
      this.stopPolling();
      cleanup?.();
    };
  }

  private registerHandler(callback: (message: WAMessage) => void): () => void {
    const handler = (msg: WAMessage) => {
      if (msg.isNewMsg) {
        callback(msg);
      }
    };
    this.msgCollection!.on("add", handler);
    console.log("[MessageBinding] Message listener registered on msgCollection");
    return () => this.msgCollection!.off("add", handler);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * 获取聊天的消息历史
   */
  getMessagesByChat(chatId: string): WAMessage[] {
    const chatModel = this.chatBinding.getChatModelById(chatId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(chatModel as any)?.msgs?._models) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (chatModel as any).msgs._models as WAMessage[];
  }

  /**
   * 发送文本消息
   */
  async sendTextMessage(chatId: string, text: string): Promise<void> {
    if (!this.sendModule) {
      throw new Error("Send module not available");
    }

    const chatModel = this.chatBinding.getChatModelById(chatId);
    if (!chatModel) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    this.sendModule.sendTextMsgToChat(chatModel, text);
  }
}
