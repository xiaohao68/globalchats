import {
  hkCookie,
  middleEventLoop,
  middleEventLoopQueue,
  triggerClickEvent,
  triggerEscEvent,
} from "@gc/misc";
import { IThirdAppUserInfo } from "@gc/model";
import { isEmpty } from "lodash-es";
import { ESDKEventType } from "../../engine/sdk/SDKEvent.ts";
import { pollExcFn } from "../../../utils";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK.ts";

class FacebookSDK extends AbstractAppSDK {
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
    const userInfo = this.getChatUserInfo();
    if (isEmpty(userInfo)) {
      return;
    }
    userInfo!.id = userId;
    return userInfo as IThirdAppUserInfo;
  }

  getChatUserInfo(): Nullable<Partial<IThirdAppUserInfo>> {
    const userContainerDom = document.querySelector<HTMLElement>(
      "main .x9f619.x1ja2u2z.x78zum5.x1n2onr6.x1r8uery.x1iyjqo2.xs83m0k.xeuugli.x1qughib.x6s0dn4.xozqiw3.x1q0g3np.xexx8yu.xykv574.xbmpl8g.x4cne27.xifccgj",
    );
    if (!userContainerDom) {
      return;
    }
    const usernameDom = userContainerDom.querySelector(
      ".x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft",
    );
    const avatarWrapperDom = userContainerDom.querySelectorAll("img");
    const username = usernameDom?.textContent?.trim();
    const isGroup = avatarWrapperDom.length > 1;
    const avatarDom = avatarWrapperDom[0];
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

    const avatarDom = await pollExcFn(() => {
      return document.querySelector<HTMLAnchorElement>(
        '.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.xixxii4.x13vifvy.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1.x1dr59a3.xeq5yr9.x1n327nk .x1iyjqo2.xh8yej3>  :last-child a[role="link"][href]',
      );
    }, 5_000);
    const avatarUrl = avatarDom.getAttributeNS(
      "http://www.w3.org/1999/xlink",
      "href",
    );

    triggerClickEvent(avatarDom);

    const nicknameDom = await pollExcFn(() => {
      return document.querySelector<HTMLElement>(
        ".x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1lkfr7t.x1lbecb7.x1s688f.xzsf02u.x1yc453h",
      );
    });

    const nickname = nicknameDom.innerText;
    triggerEscEvent();
    return {
      id: this.currentUserId!,
      nickname: nickname,
      avatar: avatarUrl || "",
      isGroup: false,
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
    return !!this.currentUserId;
  }

  get currentUserId() {
    return hkCookie.getCookie("c_user");
  }

  isGroup(userId: string) {
    return userId.startsWith("-");
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
    if (match && match[1]) {
      return match[1];
    } else {
      return "";
    }
  }
}

export const facebookSDK = new FacebookSDK();
