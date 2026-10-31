import type { ModuleLoader } from "../ModuleLoader";
import type { WAChat, IStoreChat, IWAChatModel } from "../../../sdk/types";

/**
 * 聊天模块绑定
 * 封装与 WhatsApp Web 聊天相关的内部模块交互
 */
export class ChatBinding {
  private chatCollection: IStoreChat | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cmd: any;

  constructor(private moduleLoader: ModuleLoader) {
    this.initModules();
  }

  initModules(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collections = this.moduleLoader.get<any>("WAWebCollections");
    this.chatCollection = collections?.Chat ?? null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmdModule = this.moduleLoader.get<any>("WAWebCmd");
    this.cmd = cmdModule?.Cmd;
  }

  /**
   * 获取所有聊天列表
   */
  getAllChats(): WAChat[] {
    if (!this.chatCollection) {
      return [];
    }

    const chatModels = this.chatCollection.getModelsArray();
    return chatModels.map((model) => {
      const chat = model.serialize();
      const resolvedName = this.resolveChatName(model, chat);
      if (resolvedName) {
        chat.contact = { ...chat.contact, name: resolvedName } as typeof chat.contact;
      }
      return chat;
    });
  }

  /**
   * 获取当前激活的聊天
   */
  getActiveChat(): WAChat | null {
    if (!this.chatCollection) {
      return null;
    }

    if (this.chatCollection.getActive) {
      const active = this.chatCollection.getActive();
      return active?.serialize() ?? null;
    }

    const chats = this.chatCollection.getModelsArray();
    const active = chats.find((chat) => chat.active);
    return active?.serialize() ?? null;
  }

  /**
   * 根据 ID 获取聊天
   */
  getChatById(chatId: string): WAChat | null {
    if (!this.chatCollection) {
      return null;
    }

    const chat = this.chatCollection.get(chatId);
    return chat?.serialize() ?? null;
  }

  /**
   * 获取聊天模型（内部使用）
   */
  getChatModelById(chatId: string): IWAChatModel | undefined {
    if (!this.chatCollection) {
      return undefined;
    }
    return this.chatCollection.get(chatId);
  }

  /**
   * 监听聊天切换事件
   */
  onChatChange(callback: (chat: WAChat) => void): () => void {
    if (!this.cmd) {
      return () => {};
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (conversation: any) => {
      if (conversation?.chat) {
        const serialized = conversation.chat.serialize?.();
        if (serialized) {
          callback(serialized);
        }
      }
    };

    this.cmd.on("open_chat", handler);
    return () => this.cmd.off("open_chat", handler);
  }

  /**
   * 监听聊天关闭事件
   */
  onChatClose(callback: () => void): () => void {
    if (!this.cmd) {
      return () => {};
    }

    this.cmd.on("close_chat", callback);
    return () => this.cmd.off("close_chat", callback);
  }

  private isJid(value: string): boolean {
    return /^\d{5,}$/.test(value);
  }

  private resolveChatName(model: IWAChatModel, chat: WAChat): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = model as any;
    const c = m.contact;

    const candidates: Array<string | undefined | null> = [
      typeof model.title === "function" ? model.title() : undefined,
      m.formattedTitle,
      m.name,
      c?.pushname,
      c?.name,
      c?.shortName,
      c?.verifiedName,
      c?.notifyName,
    ];

    const jidUser = chat.id._serialized.split("@")[0] || "";

    for (const candidate of candidates) {
      if (
        typeof candidate === "string" &&
        candidate.length > 0 &&
        candidate !== jidUser &&
        candidate !== chat.id._serialized &&
        !this.isJid(candidate)
      ) {
        return candidate;
      }
    }

    return "";
  }
}
