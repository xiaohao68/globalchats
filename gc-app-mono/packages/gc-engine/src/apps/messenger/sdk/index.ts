import {
  hkCookie,
  middleEventLoop,
  middleEventLoopQueue,
  triggerEscEvent,
} from "@gc/misc";
import { IThirdAppUserInfo } from "@gc/model";
import { isEmpty } from "lodash-es";
import { ESDKEventType } from "../../engine/sdk/SDKEvent.ts";
import { pollExcFn } from "../../../utils";
import { sleep } from "@gc/utils";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK.ts";

class MessengerSDK extends AbstractAppSDK {
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

  getCurrentChatUserInfo(userId: string): Nullable<IThirdAppUserInfo> {
    const userInfo = this.captureChatUserInfoFromDom();
    if (isEmpty(userInfo)) {
      return;
    }
    userInfo!.id = userId;
    return userInfo as IThirdAppUserInfo;
  }

  captureChatUserInfoFromDom(): Nullable<Partial<IThirdAppUserInfo>> {
    const userContainerDom = document.querySelector<HTMLElement>(
      'div[data-pagelet="MWInboxHomeRootInbox"] a[aria-current="page"][tabindex="0"]',
    );
    if (!userContainerDom) {
      return;
    }
    const usernameDom = userContainerDom.querySelector(
      "div > div > div:nth-child(2) > div > div > div > span > span",
    );
    const avatarWrapperDom = userContainerDom.querySelector(
      'div[data-visualcompletion="ignore-dynamic"] > div',
    );
    const username = usernameDom?.textContent!;
    const isGroup = avatarWrapperDom!.children.length > 1;
    const avatarDom = userContainerDom.querySelector("img");
    let avatarUrl = avatarDom?.src || "";

    return {
      nickname: username,
      avatar: avatarUrl,
      isGroup: isGroup,
    };
  }

  async getCurrentUserInfo(): Promise<Nullable<IThirdAppUserInfo>> {
    if (!this.isLoginEd) {
      return;
    }
    const avatarDom = (await pollExcFn(() => {
      return document.querySelector(
        'div[data-pagelet="MWCMProfilePhotoMenu"] > div > div > div > div:nth-child(1) > div > div > div > div > div',
      );
    }, 5_000)) as HTMLDivElement;
    if (!avatarDom) {
      return;
    }
    const svgImage = avatarDom.querySelector("svg image");
    if (!svgImage) {
      return;
    }
    const avatarUrl = svgImage.getAttributeNS(
      "http://www.w3.org/1999/xlink",
      "href",
    );
    avatarDom.click();
    await sleep();

    const menuSettingBtn = (await pollExcFn(() => {
      return document.querySelector(
        'div[role="menu"] > div > div > div > div > div > div > div > div:nth-child(1)',
      );
    }, 2_000)) as HTMLDivElement;
    menuSettingBtn.click();

    const usernameDom = await pollExcFn(() => {
      return document.querySelector<HTMLSpanElement>(
        `[role="dialog"] a[href="https://www.facebook.com/${this.currentUserId}/"] span`,
      );
    });
    const nickname = usernameDom.innerText;
    await this.setTheme();

    await sleep(17);

    triggerEscEvent();

    return {
      id: this.currentUserId!,
      nickname: nickname,
      avatar: avatarUrl || "",
      isGroup: false,
      // remarkName?: string;
      // phone?:string
    };
  }

  async setTheme() {
    // const themeBtn = document.querySelector('button[aria-label="Toggle dark mode"]')
    // themeBtn?.click()
    const themeBtn = (await pollExcFn(() => {
      return document.querySelector(
        'input[type="radio"][value="use_system_dark_mode"]',
      );
    })) as HTMLInputElement;
    themeBtn.click();
  }

  get isLoginEd() {
    return !!this.currentUserId;
  }

  get currentUserId() {
    return hkCookie.getCookie("c_user");
  }

  isGroup(_userId: string) {
    // return userId.startsWith("-");
    return false;
  }

  get isLoginPage() {
    return !this.isChatPage;
  }

  get isChatPage(): boolean {
    return this.isLoginEd;
  }

  get currentChatUserId(): string {
    if (!this.isChatPage) {
      return "";
    }
    const regex = /t\/(\d+)/;
    const url = location.href;
    const match = url.match(regex);
    console.log("match");
    console.log(url);
    console.log(match);
    if (match && match[1]) {
      return match[1];
    } else {
      return "";
    }
  }
}

export const messengerSDK = new MessengerSDK();
