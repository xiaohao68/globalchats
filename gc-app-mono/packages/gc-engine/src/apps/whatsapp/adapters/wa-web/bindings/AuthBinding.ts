import type { ModuleLoader } from "../ModuleLoader";
import type { WAUserInfo, SocketState } from "../../../sdk/types";

/**
 * 认证模块绑定
 * 封装与 WhatsApp Web 认证相关的内部模块交互
 */
export class AuthBinding {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private appState: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cmd: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private conn: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private contactCollection: any;

  constructor(private moduleLoader: ModuleLoader) {
    this.initModules();
  }

  private initModules(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socketModel = this.moduleLoader.get<any>("WAWebSocketModel");
    this.appState = socketModel?.Socket;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cmdModule = this.moduleLoader.get<any>("WAWebCmd");
    this.cmd = cmdModule?.Cmd;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connModel = this.moduleLoader.get<any>("WAWebConnModel");
    this.conn = connModel?.Conn;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contactCol = this.moduleLoader.get<any>("WAWebContactCollection");
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
  async getCurrentUser(): Promise<WAUserInfo | null> {
    if (!this.isLoggedIn()) {
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userPrefs = this.moduleLoader.get<any>("WAWebUserPrefsMeUser");
      const currentId = userPrefs?.getMePnUserOrThrow();
      const contact = this.contactCollection?.get(currentId);

      return {
        id: contact?.id?._serialized ?? "",
        nickname: this.conn?.pushname ?? "",
        avatar: contact?.profilePicThumb?.eurl ?? "",
        isGroup: false,
        phone: contact?.id?.user ?? "",
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
      if (state === "CONNECTED") {
        callback(true);
      }
    };

    this.appState.on("change:hasSynced", hasSyncedHandler);
    this.appState.on("change:state", stateChangeHandler);

    return () => {
      this.appState.off("change:hasSynced", hasSyncedHandler);
      this.appState.off("change:state", stateChangeHandler);
    };
  }

  /**
   * 监听登出事件
   */
  onLogout(callback: () => void): () => void {
    if (!this.cmd) {
      return () => {};
    }

    this.cmd.on("logout", callback);
    return () => this.cmd.off("logout", callback);
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

    this.cmd.on("set_socket_state", handler);
    return () => this.cmd.off("set_socket_state", handler);
  }
}
