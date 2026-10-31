import type { IWAWebAdapter } from "../ports/outbound/IWAWebAdapter";
import type { IReporter } from "../ports/outbound/IReporter";
import type { IEventBus } from "../ports/outbound/IEventBus";
import type { WAUserInfo } from "../../sdk/types";

/**
 * 认证服务
 * 负责管理认证状态和相关事件
 */
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
          void this.handleLogin();
        }
        this.eventBus.emit({
          type: "auth:login_status",
          timestamp: Date.now(),
          payload: { isLoggedIn },
        });
      }),
    );

    // 监听登出事件
    cleanups.push(
      this.waAdapter.onLogout(() => {
        void this.handleLogout();
        this.eventBus.emit({
          type: "auth:logout",
          timestamp: Date.now(),
          payload: undefined,
        });
      }),
    );

    // 监听 Socket 状态
    cleanups.push(
      this.waAdapter.onSocketStateChange((state) => {
        this.eventBus.emit({
          type: "auth:socket_state",
          timestamp: Date.now(),
          payload: { state },
        });
      }),
    );

    return () => cleanups.forEach((fn) => fn());
  }

  private async handleLogin(): Promise<void> {
    console.log("[AuthService] handleLogin: reporting status change");
    await this.reporter.reportStatusChange({
      eventType: "login",
      status: "logged_in",
      timestamp: Date.now(),
    });

    const user = await this.waAdapter.getCurrentUser();
    if (user) {
      console.log(`[AuthService] handleLogin: reporting current user id=${user.id}`);
      await this.reporter.reportCurrentUser(user);
      this.eventBus.emit({
        type: "auth:login",
        timestamp: Date.now(),
        payload: { userId: user.id },
      });
      console.log("[AuthService] handleLogin: auth:login event emitted");
    } else {
      console.warn("[AuthService] handleLogin: no user found after login");
    }
  }

  private async handleLogout(): Promise<void> {
    await this.reporter.reportStatusChange({
      eventType: "logout",
      status: "logged_out",
      timestamp: Date.now(),
    });
  }

  isLoggedIn(): boolean {
    return this.waAdapter.isLoggedIn();
  }

  async getCurrentUser(): Promise<WAUserInfo | null> {
    return this.waAdapter.getCurrentUser();
  }
}
