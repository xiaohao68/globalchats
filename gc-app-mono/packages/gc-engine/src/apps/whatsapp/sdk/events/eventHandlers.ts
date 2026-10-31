import type { IThirdAppUserInfo } from "@gc/model";
import type {
  EWhatsappWAState,
  IWAChatModel,
  IStoreChat,
  SocketState,
  IWAContactMethods,
} from "../types";
import { toThirdAppUserInfo, isGroupId } from "../utils";
import type { IAuthStoreAppState, IAuthStoreCmd } from "../modules/authStore";

/**
 * 事件监听器清理函数
 */
type CleanupFn = () => void;

/**
 * 注册登录状态变化监听器
 */
export function registerLoginStatusHandler(
  appState: IAuthStoreAppState,
  onLoginStatusChange: (isLogin: boolean) => void,
): CleanupFn {
  const hasSyncedHandler = () => {
    onLoginStatusChange(true);
  };

  const stateChangeHandler = (...args: unknown[]) => {
    const state = args[1] as EWhatsappWAState;
    if (state === "CONNECTED") {
      onLoginStatusChange(true);
    }
  };

  appState.on("change:hasSynced", hasSyncedHandler);
  appState.on("change:state", stateChangeHandler);

  return () => {
    appState.off("change:hasSynced", hasSyncedHandler);
    appState.off("change:state", stateChangeHandler);
  };
}

/**
 * 注册登出监听器
 */
export function registerLogoutHandler(
  authCmd: IAuthStoreCmd,
  onLogout: () => void,
): CleanupFn {
  const logoutHandler = () => {
    onLogout();
  };

  authCmd.on("logout", logoutHandler);

  return () => {
    authCmd.off("logout", logoutHandler);
  };
}

/**
 * 注册聊天变化监听器
 */
export function registerChatChangeHandler(
  storeChat: IStoreChat,
  contactMethods: IWAContactMethods | null,
  onCurrentChatChange: (user: IThirdAppUserInfo) => void,
): CleanupFn {
  const chatActiveHandler = (chatModel: IWAChatModel, isActive?: boolean) => {
    if (!isActive) return;

    const contactModel = chatModel.contact;
    const isGroup = contactMethods
      ? contactMethods.getIsGroup(contactModel)
      : isGroupId(chatModel.id._serialized);

    const serializedContact = contactModel.serialize();
    const user = toThirdAppUserInfo({
      ...serializedContact,
      isGroup,
      phone: isGroup ? undefined : chatModel.id.user,
    });
    user.nickname = chatModel.title();

    onCurrentChatChange(user);
  };

  storeChat.on("change:active", chatActiveHandler);

  return () => {
    storeChat.off("change:active", chatActiveHandler);
  };
}

/**
 * 事件处理器管理器
 */
export class EventHandlerManager {
  private cleanupFns: CleanupFn[] = [];

  /**
   * 添加清理函数
   */
  add(cleanup: CleanupFn): void {
    this.cleanupFns.push(cleanup);
  }

  /**
   * 清理所有事件监听器
   */
  cleanup(): void {
    for (const fn of this.cleanupFns) {
      try {
        fn();
      } catch (error) {
        console.warn("[WhatsAppSDK] Error during event cleanup:", error);
      }
    }
    this.cleanupFns = [];
  }
}

/**
 * 注册 Socket 状态变化监听器
 */
export function registerSocketStateHandler(
  authCmd: IAuthStoreCmd,
  onSocketStateChange: (state: SocketState) => void,
): CleanupFn {
  const socketStateHandler = (...args: unknown[]) => {
    const newState = args[0] as string;
    onSocketStateChange(newState as SocketState);
  };

  authCmd.on("set_socket_state", socketStateHandler);

  return () => {
    authCmd.off("set_socket_state", socketStateHandler);
  };
}

/**
 * 注册聊天关闭监听器
 */
export function registerChatCloseHandler(
  authCmd: IAuthStoreCmd,
  onChatClose: () => void,
): CleanupFn {
  const chatCloseHandler = () => {
    onChatClose();
  };

  authCmd.on("close_chat", chatCloseHandler);

  return () => {
    authCmd.off("close_chat", chatCloseHandler);
  };
}
