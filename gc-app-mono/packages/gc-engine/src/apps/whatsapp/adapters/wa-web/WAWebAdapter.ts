import type { IWAWebAdapter } from "../../core/ports/outbound/IWAWebAdapter";
import type {
  WAChat,
  WAContact,
  WAMessage,
  WAUserInfo,
  SocketState,
} from "../../sdk/types";
import { ModuleLoader } from "./ModuleLoader";
import {
  AuthBinding,
  ChatBinding,
  MessageBinding,
  ContactBinding,
} from "./bindings";

/**
 * WhatsApp Web API 适配器
 * 实现 IWAWebAdapter 接口，封装与 WhatsApp Web 内部模块的交互
 */
export class WAWebAdapter implements IWAWebAdapter {
  private moduleLoader: ModuleLoader;
  private authBinding!: AuthBinding;
  private chatBinding!: ChatBinding;
  private messageBinding!: MessageBinding;
  private contactBinding!: ContactBinding;
  private cleanupFns: (() => void)[] = [];
  private _isInitialized = false;

  constructor() {
    this.moduleLoader = new ModuleLoader();
  }

  async waitForReady(): Promise<void> {
    await this.pollUntil(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).Debug?.VERSION !== undefined,
      5 * 60_000,
    );
  }

  initialize(): void {
    if (this._isInitialized) {
      return;
    }

    this.authBinding = new AuthBinding(this.moduleLoader);
    this.chatBinding = new ChatBinding(this.moduleLoader);
    this.messageBinding = new MessageBinding(
      this.moduleLoader,
      this.chatBinding,
    );
    this.contactBinding = new ContactBinding(this.chatBinding);

    this.exposeToGlobal();
    this._isInitialized = true;
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this._isInitialized = false;
  }

  // ========== 认证相关 ==========
  isLoggedIn(): boolean {
    return this.authBinding.isLoggedIn();
  }

  async getCurrentUser(): Promise<WAUserInfo | null> {
    return this.authBinding.getCurrentUser();
  }

  onLoginStatusChange(callback: (isLoggedIn: boolean) => void): () => void {
    const cleanup = this.authBinding.onLoginStatusChange(callback);
    this.cleanupFns.push(cleanup);
    return cleanup;
  }

  onLogout(callback: () => void): () => void {
    const cleanup = this.authBinding.onLogout(callback);
    this.cleanupFns.push(cleanup);
    return cleanup;
  }

  onSocketStateChange(callback: (state: SocketState) => void): () => void {
    const cleanup = this.authBinding.onSocketStateChange(callback);
    this.cleanupFns.push(cleanup);
    return cleanup;
  }

  // ========== 聊天相关 ==========
  getAllChats(): WAChat[] {
    return this.chatBinding.getAllChats();
  }

  getActiveChat(): WAChat | null {
    return this.chatBinding.getActiveChat();
  }

  getChatById(chatId: string): WAChat | null {
    return this.chatBinding.getChatById(chatId);
  }

  onChatChange(callback: (chat: WAChat) => void): () => void {
    const cleanup = this.chatBinding.onChatChange(callback);
    this.cleanupFns.push(cleanup);
    return cleanup;
  }

  onChatClose(callback: () => void): () => void {
    const cleanup = this.chatBinding.onChatClose(callback);
    this.cleanupFns.push(cleanup);
    return cleanup;
  }

  // ========== 消息相关 ==========
  onNewMessage(callback: (message: WAMessage) => void): () => void {
    const cleanup = this.messageBinding.onNewMessage(callback);
    this.cleanupFns.push(cleanup);
    return cleanup;
  }

  getMessagesByChat(chatId: string): WAMessage[] {
    return this.messageBinding.getMessagesByChat(chatId);
  }

  async sendTextMessage(chatId: string, text: string): Promise<void> {
    return this.messageBinding.sendTextMessage(chatId, text);
  }

  // ========== 联系人相关 ==========
  getAllContacts(type?: "group" | "private"): WAContact[] {
    return this.contactBinding.getAllContacts(type);
  }

  getContactById(contactId: string): WAContact | null {
    return this.contactBinding.getContactById(contactId);
  }

  // ========== 私有方法 ==========
  private exposeToGlobal(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Store = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AppState: this.moduleLoader.get<any>("WAWebSocketModel")?.Socket,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Chat: this.moduleLoader.get<any>("WAWebCollections")?.Chat,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Contact: this.moduleLoader.get<any>("WAWebCollections")?.Contact,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Msg: this.moduleLoader.get<any>("WAWebCollections")?.Msg,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Cmd: this.moduleLoader.get<any>("WAWebCmd")?.Cmd,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Conn: this.moduleLoader.get<any>("WAWebConnModel")?.Conn,
    };
  }

  private pollUntil(
    condition: () => boolean,
    timeout: number,
    interval = 100,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error("Timeout waiting for condition"));
        } else {
          setTimeout(check, interval);
        }
      };
      check();
    });
  }
}
