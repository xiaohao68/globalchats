import { domReady } from "@gc/utils";
import type { IThirdAppUserInfo } from "@gc/model";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK";
import { ESDKEventType } from "../../engine/sdk/SDKEvent";
import type { GCEngineMiddleware } from "../../../middleware/GCEngineMiddleware";
import type { WAChat, WAContact, WAMessage, WAUserInfo } from "../sdk/types";

import { WAWebAdapter } from "../adapters/wa-web";
import { ReporterAdapter } from "../adapters/reporter";
import { EventBusAdapter } from "../adapters/event-bus";
import {
  AuthService,
  ChatService,
  MessageService,
  ContactService,
  SyncService,
} from "../core/services";
import { isGroupId } from "../sdk/utils";
import { ImtpBackend } from "../../../middleware/backend/imtpBackend.ts";

/**
 * WhatsApp SDK 入口（新架构）
 * 职责：组装各层组件，提供统一的对外 API
 *
 * 设计原则：
 * - 薄层设计，不包含业务逻辑
 * - 所有业务逻辑委托给 Service 层
 * - 通过依赖注入实现可测试性
 */
export class WhatsAppSDKV2 extends AbstractAppSDK {
  // 适配器
  private waAdapter: WAWebAdapter;
  private reporter: ReporterAdapter;
  private eventBus: EventBusAdapter;

  // 服务
  private authService!: AuthService;
  private chatService!: ChatService;
  private messageService!: MessageService;
  private contactService!: ContactService;
  private syncService!: SyncService;

  // IMTP Backend（共享实例）
  private imtpBackend: ImtpBackend;

  // 清理函数
  private cleanupFns: (() => void)[] = [];

  constructor(private middleware: GCEngineMiddleware) {
    super();
    this.waAdapter = new WAWebAdapter();
    this.imtpBackend = middleware.backend instanceof ImtpBackend
      ? middleware.backend
      : new ImtpBackend({ platform: "whatsapp-web", version: "2.0.0" });
    this.reporter = new ReporterAdapter(middleware, this.imtpBackend);
    this.eventBus = new EventBusAdapter();
  }

  // ========== 生命周期 ==========
  async mount(): Promise<void> {
    super.mount();
    await domReady();

    // 1. 等待 WhatsApp Web 就绪
    await this.waAdapter.waitForReady();

    // 2. 初始化适配器
    this.waAdapter.initialize();

    // 3. 初始化服务（依赖注入）
    this.authService = new AuthService(
      this.waAdapter,
      this.reporter,
      this.eventBus,
    );
    this.chatService = new ChatService(this.waAdapter, this.eventBus);
    this.messageService = new MessageService(
      this.waAdapter,
      this.reporter,
      this.eventBus,
    );
    this.contactService = new ContactService(this.waAdapter);
    this.syncService = new SyncService(this.waAdapter, this.reporter);

    // 4. 初始化服务并收集清理函数
    this.cleanupFns.push(this.authService.initialize());
    this.cleanupFns.push(this.chatService.initialize());
    this.cleanupFns.push(this.messageService.initialize());

    // 5. 转发事件到 SDK emitter
    this.setupEventForwarding();

    // 6. 如果已登录，先注册用户再执行初始同步
    if (this.authService.isLoggedIn()) {
      console.log("[WhatsAppSDKV2] Already logged in, registering user then starting initial sync");
      void this.registerUserThenSync();
    } else {
      console.log("[WhatsAppSDKV2] Not logged in, waiting for auth:login event");
    }

    // 7. 监听登录事件，登录后执行同步
    this.cleanupFns.push(
      this.eventBus.on("auth:login", () => {
        console.log("[WhatsAppSDKV2] auth:login received, registering user then starting initial sync");
        void this.registerUserThenSync();
      }),
    );
  }

  /**
   * 先注册当前用户（获取 accountId），再执行初始同步
   */
  private async registerUserThenSync(): Promise<void> {
    try {
      await this.refreshCurrentUserInfo(true);
      console.log(`[WhatsAppSDKV2] User registered, accountId=${this.imtpBackend.getCurrentAccountId()}`);
    } catch (error) {
      console.error("[WhatsAppSDKV2] Failed to register user, proceeding with sync anyway:", error);
    }
    await this.syncService.performInitialSync();
  }

  private setupEventForwarding(): void {
    // 转发登录状态变化
    this.cleanupFns.push(
      this.eventBus.on("auth:login_status", (event) => {
        this.emitter.emit(ESDKEventType.changeLoginStatus, {
          payload: { isLogin: event.payload.isLoggedIn },
        });
      }),
    );

    // 转发登出事件
    this.cleanupFns.push(
      this.eventBus.on("auth:logout", () => {
        this.emitter.emit(ESDKEventType.logout, { payload: undefined });
        this.clearCurrentUserInfo();
      }),
    );

    // 转发聊天切换事件
    this.cleanupFns.push(
      this.eventBus.on("chat:change", (event) => {
        const chat = event.payload.chat;
        const user: IThirdAppUserInfo = {
          id: chat.id._serialized,
          nickname: chat.contact?.name ?? "",
          avatar: chat.contact?.avatar ?? "",
          isGroup: chat.id.server === "g.us",
        };
        this.emitter.emit(ESDKEventType.changeCurrentChatUser, {
          payload: { user },
        });
      }),
    );
  }

  destroy(): void {
    super.destroy();
    this.messageService?.destroy();
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.waAdapter.destroy();
    this.reporter.destroy();
    this.eventBus.clear();
  }

  // ========== 对外 API（委托给服务） ==========
  get isLoginEd(): boolean {
    return this.isLoggedIn;
  }

  get isLoggedIn(): boolean {
    return this.authService?.isLoggedIn() ?? false;
  }

  get isLoginPage(): boolean {
    return !this.isLoggedIn;
  }

  get isChatPage(): boolean {
    return this.isLoggedIn;
  }

  get currentUserId(): string | null {
    // 从 middleware 获取
    const result = this.middleware.getCurrentUser();
    if (result.status === "success" && result.data) {
      return result.data.id;
    }
    return null;
  }

  get currentChatUserId(): string {
    return this.chatService?.getActiveChat()?.id._serialized ?? "";
  }

  async getCurrentUserInfo(): Promise<WAUserInfo | null> {
    return this.authService.getCurrentUser();
  }

  getCurrentChatUserInfo(userId: string): IThirdAppUserInfo | null {
    const targetId = userId || this.chatService?.getActiveChat()?.id._serialized;
    if (!targetId) {
      return null;
    }

    const chat = this.chatService?.getChatById(targetId);
    if (!chat) {
      return null;
    }

    return {
      id: chat.id._serialized,
      nickname: chat.contact?.name ?? "",
      avatar: chat.contact?.avatar ?? "",
      isGroup: chat.id.server === "g.us",
      phone: chat.id.server !== "g.us" ? chat.id.user : undefined,
    };
  }

  getChats(): WAChat[] {
    return this.chatService.getAllChats();
  }

  getCurrentChat(): WAChat | null {
    return this.chatService.getActiveChat();
  }

  getContacts(type?: "group" | "private"): WAContact[] {
    return this.contactService.getAllContacts(type);
  }

  getContactById(userId: string): WAContact | null {
    return this.contactService.getContactById(userId);
  }

  async sendTextMessage(chatId: string, text: string): Promise<void> {
    return this.messageService.sendTextMessage(chatId, text);
  }

  async getMessagesById(chatId: string): Promise<WAMessage[]> {
    return this.messageService.getMessagesByChat(chatId);
  }

  isGroup(userId: string): boolean {
    return isGroupId(userId);
  }

  setTheme(): void {
    // WhatsApp Web 主题由用户在设置中控制
  }

  // ========== 事件订阅 ==========
  onLoginStatusChange(callback: (isLoggedIn: boolean) => void): () => void {
    return this.eventBus.on("auth:login_status", (event) => {
      callback(event.payload.isLoggedIn);
    });
  }

  onNewMessage(callback: (message: WAMessage) => void): () => void {
    return this.eventBus.on("message:new", (event) => {
      callback(event.payload.message);
    });
  }

  onChatChange(callback: (chat: WAChat) => void): () => void {
    return this.eventBus.on("chat:change", (event) => {
      callback(event.payload.chat);
    });
  }
}
