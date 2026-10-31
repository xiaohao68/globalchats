import { slowEventLoop, slowEventLoopQueue } from "@gc/misc";
import { IThirdAppUserInfo } from "@gc/model";
import { isEmpty } from "lodash-es";
import { ESDKEventType } from "../../engine/sdk/SDKEvent.ts";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK.ts";
import { findUserInfoFromDom } from "./utils.ts";
import { pollExcFn } from "../../../utils";

class TeamsSDK extends AbstractAppSDK {
  mount() {
    super.mount();
    let cachedIsLoginEd: boolean;
    slowEventLoopQueue.pushBack(() => {
      if (this.isLoginEd === cachedIsLoginEd) {
        return;
      }
      cachedIsLoginEd = this.isLoginEd;
      console.log("changeLoginStatus");

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
    console.log("getCurrentUserInfo");

    let r = await pollExcFn(() => {
      return findUserInfoFromDom();
    });
    console.log("getCurrentUser,rInfo", r);

    return r;
  }

  async setTheme() {}

  get isLoginEd() {
    return !!localStorage.getItem("LokiAuthToken");
  }

  get currentUserId() {
    return findUserInfoFromDom()?.id;
  }

  isGroup() {
    const currentChatUserAvatarList = document.querySelectorAll(
      ".msg-conversations-container__convo-item-link--active .msg-selectable-entity.msg-selectable-entity--4 img",
    );
    return currentChatUserAvatarList.length > 1;
  }

  get isLoginPage() {
    // #loginBtn
    return !this.isLoginEd;
  }

  get isChatPage(): boolean {
    const chatListDom = document.querySelector(
      '[data-shortcut-context="chat-and-channel-list"],[data-shortcut-context="chat-list"]',
    );
    return !!chatListDom;
  }

  get currentChatUserId(): string {
    if (!this.isChatPage) {
      return "";
    }
    const url = location.href;
    const userId = url.split("/thread/")[1]?.split("/")[0];
    return userId || "";
  }
}

export const teamsSDK = new TeamsSDK();
