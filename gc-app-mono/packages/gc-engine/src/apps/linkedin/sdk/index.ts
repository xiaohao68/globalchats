import { slowEventLoop, slowEventLoopQueue } from "@gc/misc";
import { IThirdAppUserInfo } from "@gc/model";
import { isEmpty } from "lodash-es";
import { ESDKEventType } from "../../engine/sdk/SDKEvent.ts";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK.ts";
import { findUserInfoFromCodeTag } from "./utils.ts";

class LinkedinSDK extends AbstractAppSDK {
  mount() {
    super.mount();
    let cachedIsLoginEd: boolean;
    slowEventLoopQueue.pushBack(() => {
      this.removeSmallWindowChat();
      if (this.isLoginEd === cachedIsLoginEd) {
        return;
      }
      cachedIsLoginEd = this.isLoginEd;
      this.emitter.emit(ESDKEventType.changeLoginStatus, {
        payload: {
          isLogin: this.isLoginEd,
        },
      });

      this.refreshCurrentUserInfo();
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
    const usernameDom = document.querySelector(
      // "#thread-detail-jump-target,#thread-detail-sponsored-sender-hoverable",
      ".msg-entity-lockup__entity-title-wrapper",
    );
    if (!usernameDom) {
      return {
        nickname: "",
        avatar: "",
        isGroup: false,
      };
    }
    // const avatarDom = userContainerDom.querySelector<HTMLImageElement>(
    //   '[data-e2e="top-chat-avatar"] img',
    // );
    const username = usernameDom?.textContent?.trim() || "";
    const userId = this.currentChatUserId;

    const isGroup = this.isGroup();
    // let avatarUrl = avatarDom?.src || "";

    return {
      id: userId,
      nickname: username,
      avatar: "",
      isGroup: isGroup,
    };
  }

  async getCurrentUserInfo() {
    if (!this.isLoginEd) {
      return;
    }

    return findUserInfoFromCodeTag();
  }

  async setTheme() {}

  get isLoginEd() {
    return !!localStorage.getItem("voyager-web:enterSend");
  }

  get currentUserId() {
    return findUserInfoFromCodeTag()?.id;
  }

  isGroup() {
    const currentChatUserAvatarList = document.querySelectorAll(
      ".msg-conversations-container__convo-item-link--active .msg-selectable-entity.msg-selectable-entity--4 img",
    );
    return currentChatUserAvatarList.length > 1;
  }

  get isLoginPage() {
    // #loginBtn
    return !!document.querySelector(
      '[data-tracking-control-name="guest_homepage-basic_nav-header-signin"],[data-tracking-control-name="public_jobs_nav-header-signin"]',
    );
  }

  get isChatPage(): boolean {
    const regex = /\/messaging/;
    const url = location.href;
    return regex.test(url);
  }

  get currentChatUserId(): string {
    if (!this.isChatPage) {
      return "";
    }
    const url = location.href;
    const userId = url.split("/thread/")[1]?.split("/")[0];
    return userId || "";
  }

  removeSmallWindowChat() {
    try {
      document.querySelector("#msg-overlay")?.remove();
    } catch (error) {
      console.error(error);
    }
  }
}

export const linkedinSDK = new LinkedinSDK();
