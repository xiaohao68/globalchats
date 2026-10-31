import { slowEventLoop, slowEventLoopQueue } from "@gc/misc";
import { IThirdAppUserInfo } from "@gc/model";
import { isEmpty } from "lodash-es";
import { ESDKEventType } from "../../engine/sdk/SDKEvent.ts";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK.ts";
import { pollExcFn } from "../../../utils";

class TiktokSDK extends AbstractAppSDK {
  mount() {
    super.mount();
    let cachedIsLoginEd: boolean;
    slowEventLoopQueue.pushBack(() => {
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

    slowEventLoop();
  }

  destroy() {
    super.destroy();
  }

  getCurrentChatUserInfo(userId: string): Nullable<IThirdAppUserInfo> {
    // console.log('getCurrentChatUserInfo');
    const userInfo = this.getChatUserInfo();
    if (isEmpty(userInfo)) {
      return;
    }
    userInfo!.id = userId;
    return userInfo as IThirdAppUserInfo;
  }

  getChatUserInfo(): Nullable<Partial<IThirdAppUserInfo>> {
    const userContainerDom = document.querySelector<HTMLElement>(
      "#main-content-messages",
    );
    if (!userContainerDom) {
      return {
        nickname: "",
        avatar: "",
        isGroup: false,
      };
    }
    const usernameDom = userContainerDom.querySelector(
      '[data-e2e="chat-nickname"]',
    );
    const avatarDom = userContainerDom.querySelector<HTMLImageElement>(
      '[data-e2e="top-chat-avatar"] img',
    );
    const username = usernameDom?.textContent?.trim() || "";
    const userId = this.currentChatUserId;

    const isGroup = !userId;
    let avatarUrl = avatarDom?.src || "";

    return {
      id: userId,
      nickname: username,
      avatar: avatarUrl,
      isGroup: isGroup,
    };
  }

  async getCurrentUserInfo() {
    // console.log("getCurrentUserInfo");
    if (!this.isLoginEd) {
      return;
    }

    const userInfoAnchorDom = await pollExcFn(() => {
      return document.querySelector<HTMLAnchorElement>(
        'a[data-e2e="nav-profile"]',
      );
    });
    if (!userInfoAnchorDom) {
      return;
    }
    const match = userInfoAnchorDom.href.match(/@[^/?&]+/);
    const nickname = match?.[0];

    const avatarUrl = userInfoAnchorDom.querySelector("img")?.src;

    return {
      id: this.currentUserId!,
      nickname: nickname || "",
      avatar: avatarUrl || "",
      isGroup: false,
      // skip: true,
    };
  }

  async setTheme() {
    // const themeBtn = document.querySelector('button[aria-label="Toggle dark mode"]')
    // themeBtn?.click()
    // const themeBtn = (await pollExcFn(() => {
    //   return document.querySelector(
    //     'input[type="radio"][value="use_system_dark_mode"]',
    //   );
    // })) as HTMLInputElement;
    // themeBtn.click();
  }

  get isLoginEd() {
    // console.log("this.currentUserId");
    // console.log(this.currentUserId);
    return !!this.currentUserId;
  }

  get currentUserId() {
    const userSessionStr = sessionStorage.getItem("user_session");
    if (!userSessionStr) {
      return;
    }
    try {
      const userSession: { uid: string } = JSON.parse(userSessionStr);
      return userSession.uid;
    } catch (error) {
      console.error(error);
      return;
    }
  }

  isGroup(userId: string) {
    return userId.startsWith("-");
  }

  get isLoginPage() {
    // #loginContainer
    const loginContainerDom = document.querySelector("#loginContainer");
    return !!loginContainerDom;
    // return !this.isChatPage;
  }

  get isChatPage(): boolean {
    const regex = /\/messages/;
    const url = location.href;
    return regex.test(url);
  }

  get currentChatUserId(): string {
    if (!this.isChatPage) {
      return "";
    }
    const userIdDom = document.querySelector<HTMLElement>(
      '#main-content-messages [data-e2e="chat-uniqueid"]',
    );
    return userIdDom?.textContent || "";
  }
}

export const tiktokSDK = new TiktokSDK();
