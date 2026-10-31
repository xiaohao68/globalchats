import type { WAChat, WAMessage, SocketState } from "../../../sdk/types";

/**
 * 领域事件基类
 */
export interface DomainEvent {
  type: string;
  timestamp: number;
  payload: unknown;
}

/**
 * 认证登录状态事件
 */
export interface AuthLoginStatusEvent extends DomainEvent {
  type: "auth:login_status";
  payload: { isLoggedIn: boolean };
}

/**
 * 认证登录事件
 */
export interface AuthLoginEvent extends DomainEvent {
  type: "auth:login";
  payload: { userId: string };
}

/**
 * 认证登出事件
 */
export interface AuthLogoutEvent extends DomainEvent {
  type: "auth:logout";
  payload: undefined;
}

/**
 * Socket 状态变化事件
 */
export interface AuthSocketStateEvent extends DomainEvent {
  type: "auth:socket_state";
  payload: { state: SocketState };
}

/**
 * 聊天切换事件
 */
export interface ChatChangeEvent extends DomainEvent {
  type: "chat:change";
  payload: { chat: WAChat };
}

/**
 * 聊天关闭事件
 */
export interface ChatCloseEvent extends DomainEvent {
  type: "chat:close";
  payload: undefined;
}

/**
 * 新消息事件
 */
export interface MessageNewEvent extends DomainEvent {
  type: "message:new";
  payload: { message: WAMessage };
}

/**
 * 所有领域事件类型
 */
export type AllDomainEvents =
  | AuthLoginStatusEvent
  | AuthLoginEvent
  | AuthLogoutEvent
  | AuthSocketStateEvent
  | ChatChangeEvent
  | ChatCloseEvent
  | MessageNewEvent;

/**
 * 事件类型映射
 */
export type EventTypeMap = {
  "auth:login_status": AuthLoginStatusEvent;
  "auth:login": AuthLoginEvent;
  "auth:logout": AuthLogoutEvent;
  "auth:socket_state": AuthSocketStateEvent;
  "chat:change": ChatChangeEvent;
  "chat:close": ChatCloseEvent;
  "message:new": MessageNewEvent;
};

/**
 * 事件总线接口
 * 用于模块间解耦通信
 */
export interface IEventBus {
  /**
   * 发布事件
   */
  emit<T extends AllDomainEvents>(event: T): void;

  /**
   * 订阅事件
   * @returns 取消订阅函数
   */
  on<K extends keyof EventTypeMap>(
    eventType: K,
    handler: (event: EventTypeMap[K]) => void,
  ): () => void;

  /**
   * 一次性订阅
   */
  once<K extends keyof EventTypeMap>(
    eventType: K,
    handler: (event: EventTypeMap[K]) => void,
  ): () => void;
}
