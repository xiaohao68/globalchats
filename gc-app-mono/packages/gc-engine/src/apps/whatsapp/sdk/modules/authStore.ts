import { moduleLoader } from "./moduleLoader";
import type { EWhatsappWAState } from "../types";

/**
 * AuthStore 接口定义
 */
export interface IAuthStoreAppState {
  /** 是否已完成同步 */
  hasSynced: boolean;
  /** 当前连接状态 */
  state: EWhatsappWAState;
  /** 监听事件 */
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  /** 取消监听 */
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

export interface IAuthStoreCmd {
  /** 监听事件 */
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  /** 取消监听 */
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

export interface IAuthStoreConn {
  /** 当前用户 WID */
  wid?: {
    _serialized: string;
    user: string;
    server: string;
  };
}

/**
 * 初始化 AuthStore 模块
 * 将 WhatsApp Web 内部认证模块暴露到 window.AuthStore
 */
export function initAuthStore(): void {
  // @ts-expect-error 全局 AuthStore 对象
  if (window.AuthStore) {
    return;
  }

  const socketModel = moduleLoader.getRequired<{
    Socket: IAuthStoreAppState;
  }>("WAWebSocketModel");
  const cmdModule = moduleLoader.getRequired<{ Cmd: IAuthStoreCmd }>(
    "WAWebCmd",
  );
  const connModel = moduleLoader.get<{ Conn: IAuthStoreConn }>(
    "WAWebConnModel",
  );

  // @ts-expect-error 设置全局 AuthStore
  window.AuthStore = {
    AppState: socketModel.Socket,
    Cmd: cmdModule.Cmd,
    Conn: connModel?.Conn,
  };
}

/**
 * 获取 AuthStore.AppState
 */
export function getAppState(): IAuthStoreAppState | null {
  // @ts-expect-error 全局 AuthStore 对象
  return window.AuthStore?.AppState ?? null;
}

/**
 * 获取 AuthStore.Cmd
 */
export function getAuthCmd(): IAuthStoreCmd | null {
  // @ts-expect-error 全局 AuthStore 对象
  return window.AuthStore?.Cmd ?? null;
}

/**
 * 获取 AuthStore.Conn
 */
export function getAuthConn(): IAuthStoreConn | null {
  // @ts-expect-error 全局 AuthStore 对象
  return window.AuthStore?.Conn ?? null;
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  const appState = getAppState();
  return appState?.hasSynced ?? false;
}
