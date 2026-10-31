import { AbstractLifeCycle, hkHistory } from "@gc/misc";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { isEmpty, isEqual } from "lodash-es";
import { appStore } from "@gc/store";
import { getCurrentWebviewId, Nullable, sleep } from "@gc/utils";
import { IThirdAppUserInfo, MainWebviewId, SideWebviewId } from "@gc/model";
import { AbstractAppSDK } from "./sdk/AbstractAppSDK.ts";
import { ESDKEventType } from "./sdk/SDKEvent.ts";
import { getDefaultMiddlewareForCurrentWebview } from "../../middleware/defaultMiddleware.ts";

export abstract class AbstractAppEngine extends AbstractLifeCycle {
  abstract appSDK: AbstractAppSDK;

  async mount() {
    hkHistory();

    this.appSDK.mount();
    this.appSDK.emitter.on(ESDKEventType.changeLoginStatus, ({ payload }) => {
      const { isLogin } = payload;
      this.handleLoginChange(isLogin);
    });

    // 注意：initAppSetting 内部要读 appStore 里的应用配置，任何一次失败
    // （例如 appId 没对上）都会往上一抛。而子类的 mount() 是 `await super.mount()`
    // 之后才注册「消息监听」等核心能力 —— 一旦这里抛出，监听就永远不会挂上，
    // 表现是「页面正常、但一条消息都收不到」，且只在 unhandledrejection 里可见。
    // 所以这里必须吞掉异常，保证挂载流程继续。
    try {
      await this.initAppSetting();
    } catch (error) {
      console.error("[gcEngine] initAppSetting 失败，继续挂载其余能力:", error);
    }
    this.listenerCurrentChatUserChange();
  }

  destroy() {}

  async getCurrentUserInfo() {
    console.log("getCurrentUserInfo");
    const app = appStore.getAppById(getCurrentWebviewId());
    if (!isEmpty(app.userInfo?.id) && !isEmpty(app.userInfo?.avatar)) {
      return;
    }
    const userInfo = await this.appSDK.getCurrentUserInfo();
    if (!userInfo) {
      return;
    }

    this.updateCurrentUserInfo({
      ...userInfo,
      avatar: app.userInfo?.avatar || "",
    });

    this.updateCurrentUserAvatar(userInfo.avatar, userInfo.id);
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

  getCurrentChatUserInfo(userId: string): Nullable<IThirdAppUserInfo> {
    if (!userId) {
      return;
    }
    return this.appSDK.getCurrentChatUserInfo(userId);
  }

  protectedJump() {}

  listenerCurrentChatUserChange() {
    window.addEventListener(hkHistory.name, async () => {
      this.protectedJump();
      const currentChatUser = appStore.getCurrentChatUserByAppId();
      const currentChatUserId = this.appSDK.currentChatUserId;

      if (isEqual(currentChatUserId, currentChatUser?.id)) {
        return;
      }

      await sleep(50);
      const chatUserInfo = this.getCurrentChatUserInfo(currentChatUserId!);
      this.handleChangeCurrentChatUser(chatUserInfo);
    });
  }

  async initAppSetting() {
    if (!this.appSDK.isLoginEd) {
      return;
    }
    await this.getCurrentUserInfo();
  }

  handleLoginChange(isLogin: boolean) {
    if (!isLogin) {
      this.logout();
    }
    // 登录状态变化时会反复触发，必须兜住异常，否则会刷出一串
    // 「[Unhandled Rejection] appId not found」污染日志、掩盖真正的问题。
    void this.initAppSetting().catch((error) => {
      console.error("[gcEngine] handleLoginChange → initAppSetting 失败:", error);
    });

    const middleware = getDefaultMiddlewareForCurrentWebview();
    if (middleware) {
      void middleware.reportEvents([
        {
          type: "login_changed",
          occurredAt: Date.now(),
          payload: { isLogin },
          version: 1,
          updatedAt: Date.now(),
        },
      ]);
    }
  }

  handleChangeCurrentChatUser(user: Nullable<IThirdAppUserInfo>) {
    if (isEmpty(user)) {
      appStore.clearCurrentChatUserByAppId();
      return;
    }
    appStore.updateCurrentChatUserByAppId(user);
    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [MainWebviewId, SideWebviewId],
        type: EChannelMessageEventType.changeAppCurrentChatUser,
        payload: {
          userInfo: user,
        },
      }),
    );
  }

  logout() {
    appStore.logout();
  }
}
