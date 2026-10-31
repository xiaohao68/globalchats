import { AbstractLifeCycle, middleEventLoop, middleEventLoopQueue } from "@gc/misc";
import { IThirdAppUserInfo, MainWebviewId } from "@gc/model";
import { ESDKEventType, SDKEvent } from "./SDKEvent.ts";
import { appStore } from "@gc/store";
import { getCurrentWebviewId } from "@gc/utils";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { ETaskStatus } from "../../../task";
import { getDefaultMiddlewareForCurrentWebview } from "../../../middleware/defaultMiddleware.ts";

export abstract class AbstractAppSDK
  extends SDKEvent
  implements AbstractLifeCycle
{
  #userInfoRefreshStatus = ETaskStatus.none;

  mount() {
    super.mount();
    let cachedIsLoginEd: boolean;

    middleEventLoopQueue.pushBack(() => {
      if (this.isLoginEd === cachedIsLoginEd) {
        return;
      }
      cachedIsLoginEd = this.isLoginEd;
      this.emitter.emit(ESDKEventType.changeLoginStatus, {
        payload: {
          isLogin: this.isLoginEd,
        },
      });
    });

    middleEventLoop();
  }

  destroy() {
    super.destroy();
  }

  abstract getCurrentChatUserInfo(userId: string): Nullable<IThirdAppUserInfo>;

  abstract getCurrentUserInfo(): Promise<Nullable<IThirdAppUserInfo>>;

  async refreshCurrentUserInfo(force = false) {
    try {
      if (this.#userInfoRefreshStatus !== ETaskStatus.none && !force) {
        return;
      }
      this.#userInfoRefreshStatus = ETaskStatus.pending;
      // this.
      const app = appStore.getAppById(getCurrentWebviewId());

      const userInfo = await this.getCurrentUserInfo();
      console.log("userInfo", userInfo);
      if (!userInfo) {
        return;
      }

      this.updateCurrentUserInfo({
        ...userInfo,
        avatar: app.userInfo?.avatar || "",
      });

      this.updateCurrentUserAvatar(userInfo.avatar, userInfo.id);

      const middleware = getDefaultMiddlewareForCurrentWebview();
      if (middleware) {
        void middleware.reportCurrentUser({
          ...userInfo,
          avatar: app.userInfo?.avatar || "",
        });
      }

      this.#userInfoRefreshStatus = ETaskStatus.success;
    } finally {
      if (this.#userInfoRefreshStatus === ETaskStatus.pending) {
        this.#userInfoRefreshStatus = ETaskStatus.none;
      }
    }
  }

  clearCurrentUserInfo() {
    const app = appStore.getAppById(getCurrentWebviewId());
    app.userInfo = {
      id: "",
      avatar: "",
      nickname: "",
      isGroup: false,
    };
    appStore.updateAppList([app]);
    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [MainWebviewId],
        type: EChannelMessageEventType.changeAppUserInfo,
        payload: {
          userInfo: app.userInfo,
        },
      }),
    );
  }

  updateCurrentUserInfo(userInfo: IThirdAppUserInfo) {
    const app = appStore.getAppById(getCurrentWebviewId());
    app.userInfo = {
      id: userInfo.id,
      avatar: userInfo.avatar || "",
      nickname: userInfo.nickname,
      isGroup: false,
    };
    appStore.updateAppList([app]);
    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [MainWebviewId],
        type: EChannelMessageEventType.changeAppUserInfo,
        payload: {
          userInfo: app.userInfo,
        },
      }),
    );
  }

  updateCurrentUserAvatar(
    _avatarFile: ArrayBuffer | string,
    _fileName: string = "",
  ) {
    // 文件上传功能已禁用
    console.warn("updateCurrentUserAvatar is disabled");
    return;
  }

  abstract setTheme(): void;

  get isLoginEd() {
    return !!this.currentUserId;
  }

  abstract get currentUserId(): Nullable<string>;

  abstract get currentChatUserId(): string;

  abstract get isChatPage(): boolean;

  abstract get isLoginPage(): boolean;

  abstract isGroup(userId: string): boolean;
}
