import { hkCookie, middleEventLoop, middleEventLoopQueue } from "@gc/misc";
import { IThirdAppUserInfo } from "@gc/model";
import { isEmpty } from "lodash-es";
import { ESDKEventType } from "../../engine/sdk/SDKEvent.ts";
import { pollExcFn } from "../../../utils";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK.ts";

class InstagramSDK extends AbstractAppSDK {
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
      "main .x9f619.x1ja2u2z.x78zum5.x1n2onr6.xs83m0k.xeuugli.x6s0dn4.x1q0g3np.xexx8yu",
    );
    if (!userContainerDom) {
      return {
        nickname: "",
        avatar: "",
        isGroup: false,
      };
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

    const userInfoContainerDom = await pollExcFn(() => {
      return document.querySelector<HTMLAnchorElement>(
        '.x9f619.xjbqb8w.x78zum5.x168nmei.x13lgxp2.x5pf9jr.xo71vjh.xixxii4.x13vifvy.x1plvlek.xryxfnj.x1c4vz4f.x2lah0s.xdt5ytf.xqjyukv.x1qjc9v5.x1oa3qoh.x1nhvcw1.x1dr59a3.xeq5yr9.x1n327nk .x1iyjqo2.xh8yej3>  :last-child a[role="link"][href]',
      );
    }, 5_000);
    // console.log("userInfoContainerDom");
    // console.log(userInfoContainerDom);
    const match = userInfoContainerDom.href.match(
      /https:\/\/www\.instagram\.com\/([^\/]+)\//,
    );
    const nickname = match?.[1] || "";
    const avatarUrl = (
      userInfoContainerDom.querySelector("img") as HTMLImageElement
    ).src;

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
    return hkCookie.getCookie("ds_user_id");
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

export const instagramSDK = new InstagramSDK();
