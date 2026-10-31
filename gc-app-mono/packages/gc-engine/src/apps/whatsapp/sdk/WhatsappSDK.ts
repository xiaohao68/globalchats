import { domReady } from "@gc/utils";
import type { IThirdAppUserInfo } from "@gc/model";
import { appStore } from "@gc/store";
import { createLogger } from "@gc/logger";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK";
import { ESDKEventType } from "../../engine/sdk/SDKEvent";
import {
  initAuthStore,
  getAppState,
  getAuthCmd,
  getAuthConn,
} from "./modules/authStore";
import {
  EventHandlerManager,
  registerLoginStatusHandler,
  registerLogoutHandler,
  registerChatChangeHandler,
} from "./events";
import { pollExcFn, isGroupId } from "./utils";
import { moduleLoader } from "./modules/moduleLoader";
import type {
  WAUserInfo,
  IStoreContact,
  IWAContactMethods,
  IStoreChat,
  IWAChatModel,
  WAWid,
  WAChat,
  WAContact,
  WAHistoryMessage,
  SocketState,
} from "./types";
import { NotLoggedInError, MessageSendError, ChatNotFoundError } from "./types";
import { getAllChats, getActiveChat } from "./modules/chatCollection";
import { getAllContacts, findContactById } from "./modules/contactCollection";
import { getMessagesByChatId, onNewMessage, loadEarlierMessages } from "./modules/messageCollection";
import { registerSocketStateHandler, registerChatCloseHandler } from "./events";
import { getDefaultMiddlewareForCurrentWebview } from "../../../middleware/defaultMiddleware.ts";
import { whatsappAdapter } from "../../../middleware/adapters/whatsappAdapter.ts";

interface IProfilePic {
  requestProfilePicFromServer: (wid: WAWid) => Promise<{
    eurl: string;
    previewEurl: string;
  }>;
}

const logger = createLogger("preload", "WhatsAppSDK");

/**
 * WhatsApp SDK 实现
 */
class WhatsAppSDK extends AbstractAppSDK {
  private _isInjected = false;
  private eventManager = new EventHandlerManager();
  private _storeChat: IStoreChat | null = null;
  private _storeContact: IStoreContact | null = null;
  private _contactMethods: IWAContactMethods | null = null;
  private _profilePic: IProfilePic | null = null;

  /**
   * 重写父类的 isLoginEd getter
   * 使用 hasSynced 而不是 currentUserId 来判断登录状态
   * 因为 Conn.wid 可能在登录后才可用
   */
  get isLoginEd(): boolean {
    return this.isLoggedIn;
  }

  get isLoggedIn(): boolean {
    if (!this._isInjected) {
      return false;
    }
    const appState = getAppState();
    return appState?.hasSynced ?? false;
  }

  get isLoginPage(): boolean {
    return !this.isLoggedIn;
  }

  get isChatPage(): boolean {
    return this.isLoggedIn;
  }

  get currentUserId(): string | null {
    if (!this.isLoggedIn) {
      return null;
    }
    const conn = getAuthConn();
    return conn?.wid?._serialized ?? null;
  }

  get currentChatUserId(): string {
    const currentChatUser = appStore.getCurrentChatUserByAppId();
    return currentChatUser?.id || "";
  }

  private async awaitAppReady(): Promise<void> {
    await pollExcFn(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).Debug?.VERSION !== undefined,
      5 * 60_000,
    );
  }

  async mount(): Promise<void> {
    super.mount();
    await domReady();
    await this.awaitAppReady();
    this.injectModules();
  }

  destroy(): void {
    super.destroy();
    this.eventManager.cleanup();
    this._isInjected = false;
  }

  private injectModules(): void {
    logger.info("injectModules: starting module injection");
    initAuthStore();

    const appState = getAppState();
    if (!appState) {
      logger.error("injectModules: failed to initialize AuthStore");
      throw new Error("Failed to initialize AuthStore");
    }

    const isAlreadyLoggedIn = appState.hasSynced;
    logger.info("injectModules: checking login status", { isAlreadyLoggedIn, hasSynced: appState.hasSynced });
    if (isAlreadyLoggedIn) {
      this.injectAfterLogin();
    }

    const loginCleanup = registerLoginStatusHandler(appState, (isLogin) => {
      if (isLogin && !this._isInjected) {
        this.injectAfterLogin();
      }
      this.emitter.emit(ESDKEventType.changeLoginStatus, {
        payload: { isLogin },
      });
    });
    this.eventManager.add(loginCleanup);

    const authCmd = getAuthCmd();
    if (authCmd) {
      const logoutCleanup = registerLogoutHandler(authCmd, () => {
        this.emitter.emit(ESDKEventType.logout, { payload: undefined });
        this.clearCurrentUserInfo();
        this._isInjected = false;

        const middleware = getDefaultMiddlewareForCurrentWebview();
        if (middleware) {
          void middleware.reportStatusChange({
            eventType: "logout",
            status: "logged_out",
            timestamp: Date.now(),
          });
        }
      });
      this.eventManager.add(logoutCleanup);
    }

    // 如果用户已登录，手动发出初始登录状态事件
    if (isAlreadyLoggedIn) {
      this.emitter.emit(ESDKEventType.changeLoginStatus, {
        payload: { isLogin: true },
      });
    }
  }

  private injectAfterLogin(): void {
    if (this._isInjected) {
      logger.debug("injectAfterLogin: already injected, skipping");
      return;
    }
    logger.info("injectAfterLogin: starting injection");
    this._isInjected = true;
    this.initStore();
    this.registerChatEventListeners();
    this.registerMessageEventListeners();
    void this.performInitialSync();
  }

  private async performInitialSync(): Promise<void> {
    logger.info("performInitialSync: starting initial sync");
    const middleware = getDefaultMiddlewareForCurrentWebview();
    if (!middleware) {
      logger.warn("performInitialSync: middleware not available");
      return;
    }

    // 等待登录状态完全同步
    try {
      await pollExcFn(() => this.isLoggedIn, 10_000);
      logger.info("performInitialSync: login state synced", { isLoggedIn: this.isLoggedIn });
    } catch {
      logger.warn("performInitialSync: timeout waiting for login state");
      return;
    }

    try {
      // 1. 上报登录状态
      logger.info("performInitialSync: reporting login status");
      await middleware.reportStatusChange({
        eventType: "login",
        userId: this.currentUserId ?? undefined,
        status: "logged_in",
        timestamp: Date.now(),
      });

      // 2. 上报当前用户信息
      const userInfo = await this.getCurrentUserInfo();
      logger.info("performInitialSync: got userInfo", { hasUserInfo: !!userInfo });
      if (userInfo) {
        const middlewareUser = whatsappAdapter.toMiddlewareUser(userInfo);
        await middleware.reportCurrentUser(middlewareUser);
        logger.info("performInitialSync: reported current user", { userId: middlewareUser.id });
      }

      // 3. 先上报联系人列表（名称先到达后端）
      const contacts = this.getContacts();
      logger.info("performInitialSync: got contacts", { count: contacts.length });
      if (contacts.length > 0) {
        const middlewareContacts = contacts.map((contact) =>
          whatsappAdapter.toMiddlewareContact(contact),
        );
        await middleware.reportContacts(middlewareContacts);
        logger.info("performInitialSync: reported contacts", { count: middlewareContacts.length });
      }

      // 4. 再上报会话列表
      const chats = this.getChats();
      logger.info("performInitialSync: got chats", { count: chats.length });
      if (chats.length > 0) {
        const conversations = chats.map((chat) =>
          whatsappAdapter.toMiddlewareConversation(chat),
        );
        await middleware.reportConversations(conversations);
        logger.info("performInitialSync: reported conversations", { count: conversations.length });
      }

      // 5. 上报历史消息（遍历所有聊天会话）
      logger.info("performInitialSync: starting history sync");
      await this.syncHistoryMessages(middleware);
      logger.info("performInitialSync: completed initial sync");
    } catch (error) {
      logger.error("performInitialSync: initial sync failed", { error: String(error) });
      console.error("[WhatsApp SDK] Initial sync failed:", error);
    }
  }

  private async syncHistoryMessages(
    middleware: ReturnType<typeof getDefaultMiddlewareForCurrentWebview>,
  ): Promise<void> {
    if (!middleware) return;

    const BATCH_SIZE = 100;
    const MESSAGES_TO_LOAD = 50;

    const chats = this.getChats();
    logger.info("syncHistoryMessages: syncing history for chats", { count: chats.length });

    let totalSynced = 0;

    for (const chat of chats) {
      try {
        // 尝试加载该聊天的历史消息
        const messages = await loadEarlierMessages(chat.id._serialized, MESSAGES_TO_LOAD);
        if (!messages || messages.length === 0) {
          logger.info("syncHistoryMessages: no messages for chat", { chatId: chat.id._serialized });
          continue;
        }

        logger.info("syncHistoryMessages: loaded messages for chat", {
          chatId: chat.id._serialized,
          messageCount: messages.length,
        });

        const middlewareMessages = messages.map((msg) =>
          whatsappAdapter.toMiddlewareMessage(msg),
        );

        // 分批上报
        for (let i = 0; i < middlewareMessages.length; i += BATCH_SIZE) {
          const batch = middlewareMessages.slice(i, i + BATCH_SIZE);
          await middleware.reportHistory(chat.id._serialized, batch);
        }

        totalSynced += messages.length;
        logger.info("syncHistoryMessages: reported messages for chat", {
          chatId: chat.id._serialized,
          reportedCount: messages.length,
        });
      } catch (error) {
        logger.error("syncHistoryMessages: failed for chat", {
          chatId: chat.id._serialized,
          error: String(error),
        });
      }
    }

    logger.info("syncHistoryMessages: completed", { totalChats: chats.length, totalMessages: totalSynced });
  }

  private initStore(): void {
    const collections = moduleLoader.get<{
      Chat: IStoreChat;
      Contact: IStoreContact;
    }>("WAWebCollections");

    logger.info("initStore: got collections", {
      hasCollections: !!collections,
      hasChat: !!collections?.Chat,
      hasContact: !!collections?.Contact,
    });

    if (collections) {
      this._storeChat = collections.Chat;
      this._storeContact = collections.Contact;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).Store) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).Store = collections;
      }
    }

    this._contactMethods = moduleLoader.get<IWAContactMethods>(
      "WAWebContactGetters",
    );
    this._profilePic = moduleLoader.get<IProfilePic>(
      "WAWebContactProfilePicThumbBridge",
    );

    logger.info("initStore: completed", {
      hasStoreChat: !!this._storeChat,
      hasStoreContact: !!this._storeContact,
      hasContactMethods: !!this._contactMethods,
      hasProfilePic: !!this._profilePic,
    });
  }

  private registerChatEventListeners(): void {
    if (!this._storeChat) {
      return;
    }

    const chatCleanup = registerChatChangeHandler(
      this._storeChat,
      this._contactMethods,
      (user) => {
        this.emitter.emit(ESDKEventType.changeCurrentChatUser, {
          payload: { user },
        });
      },
    );
    this.eventManager.add(chatCleanup);
  }

  private _messageBuffer: Array<{ messageId: string; chatId: string; senderId: string; fromMe: boolean; content: string; timestamp: number; messageType: string; version: number; updatedAt: number }> = [];
  private _flushTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly MSG_DEBOUNCE_MS = 500;
  private static readonly MSG_MAX_BUFFER = 100;

  private flushMessageBuffer(): void {
    if (this._flushTimer !== null) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    if (this._messageBuffer.length === 0) return;

    const batch = this._messageBuffer.splice(0);
    const middleware = getDefaultMiddlewareForCurrentWebview();
    if (!middleware) return;

    logger.info("flushMessageBuffer: flushing messages", { count: batch.length });
    void middleware.reportMessages(batch);
  }

  private registerMessageEventListeners(): void {
    logger.info("registerMessageEventListeners: registering message listener");
    const cleanup = onNewMessage((msg) => {
      logger.info("registerMessageEventListeners: new message received", {
        id: msg.id?._serialized,
        from: msg.from,
        type: msg.type,
      });
      const middleware = getDefaultMiddlewareForCurrentWebview();
      if (!middleware) {
        logger.warn("registerMessageEventListeners: middleware not available, skipping report");
        return;
      }

      const timestampMs =
        msg.clientReceivedTsMillis ?? Math.floor(msg.t * 1000);
      const senderId = msg.author ?? msg.from;
      const content = msg.body ?? "";
      const messageType = msg.type ?? "unknown";
      const serialized = msg.id?._serialized ?? "";
      const fromMe = msg.id?.fromMe === true || serialized.startsWith("true_");

      const middlewareMessage = {
        messageId: serialized || msg.id?.id || "",
        chatId: String(msg.id?.remote ?? ""),
        senderId: String(senderId ?? ""),
        fromMe,
        content,
        timestamp: timestampMs,
        messageType,
        version: 1,
        updatedAt: timestampMs,
      };

      if (!middlewareMessage.messageId || !middlewareMessage.chatId) {
        return;
      }

      middleware.publishNewMessages([middlewareMessage]);

      this._messageBuffer.push(middlewareMessage);
      if (this._messageBuffer.length >= WhatsAppSDK.MSG_MAX_BUFFER) {
        this.flushMessageBuffer();
        return;
      }
      if (this._flushTimer !== null) {
        clearTimeout(this._flushTimer);
      }
      this._flushTimer = setTimeout(() => this.flushMessageBuffer(), WhatsAppSDK.MSG_DEBOUNCE_MS);
    });

    this.eventManager.add(cleanup);
  }

  async getCurrentUserInfo(): Promise<WAUserInfo | null> {
    logger.info("getCurrentUserInfo: checking preconditions", {
      isLoggedIn: this.isLoggedIn,
      hasStoreContact: !!this._storeContact,
    });

    if (!this.isLoggedIn || !this._storeContact) {
      logger.warn("getCurrentUserInfo: preconditions not met");
      return null;
    }

    try {
      const meContactModel = await pollExcFn(
        () => this._storeContact?.getMeContact(),
        10_000,
      );

      logger.info("getCurrentUserInfo: got meContactModel", {
        hasModel: !!meContactModel,
      });

      if (!meContactModel) {
        return null;
      }

      const serialized = meContactModel.serialize();
      let avatarUrl = "";

      if (this._profilePic) {
        try {
          const pic = await this._profilePic.requestProfilePicFromServer(
            meContactModel.id,
          );
          avatarUrl = pic.previewEurl || pic.eurl || "";
        } catch {
          // 头像获取失败
        }
      }

      return {
        id: meContactModel.id._serialized,
        nickname: serialized.name || "",
        avatar: avatarUrl,
        isGroup: false as const,
        phone: meContactModel.id.user,
      };
    } catch {
      return null;
    }
  }

  getCurrentChatUserInfo(userId: string): IThirdAppUserInfo | null {
    const targetId = userId || this.currentChatUserId;
    if (!targetId) {
      return null;
    }

    const cachedUser = appStore.getCurrentChatUserByAppId();
    if (cachedUser && cachedUser.id === targetId) {
      return cachedUser;
    }

    if (!this._storeChat) {
      return cachedUser ?? null;
    }

    const chatModel = this._storeChat.get(targetId);
    if (!chatModel) {
      return cachedUser ?? null;
    }

    const isGroup = this.isGroup(targetId);

    return {
      id: targetId,
      nickname: chatModel.title(),
      avatar: cachedUser?.avatar ?? "",
      isGroup,
      phone: isGroup ? undefined : chatModel.id.user,
    };
  }

  isGroup(userId: string): boolean {
    if (!userId) {
      return false;
    }
    return isGroupId(userId);
  }

  async sendTextMessage(chatId: string, text: string): Promise<void> {
    if (!this.isLoggedIn) {
      throw new NotLoggedInError();
    }

    if (!this._storeChat) {
      throw new MessageSendError("Store.Chat not available");
    }

    const chat = this._storeChat.get(chatId);
    if (!chat) {
      throw new ChatNotFoundError(chatId);
    }

    const sendModule = moduleLoader.get<{
      sendTextMsgToChat: (chat: IWAChatModel, text: string) => void;
    }>("WAWebSendTextMsgChatAction");

    if (!sendModule) {
      throw new MessageSendError("Send message module not available");
    }

    try {
      sendModule.sendTextMsgToChat(chat, text);
    } catch (error) {
      throw new MessageSendError(
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  setTheme(): void {
    // WhatsApp Web 主题由用户在设置中控制
  }

  /**
   * 获取所有聊天列表
   */
  getChats(): WAChat[] {
    if (!this.isLoggedIn) {
      logger.warn("getChats: not logged in");
      return [];
    }
    const chats = getAllChats();
    logger.info("getChats: got chats from getAllChats", { count: chats.length });
    return chats;
  }

  /**
   * 获取当前激活的聊天
   */
  getCurrentChat(): IWAChatModel | undefined {
    if (!this.isLoggedIn) {
      return undefined;
    }
    return getActiveChat() ?? undefined;
  }

  /**
   * 获取联系人列表
   */
  getContacts(type?: "group" | "private"): WAContact[] {
    if (!this.isLoggedIn) {
      logger.warn("getContacts: not logged in");
      return [];
    }
    const contacts = getAllContacts(type);
    logger.info("getContacts: got contacts from getAllContacts", { count: contacts.length });
    return contacts;
  }

  /**
   * 根据用户 ID 获取联系人
   */
  getContactById(userId: string): WAContact | undefined {
    if (!this.isLoggedIn) {
      return undefined;
    }
    return findContactById(userId);
  }

  /**
   * 获取指定聊天的消息历史
   */
  async getMessagesById(
    chatId: string,
  ): Promise<WAHistoryMessage[] | undefined> {
    if (!this.isLoggedIn) {
      return undefined;
    }
    return getMessagesByChatId(chatId);
  }

  /**
   * 发送消息到当前激活的聊天
   * @returns true 如果发送成功，false 如果无法发送（无激活聊天或模块不可用）
   */
  sendMessageToCurrentChat(text: string): boolean {
    const currentChat = this.getCurrentChat();
    if (!currentChat) {
      return false;
    }

    const sendModule = moduleLoader.get<{
      sendTextMsgToChat: (chat: IWAChatModel, text: string) => void;
    }>("WAWebSendTextMsgChatAction");

    if (!sendModule) {
      return false;
    }

    sendModule.sendTextMsgToChat(currentChat, text);
    return true;
  }

  /**
   * 订阅 Socket 连接状态变化
   */
  subscribeSocketState(callback: (state: SocketState) => void): () => void {
    const authCmd = getAuthCmd();
    if (!authCmd) {
      return () => {};
    }
    return registerSocketStateHandler(authCmd, callback);
  }

  /**
   * 订阅聊天关闭事件
   */
  subscribeChatClose(callback: () => void): () => void {
    const authCmd = getAuthCmd();
    if (!authCmd) {
      return () => {};
    }
    return registerChatCloseHandler(authCmd, callback);
  }
}

export { WhatsAppSDK };
