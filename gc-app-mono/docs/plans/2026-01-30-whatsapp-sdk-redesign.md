# WhatsApp SDK 重新设计方案

> 日期：2026-01-30
> 状态：设计中

## 一、问题分析

### 1.1 当前架构问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **模块耦合度高** | SDK 类直接依赖 moduleLoader、middleware、adapter 等 | 难以独立测试和修改 |
| **职责划分不清** | WhatsAppSDK 承担初始化、事件、数据转换、上报等多重职责 | 代码膨胀，维护困难 |
| **扩展性差** | 添加新功能需要修改 SDK 核心类 | 违反开闭原则 |
| **上报逻辑耦合** | 上报代码散落在 SDK 各处（mount、事件回调等） | 难以统一管理 |
| **上报时机不明确** | 何时上报什么数据缺乏清晰定义 | 可能遗漏或重复上报 |
| **缺少重试/去重** | 虽然 middleware 有去重，但 SDK 层无队列机制 | 上报失败无法恢复 |

### 1.2 参考实现分析

#### whatsapp-hijack（轻量级参考）
- **优点**：极简实现（140行），直接访问内部模块
- **关键逻辑**：
  - 登录检查：`Socket.stream === 'CONNECTED'`
  - 消息监听：`MsgCollection.on('add', callback)`
  - 聊天切换：`Cmd.on('open_chat', callback)`
  - Socket 状态：`Cmd.on('set_socket_state', callback)`

#### whatsapp-web.js（企业级参考）
- **优点**：完整的模块暴露机制，丰富的数据结构封装
- **关键逻辑**：
  - 集中暴露模块到 `window.Store`
  - 使用 `hasSynced` 判断登录状态（更可靠）
  - 完整的事件系统（EventEmitter）

## 二、新架构设计

### 2.1 六边形架构（Hexagonal Architecture）

```
                         ┌─────────────────────┐
                         │    Event Emitter    │
                         └──────────┬──────────┘
                                    │
    ┌───────────────┐      ┌────────▼────────┐      ┌───────────────┐
    │  WA Web API   │◄─────│                 │─────►│   Reporter    │
    │   Adapter     │      │   Core Domain   │      │   Adapter     │
    │               │      │                 │      │               │
    │ - ModuleLoader│      │ - AuthService   │      │ - Queue       │
    │ - EventBinder │      │ - ChatService   │      │ - Retry       │
    └───────────────┘      │ - MessageService│      │ - Dedupe      │
                           │ - ContactService│      └───────────────┘
    ┌───────────────┐      │ - SyncService   │
    │   Storage     │◄─────│                 │
    │   Adapter     │      └─────────────────┘
    └───────────────┘
```

### 2.2 核心设计原则

1. **依赖倒置**：Core 层只定义接口（Ports），不依赖具体实现
2. **单一职责**：每个 Service 只负责一个领域
3. **事件驱动**：通过事件总线解耦模块间通信
4. **可测试性**：所有外部依赖通过接口注入

## 三、目录结构

```
packages/gc-engine/src/apps/whatsapp/
├── index.ts                          # 统一导出
│
├── core/                             # 核心领域层（纯业务逻辑）
│   ├── domain/                       # 领域模型
│   │   ├── entities/                 # 实体定义
│   │   │   ├── Auth.ts              # 认证状态实体
│   │   │   ├── Chat.ts              # 聊天实体
│   │   │   ├── Message.ts           # 消息实体
│   │   │   └── Contact.ts           # 联系人实体
│   │   └── events/                   # 领域事件
│   │       ├── AuthEvents.ts        # 认证相关事件
│   │       ├── ChatEvents.ts        # 聊天相关事件
│   │       └── MessageEvents.ts     # 消息相关事件
│   │
│   ├── ports/                        # 端口定义（接口）
│   │   ├── inbound/                  # 入站端口（应用层调用）
│   │   │   ├── IAuthPort.ts         # 认证端口
│   │   │   ├── IChatPort.ts         # 聊天端口
│   │   │   ├── IMessagePort.ts      # 消息端口
│   │   │   └── IContactPort.ts      # 联系人端口
│   │   └── outbound/                 # 出站端口（基础设施）
│   │       ├── IWAWebAdapter.ts     # WhatsApp Web API 端口
│   │       ├── IReporter.ts         # 上报端口
│   │       └── IEventBus.ts         # 事件总线端口
│   │
│   └── services/                     # 领域服务
│       ├── AuthService.ts           # 认证服务
│       ├── ChatService.ts           # 聊天服务
│       ├── MessageService.ts        # 消息服务
│       ├── ContactService.ts        # 联系人服务
│       └── SyncService.ts           # 历史同步服务
│
├── adapters/                         # 适配器层（外部依赖实现）
│   ├── wa-web/                       # WhatsApp Web API 适配器
│   │   ├── WAWebAdapter.ts          # 主适配器（实现 IWAWebAdapter）
│   │   ├── ModuleLoader.ts          # 模块加载器
│   │   ├── ModuleRegistry.ts        # 模块注册表
│   │   └── bindings/                # 各模块绑定
│   │       ├── AuthBinding.ts       # 认证模块绑定
│   │       ├── ChatBinding.ts       # 聊天模块绑定
│   │       ├── MessageBinding.ts    # 消息模块绑定
│   │       └── ContactBinding.ts    # 联系人模块绑定
│   │
│   ├── reporter/                     # 上报适配器
│   │   ├── ReporterAdapter.ts       # 主适配器（实现 IReporter）
│   │   ├── MessageQueue.ts          # 消息队列
│   │   └── ReportScheduler.ts       # 上报调度器
│   │
│   └── event-bus/                    # 事件总线适配器
│       └── EventBusAdapter.ts       # 事件总线实现
│
├── application/                      # 应用层（组装与对外 API）
│   ├── WhatsAppSDK.ts               # SDK 入口（薄层，仅组装）
│   └── usecases/                    # 用例
│       ├── InitializeUseCase.ts     # 初始化用例
│       ├── SendMessageUseCase.ts    # 发送消息用例
│       └── SyncHistoryUseCase.ts    # 同步历史用例
│
└── types/                            # 共享类型定义
    ├── index.ts                     # 类型导出
    ├── wa-web.ts                    # WhatsApp Web 内部类型
    └── errors.ts                    # 错误类型

## 四、核心接口设计

### 4.1 出站端口：IWAWebAdapter

```typescript
// core/ports/outbound/IWAWebAdapter.ts

/**
 * WhatsApp Web API 适配器接口
 * 定义与 WhatsApp Web 内部模块交互的所有方法
 */
export interface IWAWebAdapter {
  // ========== 生命周期 ==========
  /**
   * 等待 WhatsApp Web 应用就绪
   */
  waitForReady(): Promise<void>;

  /**
   * 初始化适配器，加载必要模块
   */
  initialize(): void;

  /**
   * 销毁适配器，清理资源
   */
  destroy(): void;

  // ========== 认证 ==========
  /**
   * 检查是否已登录
   * 使用 hasSynced 而非 stream 状态（更可靠）
   */
  isLoggedIn(): boolean;

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): Promise<WAUser | null>;

  /**
   * 监听登录状态变化
   * @returns 清理函数
   */
  onLoginStatusChange(callback: (isLoggedIn: boolean) => void): () => void;

  /**
   * 监听登出事件
   * @returns 清理函数
   */
  onLogout(callback: () => void): () => void;

  /**
   * 监听 Socket 连接状态
   * @returns 清理函数
   */
  onSocketStateChange(callback: (state: SocketState) => void): () => void;

  // ========== 聊天 ==========
  /**
   * 获取所有聊天列表
   */
  getAllChats(): WAChat[];

  /**
   * 获取当前激活的聊天
   */
  getActiveChat(): WAChat | null;

  /**
   * 根据 ID 获取聊天
   */
  getChatById(chatId: string): WAChat | null;

  /**
   * 监听聊天切换事件
   * @returns 清理函数
   */
  onChatChange(callback: (chat: WAChat) => void): () => void;

  /**
   * 监听聊天关闭事件
   * @returns 清理函数
   */
  onChatClose(callback: () => void): () => void;

  // ========== 消息 ==========
  /**
   * 监听新消息
   * @returns 清理函数
   */
  onNewMessage(callback: (message: WAMessage) => void): () => void;

  /**
   * 获取指定聊天的消息历史
   */
  getMessagesByChat(chatId: string): WAMessage[];

  /**
   * 发送文本消息
   */
  sendTextMessage(chatId: string, text: string): Promise<void>;

  // ========== 联系人 ==========
  /**
   * 获取所有联系人
   */
  getAllContacts(type?: 'group' | 'private'): WAContact[];

  /**
   * 根据 ID 获取联系人
   */
  getContactById(contactId: string): WAContact | null;
}
```

### 4.2 出站端口：IReporter

```typescript
// core/ports/outbound/IReporter.ts

/**
 * 上报适配器接口
 * 定义数据上报的所有方法
 */
export interface IReporter {
  // ========== 状态上报 ==========
  /**
   * 上报登录状态变化
   */
  reportStatusChange(event: StatusEvent): Promise<ReportResult>;

  /**
   * 上报当前用户信息
   */
  reportCurrentUser(user: ReportableUser): Promise<ReportResult>;

  // ========== 数据上报 ==========
  /**
   * 上报会话列表
   */
  reportConversations(conversations: ReportableConversation[]): Promise<ReportResult>;

  /**
   * 上报联系人列表
   */
  reportContacts(contacts: ReportableContact[]): Promise<ReportResult>;

  /**
   * 上报新消息（实时）
   */
  reportMessages(messages: ReportableMessage[]): Promise<ReportResult>;

  /**
   * 上报历史消息（批量）
   */
  reportHistory(chatId: string, messages: ReportableMessage[]): Promise<ReportResult>;

  // ========== 控制 ==========
  /**
   * 暂停上报
   */
  pause(): void;

  /**
   * 恢复上报
   */
  resume(): void;

  /**
   * 是否正在上报
   */
  isReporting(): boolean;
}
```

### 4.3 出站端口：IEventBus

```typescript
// core/ports/outbound/IEventBus.ts

/**
 * 事件总线接口
 * 用于模块间解耦通信
 */
export interface IEventBus {
  /**
   * 发布事件
   */
  emit<T extends DomainEvent>(event: T): void;

  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  on<T extends DomainEvent>(
    eventType: T['type'],
    handler: (event: T) => void
  ): () => void;

  /**
   * 一次性订阅
   */
  once<T extends DomainEvent>(
    eventType: T['type'],
    handler: (event: T) => void
  ): () => void;
}

/**
 * 领域事件基类
 */
export interface DomainEvent {
  type: string;
  timestamp: number;
  payload: unknown;
}

/**
 * 认证事件
 */
export interface AuthLoginEvent extends DomainEvent {
  type: 'auth:login';
  payload: { userId: string };
}

export interface AuthLogoutEvent extends DomainEvent {
  type: 'auth:logout';
  payload: undefined;
}

export interface AuthSocketStateEvent extends DomainEvent {
  type: 'auth:socket_state';
  payload: { state: SocketState };
}

/**
 * 聊天事件
 */
export interface ChatChangeEvent extends DomainEvent {
  type: 'chat:change';
  payload: { chat: WAChat };
}

export interface ChatCloseEvent extends DomainEvent {
  type: 'chat:close';
  payload: undefined;
}

/**
 * 消息事件
 */
export interface MessageNewEvent extends DomainEvent {
  type: 'message:new';
  payload: { message: WAMessage };
}
```

## 五、领域服务设计

### 5.1 AuthService（认证服务）

```typescript
// core/services/AuthService.ts

export class AuthService {
  constructor(
    private readonly waAdapter: IWAWebAdapter,
    private readonly reporter: IReporter,
    private readonly eventBus: IEventBus,
  ) {}

  /**
   * 初始化认证监听
   * 统一管理所有认证相关的事件订阅
   */
  initialize(): () => void {
    const cleanups: (() => void)[] = [];

    // 监听登录状态变化
    cleanups.push(
      this.waAdapter.onLoginStatusChange((isLoggedIn) => {
        if (isLoggedIn) {
          this.handleLogin();
        }
        this.eventBus.emit({
          type: 'auth:login_status',
          timestamp: Date.now(),
          payload: { isLoggedIn },
        });
      })
    );

    // 监听登出事件
    cleanups.push(
      this.waAdapter.onLogout(() => {
        this.handleLogout();
        this.eventBus.emit({
          type: 'auth:logout',
          timestamp: Date.now(),
          payload: undefined,
        });
      })
    );

    // 监听 Socket 状态
    cleanups.push(
      this.waAdapter.onSocketStateChange((state) => {
        this.eventBus.emit({
          type: 'auth:socket_state',
          timestamp: Date.now(),
          payload: { state },
        });
      })
    );

    return () => cleanups.forEach((fn) => fn());
  }

  private async handleLogin(): Promise<void> {
    // 上报登录状态
    await this.reporter.reportStatusChange({
      eventType: 'login',
      status: 'logged_in',
      timestamp: Date.now(),
    });

    // 获取并上报当前用户
    const user = await this.waAdapter.getCurrentUser();
    if (user) {
      await this.reporter.reportCurrentUser(user);
    }
  }

  private async handleLogout(): Promise<void> {
    await this.reporter.reportStatusChange({
      eventType: 'logout',
      status: 'logged_out',
      timestamp: Date.now(),
    });
  }

  isLoggedIn(): boolean {
    return this.waAdapter.isLoggedIn();
  }

  async getCurrentUser(): Promise<WAUser | null> {
    return this.waAdapter.getCurrentUser();
  }
}
```

### 5.2 MessageService（消息服务）

```typescript
// core/services/MessageService.ts

export class MessageService {
  constructor(
    private readonly waAdapter: IWAWebAdapter,
    private readonly reporter: IReporter,
    private readonly eventBus: IEventBus,
  ) {}

  /**
   * 初始化消息监听
   */
  initialize(): () => void {
    return this.waAdapter.onNewMessage((message) => {
      // 过滤自己发送的消息
      if (message.id?.fromMe) {
        return;
      }

      // 发布领域事件
      this.eventBus.emit({
        type: 'message:new',
        timestamp: Date.now(),
        payload: { message },
      });

      // 上报消息
      void this.reportMessage(message);
    });
  }

  private async reportMessage(message: WAMessage): Promise<void> {
    const reportable = this.toReportableMessage(message);
    await this.reporter.reportMessages([reportable]);
  }

  private toReportableMessage(msg: WAMessage): ReportableMessage {
    return {
      messageId: msg.id?._serialized ?? msg.id?.id ?? '',
      chatId: msg.id?.remote?._serialized ?? '',
      senderId: msg.author ?? msg.from ?? '',
      content: msg.body ?? '',
      timestamp: msg.clientReceivedTsMillis ?? Math.floor(msg.t * 1000),
      messageType: msg.type ?? 'unknown',
      version: 1,
      updatedAt: msg.clientReceivedTsMillis ?? Math.floor(msg.t * 1000),
    };
  }

  async sendTextMessage(chatId: string, text: string): Promise<void> {
    return this.waAdapter.sendTextMessage(chatId, text);
  }

  getMessagesByChat(chatId: string): WAMessage[] {
    return this.waAdapter.getMessagesByChat(chatId);
  }
}
```

### 5.3 SyncService（同步服务）

```typescript
// core/services/SyncService.ts

export interface SyncConfig {
  daysBack: number;      // 同步多少天的历史
  batchSize: number;     // 每批上报多少条
  delayBetweenBatches: number; // 批次间延迟（ms）
}

const DEFAULT_CONFIG: SyncConfig = {
  daysBack: 7,
  batchSize: 100,
  delayBetweenBatches: 100,
};

export class SyncService {
  private config: SyncConfig;

  constructor(
    private readonly waAdapter: IWAWebAdapter,
    private readonly reporter: IReporter,
    config?: Partial<SyncConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行初始同步
   * 在登录后调用，同步会话、联系人、历史消息
   */
  async performInitialSync(): Promise<void> {
    // 1. 同步会话列表
    await this.syncConversations();

    // 2. 同步联系人
    await this.syncContacts();

    // 3. 同步历史消息
    await this.syncHistoryMessages();
  }

  private async syncConversations(): Promise<void> {
    const chats = this.waAdapter.getAllChats();
    if (chats.length === 0) return;

    const conversations = chats.map((chat) => this.toReportableConversation(chat));
    await this.reporter.reportConversations(conversations);
  }

  private async syncContacts(): Promise<void> {
    const contacts = this.waAdapter.getAllContacts();
    if (contacts.length === 0) return;

    const reportable = contacts.map((c) => this.toReportableContact(c));
    await this.reporter.reportContacts(reportable);
  }

  private async syncHistoryMessages(): Promise<void> {
    const cutoffTime = Date.now() - this.config.daysBack * 24 * 60 * 60 * 1000;
    const chats = this.waAdapter.getAllChats();

    // 只同步最近活跃的聊天
    const recentChats = chats.filter(
      (chat) => chat.t && chat.t * 1000 >= cutoffTime
    );

    for (const chat of recentChats) {
      try {
        await this.syncChatHistory(chat.id._serialized, cutoffTime);
        // 批次间延迟，避免过载
        await this.delay(this.config.delayBetweenBatches);
      } catch (error) {
        console.error(`Failed to sync history for chat ${chat.id._serialized}:`, error);
      }
    }
  }

  private async syncChatHistory(chatId: string, cutoffTime: number): Promise<void> {
    const messages = this.waAdapter.getMessagesByChat(chatId);
    if (!messages || messages.length === 0) return;

    const recentMessages = messages.filter((msg) => msg.t * 1000 >= cutoffTime);
    if (recentMessages.length === 0) return;

    const reportable = recentMessages.map((msg) => this.toReportableMessage(msg));

    // 分批上报
    for (let i = 0; i < reportable.length; i += this.config.batchSize) {
      const batch = reportable.slice(i, i + this.config.batchSize);
      await this.reporter.reportHistory(chatId, batch);
    }
  }

  private toReportableConversation(chat: WAChat): ReportableConversation {
    // 转换逻辑
  }

  private toReportableContact(contact: WAContact): ReportableContact {
    // 转换逻辑
  }

  private toReportableMessage(msg: WAMessage): ReportableMessage {
    // 转换逻辑
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

## 六、适配器实现设计

### 6.1 WAWebAdapter（WhatsApp Web API 适配器）

```typescript
// adapters/wa-web/WAWebAdapter.ts

import { ModuleLoader } from './ModuleLoader';
import { AuthBinding } from './bindings/AuthBinding';
import { ChatBinding } from './bindings/ChatBinding';
import { MessageBinding } from './bindings/MessageBinding';
import { ContactBinding } from './bindings/ContactBinding';

export class WAWebAdapter implements IWAWebAdapter {
  private moduleLoader: ModuleLoader;
  private authBinding: AuthBinding;
  private chatBinding: ChatBinding;
  private messageBinding: MessageBinding;
  private contactBinding: ContactBinding;
  private cleanupFns: (() => void)[] = [];

  constructor() {
    this.moduleLoader = new ModuleLoader();
  }

  async waitForReady(): Promise<void> {
    // 等待 WhatsApp Web 加载完成
    await this.pollUntil(
      () => (window as any).Debug?.VERSION !== undefined,
      5 * 60_000
    );
  }

  initialize(): void {
    // 初始化各模块绑定
    this.authBinding = new AuthBinding(this.moduleLoader);
    this.chatBinding = new ChatBinding(this.moduleLoader);
    this.messageBinding = new MessageBinding(this.moduleLoader);
    this.contactBinding = new ContactBinding(this.moduleLoader);

    // 暴露到全局（便于调试）
    this.exposeToGlobal();
  }

  destroy(): void {
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
  }

  // ========== 认证相关 ==========
  isLoggedIn(): boolean {
    return this.authBinding.isLoggedIn();
  }

  async getCurrentUser(): Promise<WAUser | null> {
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
  getAllContacts(type?: 'group' | 'private'): WAContact[] {
    return this.contactBinding.getAllContacts(type);
  }

  getContactById(contactId: string): WAContact | null {
    return this.contactBinding.getContactById(contactId);
  }

  // ========== 私有方法 ==========
  private exposeToGlobal(): void {
    // 类似 whatsapp-web.js 的 Store 暴露
    (window as any).Store = {
      AppState: this.moduleLoader.get('WAWebSocketModel')?.Socket,
      Chat: this.moduleLoader.get('WAWebCollections')?.Chat,
      Contact: this.moduleLoader.get('WAWebCollections')?.Contact,
      Msg: this.moduleLoader.get('WAWebCollections')?.Msg,
      Cmd: this.moduleLoader.get('WAWebCmd')?.Cmd,
      Conn: this.moduleLoader.get('WAWebConnModel')?.Conn,
    };
  }

  private pollUntil(
    condition: () => boolean,
    timeout: number,
    interval = 100
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, interval);
        }
      };
      check();
    });
  }
}
```

### 6.2 ModuleLoader（模块加载器）

```typescript
// adapters/wa-web/ModuleLoader.ts

/**
 * WhatsApp Web 内部模块加载器
 * 参考 whatsapp-hijack 的直接 require 方式
 */
export class ModuleLoader {
  private cache = new Map<string, unknown>();

  /**
   * 获取模块（带缓存）
   */
  get<T>(moduleName: string): T | null {
    if (this.cache.has(moduleName)) {
      return this.cache.get(moduleName) as T;
    }

    try {
      const module = (window as any).require(moduleName);
      if (module) {
        this.cache.set(moduleName, module);
        return module as T;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取必需模块（不存在则抛异常）
   */
  getRequired<T>(moduleName: string): T {
    const module = this.get<T>(moduleName);
    if (!module) {
      throw new Error(`Required module not found: ${moduleName}`);
    }
    return module;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}
```

### 6.3 AuthBinding（认证模块绑定）

```typescript
// adapters/wa-web/bindings/AuthBinding.ts

/**
 * 认证模块绑定
 * 封装与 WhatsApp Web 认证相关的内部模块交互
 */
export class AuthBinding {
  private appState: any;
  private cmd: any;
  private conn: any;
  private contactCollection: any;

  constructor(private moduleLoader: ModuleLoader) {
    this.initModules();
  }

  private initModules(): void {
    const socketModel = this.moduleLoader.get<any>('WAWebSocketModel');
    this.appState = socketModel?.Socket;

    const cmdModule = this.moduleLoader.get<any>('WAWebCmd');
    this.cmd = cmdModule?.Cmd;

    const connModel = this.moduleLoader.get<any>('WAWebConnModel');
    this.conn = connModel?.Conn;

    const contactCol = this.moduleLoader.get<any>('WAWebContactCollection');
    this.contactCollection = contactCol?.ContactCollection;
  }

  /**
   * 检查登录状态
   * 使用 hasSynced（更可靠）而非 stream
   */
  isLoggedIn(): boolean {
    return this.appState?.hasSynced ?? false;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<WAUser | null> {
    if (!this.isLoggedIn()) {
      return null;
    }

    try {
      const userPrefs = this.moduleLoader.get<any>('WAWebUserPrefsMeUser');
      const currentId = userPrefs?.getMePnUserOrThrow();
      const contact = this.contactCollection?.get(currentId);

      return {
        id: contact?.id?._serialized ?? '',
        pushname: this.conn?.pushname ?? '',
        avatar: contact?.profilePicThumb?.eurl ?? '',
        phone: contact?.id?.user ?? '',
      };
    } catch {
      return null;
    }
  }

  /**
   * 监听登录状态变化
   */
  onLoginStatusChange(callback: (isLoggedIn: boolean) => void): () => void {
    if (!this.appState) {
      return () => {};
    }

    const hasSyncedHandler = () => callback(true);
    const stateChangeHandler = (_: unknown, state: string) => {
      if (state === 'CONNECTED') {
        callback(true);
      }
    };

    this.appState.on('change:hasSynced', hasSyncedHandler);
    this.appState.on('change:state', stateChangeHandler);

    return () => {
      this.appState.off('change:hasSynced', hasSyncedHandler);
      this.appState.off('change:state', stateChangeHandler);
    };
  }

  /**
   * 监听登出事件
   */
  onLogout(callback: () => void): () => void {
    if (!this.cmd) {
      return () => {};
    }

    this.cmd.on('logout', callback);
    return () => this.cmd.off('logout', callback);
  }

  /**
   * 监听 Socket 状态变化
   */
  onSocketStateChange(callback: (state: SocketState) => void): () => void {
    if (!this.cmd) {
      return () => {};
    }

    const handler = (state: string) => {
      callback(state as SocketState);
    };

    this.cmd.on('set_socket_state', handler);
    return () => this.cmd.off('set_socket_state', handler);
  }
}
```

### 6.4 MessageBinding（消息模块绑定）

```typescript
// adapters/wa-web/bindings/MessageBinding.ts

/**
 * 消息模块绑定
 * 封装与 WhatsApp Web 消息相关的内部模块交互
 */
export class MessageBinding {
  private msgCollection: any;
  private chatCollection: any;
  private sendModule: any;

  constructor(private moduleLoader: ModuleLoader) {
    this.initModules();
  }

  private initModules(): void {
    const collections = this.moduleLoader.get<any>('WAWebCollections');
    this.msgCollection = collections?.Msg;
    this.chatCollection = collections?.Chat;

    this.sendModule = this.moduleLoader.get<any>('WAWebSendTextMsgChatAction');
  }

  /**
   * 监听新消息
   * 参考 whatsapp-hijack 的实现
   */
  onNewMessage(callback: (message: WAMessage) => void): () => void {
    if (!this.msgCollection) {
      return () => {};
    }

    const handler = (msg: WAMessage) => {
      // 过滤条件：非自己发送 + 是新消息
      if (!msg?.id?.fromMe && msg.isNewMsg) {
        callback(msg);
      }
    };

    this.msgCollection.on('add', handler);
    return () => this.msgCollection.off('add', handler);
  }

  /**
   * 获取聊天的消息历史
   */
  getMessagesByChat(chatId: string): WAMessage[] {
    if (!this.chatCollection) {
      return [];
    }

    const chat = this.chatCollection.get(chatId);
    if (!chat?.msgs?._models) {
      return [];
    }

    return chat.msgs._models as WAMessage[];
  }

  /**
   * 发送文本消息
   */
  async sendTextMessage(chatId: string, text: string): Promise<void> {
    if (!this.sendModule || !this.chatCollection) {
      throw new Error('Send module not available');
    }

    const chat = this.chatCollection.get(chatId);
    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    this.sendModule.sendTextMsgToChat(chat, text);
  }
}
```

## 七、上报机制设计

### 7.1 ReporterAdapter（上报适配器）

```typescript
// adapters/reporter/ReporterAdapter.ts

import { MessageQueue } from './MessageQueue';
import { ReportScheduler } from './ReportScheduler';

/**
 * 上报适配器
 * 实现本地队列 + 异步上报 + 重试机制
 */
export class ReporterAdapter implements IReporter {
  private messageQueue: MessageQueue<QueueItem>;
  private scheduler: ReportScheduler;
  private middleware: GCEngineMiddleware;
  private _isReporting = true;

  constructor(middleware: GCEngineMiddleware) {
    this.middleware = middleware;
    this.messageQueue = new MessageQueue<QueueItem>({
      maxSize: 1000,
      flushInterval: 1000,  // 1秒自动刷新
      flushThreshold: 50,   // 50条触发刷新
    });
    this.scheduler = new ReportScheduler(this.messageQueue, this.processQueue.bind(this));
  }

  // ========== 状态上报 ==========
  async reportStatusChange(event: StatusEvent): Promise<ReportResult> {
    // 状态变化立即上报，不走队列
    return this.middleware.reportStatusChange(event);
  }

  async reportCurrentUser(user: ReportableUser): Promise<ReportResult> {
    // 用户信息立即上报
    return this.middleware.reportCurrentUser(user);
  }

  // ========== 数据上报（走队列） ==========
  async reportConversations(conversations: ReportableConversation[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: 'success', acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: 'conversations',
      data: conversations,
      timestamp: Date.now(),
    });

    return { status: 'queued', acceptedCount: conversations.length };
  }

  async reportContacts(contacts: ReportableContact[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: 'success', acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: 'contacts',
      data: contacts,
      timestamp: Date.now(),
    });

    return { status: 'queued', acceptedCount: contacts.length };
  }

  async reportMessages(messages: ReportableMessage[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: 'success', acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: 'messages',
      data: messages,
      timestamp: Date.now(),
    });

    return { status: 'queued', acceptedCount: messages.length };
  }

  async reportHistory(chatId: string, messages: ReportableMessage[]): Promise<ReportResult> {
    if (!this._isReporting) {
      return { status: 'success', acceptedCount: 0 };
    }

    this.messageQueue.enqueue({
      type: 'history',
      data: { chatId, messages },
      timestamp: Date.now(),
    });

    return { status: 'queued', acceptedCount: messages.length };
  }

  // ========== 控制 ==========
  pause(): void {
    this._isReporting = false;
    this.scheduler.pause();
  }

  resume(): void {
    this._isReporting = true;
    this.scheduler.resume();
  }

  isReporting(): boolean {
    return this._isReporting;
  }

  // ========== 私有方法 ==========
  private async processQueue(items: QueueItem[]): Promise<void> {
    // 按类型分组处理
    const grouped = this.groupByType(items);

    for (const [type, data] of Object.entries(grouped)) {
      try {
        await this.processGroupedItems(type as QueueItemType, data);
      } catch (error) {
        // 失败的项目重新入队
        console.error(`Failed to process ${type}:`, error);
        data.forEach((item) => this.messageQueue.enqueue(item));
      }
    }
  }

  private groupByType(items: QueueItem[]): Record<string, QueueItem[]> {
    return items.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, QueueItem[]>);
  }

  private async processGroupedItems(type: QueueItemType, items: QueueItem[]): Promise<void> {
    switch (type) {
      case 'messages':
        const messages = items.flatMap((i) => i.data as ReportableMessage[]);
        await this.middleware.reportMessages(messages);
        break;
      case 'conversations':
        const conversations = items.flatMap((i) => i.data as ReportableConversation[]);
        await this.middleware.reportConversations(conversations);
        break;
      case 'contacts':
        const contacts = items.flatMap((i) => i.data as ReportableContact[]);
        await this.middleware.reportContacts(contacts);
        break;
      case 'history':
        // 历史消息按聊天分别上报
        for (const item of items) {
          const { chatId, messages } = item.data as { chatId: string; messages: ReportableMessage[] };
          await this.middleware.reportHistory(chatId, messages);
        }
        break;
    }
  }
}

type QueueItemType = 'messages' | 'conversations' | 'contacts' | 'history';

interface QueueItem {
  type: QueueItemType;
  data: unknown;
  timestamp: number;
}
```

### 7.2 MessageQueue（消息队列）

```typescript
// adapters/reporter/MessageQueue.ts

export interface QueueOptions {
  maxSize: number;        // 最大队列长度
  flushInterval: number;  // 自动刷新间隔（ms）
  flushThreshold: number; // 触发刷新的阈值
}

/**
 * 内存消息队列
 * 支持自动刷新和阈值触发
 */
export class MessageQueue<T> {
  private queue: T[] = [];
  private options: QueueOptions;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private onFlushCallback: ((items: T[]) => Promise<void>) | null = null;

  constructor(options: QueueOptions) {
    this.options = options;
    this.startAutoFlush();
  }

  enqueue(item: T): void {
    if (this.queue.length >= this.options.maxSize) {
      // 队列满时丢弃最旧的
      this.queue.shift();
    }
    this.queue.push(item);

    // 达到阈值时触发刷新
    if (this.queue.length >= this.options.flushThreshold) {
      void this.flush();
    }
  }

  dequeue(): T | undefined {
    return this.queue.shift();
  }

  peek(): T | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }

  onFlush(callback: (items: T[]) => Promise<void>): void {
    this.onFlushCallback = callback;
  }

  async flush(): Promise<void> {
    if (this.isEmpty() || !this.onFlushCallback) {
      return;
    }

    const items = [...this.queue];
    this.queue = [];

    try {
      await this.onFlushCallback(items);
    } catch (error) {
      // 失败时将项目放回队列
      this.queue = [...items, ...this.queue];
      throw error;
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.options.flushInterval);
  }
}
```

## 八、应用层设计

### 8.1 WhatsAppSDK（SDK 入口）

```typescript
// application/WhatsAppSDK.ts

import { WAWebAdapter } from '../adapters/wa-web/WAWebAdapter';
import { ReporterAdapter } from '../adapters/reporter/ReporterAdapter';
import { EventBusAdapter } from '../adapters/event-bus/EventBusAdapter';
import { AuthService } from '../core/services/AuthService';
import { ChatService } from '../core/services/ChatService';
import { MessageService } from '../core/services/MessageService';
import { ContactService } from '../core/services/ContactService';
import { SyncService } from '../core/services/SyncService';

/**
 * WhatsApp SDK 入口
 * 职责：组装各层组件，提供统一的对外 API
 *
 * 设计原则：
 * - 薄层设计，不包含业务逻辑
 * - 所有业务逻辑委托给 Service 层
 * - 通过依赖注入实现可测试性
 */
export class WhatsAppSDK extends AbstractAppSDK {
  // 适配器
  private waAdapter: WAWebAdapter;
  private reporter: ReporterAdapter;
  private eventBus: EventBusAdapter;

  // 服务
  private authService: AuthService;
  private chatService: ChatService;
  private messageService: MessageService;
  private contactService: ContactService;
  private syncService: SyncService;

  // 清理函数
  private cleanupFns: (() => void)[] = [];

  constructor(middleware: GCEngineMiddleware) {
    super();

    // 初始化适配器
    this.waAdapter = new WAWebAdapter();
    this.reporter = new ReporterAdapter(middleware);
    this.eventBus = new EventBusAdapter();

    // 初始化服务（依赖注入）
    this.authService = new AuthService(this.waAdapter, this.reporter, this.eventBus);
    this.chatService = new ChatService(this.waAdapter, this.eventBus);
    this.messageService = new MessageService(this.waAdapter, this.reporter, this.eventBus);
    this.contactService = new ContactService(this.waAdapter);
    this.syncService = new SyncService(this.waAdapter, this.reporter);
  }

  // ========== 生命周期 ==========
  async mount(): Promise<void> {
    super.mount();

    // 1. 等待 WhatsApp Web 就绪
    await this.waAdapter.waitForReady();

    // 2. 初始化适配器
    this.waAdapter.initialize();

    // 3. 初始化服务并收集清理函数
    this.cleanupFns.push(this.authService.initialize());
    this.cleanupFns.push(this.chatService.initialize());
    this.cleanupFns.push(this.messageService.initialize());

    // 4. 如果已登录，执行初始同步
    if (this.authService.isLoggedIn()) {
      void this.syncService.performInitialSync();
    }

    // 5. 监听登录事件，登录后执行同步
    this.cleanupFns.push(
      this.eventBus.on('auth:login', () => {
        void this.syncService.performInitialSync();
      })
    );
  }

  destroy(): void {
    super.destroy();
    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];
    this.waAdapter.destroy();
    this.reporter.pause();
  }

  // ========== 对外 API（委托给服务） ==========
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get isLoginPage(): boolean {
    return !this.isLoggedIn;
  }

  get isChatPage(): boolean {
    return this.isLoggedIn;
  }

  async getCurrentUserInfo(): Promise<WAUser | null> {
    return this.authService.getCurrentUser();
  }

  getChats(): WAChat[] {
    return this.chatService.getAllChats();
  }

  getCurrentChat(): WAChat | null {
    return this.chatService.getActiveChat();
  }

  getContacts(type?: 'group' | 'private'): WAContact[] {
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

  // ========== 事件订阅 ==========
  onLoginStatusChange(callback: (isLoggedIn: boolean) => void): () => void {
    return this.eventBus.on('auth:login_status', (event) => {
      callback(event.payload.isLoggedIn);
    });
  }

  onNewMessage(callback: (message: WAMessage) => void): () => void {
    return this.eventBus.on('message:new', (event) => {
      callback(event.payload.message);
    });
  }

  onChatChange(callback: (chat: WAChat) => void): () => void {
    return this.eventBus.on('chat:change', (event) => {
      callback(event.payload.chat);
    });
  }
}
```

## 九、上报时机定义

### 9.1 上报事件矩阵

| 事件 | 触发时机 | 上报内容 | 上报方式 |
|------|----------|----------|----------|
| **登录** | `auth:login` 事件 | 状态 + 用户信息 | 立即上报 |
| **登出** | `auth:logout` 事件 | 状态 | 立即上报 |
| **初始同步** | 登录后 | 会话 + 联系人 + 历史消息 | 队列批量 |
| **新消息** | `message:new` 事件 | 消息内容 | 队列批量 |
| **聊天切换** | `chat:change` 事件 | 当前聊天信息 | 可选上报 |

### 9.2 上报流程图

```
登录成功
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                    AuthService                          │
│  1. reportStatusChange({ eventType: 'login' })         │
│  2. reportCurrentUser(user)                            │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                    SyncService                          │
│  3. reportConversations(chats)     → 队列              │
│  4. reportContacts(contacts)       → 队列              │
│  5. reportHistory(chatId, msgs)    → 队列（分批）      │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                  MessageQueue                           │
│  - 自动刷新（每1秒）                                    │
│  - 阈值触发（50条）                                     │
│  - 失败重试（放回队列）                                 │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                GCEngineMiddleware                       │
│  - 去重（DedupeStore）                                  │
│  - 重试（withRetry）                                    │
│  - 上报到后端                                           │
└─────────────────────────────────────────────────────────┘
```

## 十、实现计划

### 阶段一：核心架构搭建（P0）

1. **创建目录结构**
   - 创建 `core/`, `adapters/`, `application/` 目录
   - 迁移现有类型定义到 `types/`

2. **实现端口接口**
   - `IWAWebAdapter` - WhatsApp Web API 端口
   - `IReporter` - 上报端口
   - `IEventBus` - 事件总线端口

3. **实现 WAWebAdapter**
   - `ModuleLoader` - 模块加载器
   - `AuthBinding` - 认证模块绑定
   - `ChatBinding` - 聊天模块绑定
   - `MessageBinding` - 消息模块绑定
   - `ContactBinding` - 联系人模块绑定

### 阶段二：服务层实现（P1）

4. **实现领域服务**
   - `AuthService` - 认证服务
   - `ChatService` - 聊天服务
   - `MessageService` - 消息服务
   - `ContactService` - 联系人服务
   - `SyncService` - 同步服务

5. **实现上报适配器**
   - `MessageQueue` - 消息队列
   - `ReportScheduler` - 上报调度器
   - `ReporterAdapter` - 上报适配器

### 阶段三：应用层集成（P2）

6. **实现 SDK 入口**
   - `WhatsAppSDK` - 组装各层组件
   - 保持对外 API 兼容

7. **测试与验证**
   - 单元测试各服务
   - 集成测试上报流程
   - 端到端测试完整流程

### 阶段四：优化与清理（P3）

8. **删除旧代码**
   - 删除旧的 `sdk/` 目录
   - 更新导出

9. **文档更新**
   - 更新 CLAUDE.md
   - 更新 API 文档

## 十一、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| WhatsApp Web 内部 API 变更 | 功能失效 | 模块绑定层隔离变更影响 |
| 上报队列内存溢出 | 性能问题 | 设置队列上限，丢弃最旧数据 |
| 重构期间功能回归 | 用户体验 | 保持对外 API 兼容，渐进式迁移 |
| 测试覆盖不足 | 质量问题 | 先写测试，再实现功能 |

## 十二、成功标准

1. **架构目标**
   - [ ] 核心层无外部依赖
   - [ ] 各服务可独立测试
   - [ ] 添加新功能无需修改核心类

2. **功能目标**
   - [ ] 所有现有功能正常工作
   - [ ] 上报时机明确且可追踪
   - [ ] 失败上报可重试

3. **质量目标**
   - [ ] 测试覆盖率 > 80%
   - [ ] 无 TypeScript 类型错误
   - [ ] 代码复杂度降低
