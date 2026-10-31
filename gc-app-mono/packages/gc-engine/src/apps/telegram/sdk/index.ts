import {
  hkLocalStorage,
  triggerClickEvent,
  triggerEscEvent,
  triggerMouseDownEvent,
  triggerPopstateEvent,
} from "@gc/misc";
import { IThirdAppUserInfo } from "@gc/model";
import { pollExcFn } from "../../../utils";
import { getCurrentWebviewId, sleep } from "@gc/utils";
import { AbstractAppSDK } from "../../engine/sdk/AbstractAppSDK.ts";
import {
  telegramCachedStorage,
  telegramIndexedDB,
  telegramLocalStorage,
} from "../helper";
import { telegram } from "../telegram.ts";
import { appStore } from "@gc/store";

class TelegramSDK extends AbstractAppSDK {
  async mount() {
    await telegramIndexedDB.mount();
    await telegramCachedStorage.mount();
    hkLocalStorage.mount();
  }

  destroy() {
    super.destroy();
  }

  getCurrentChatUserInfo(userId: string): Nullable<IThirdAppUserInfo> {
    if (!userId) {
      return;
    }
    return telegramIndexedDB.getChatUserInfoById(userId);
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
    const currentUserId = this.currentUserId;
    if (!currentUserId) {
      return;
    }

    const nickname = await pollExcFn(() => {
      const userNameDom =
        document.querySelector<HTMLAnchorElement>(".fullName");
      if (userNameDom) {
        return userNameDom.textContent;
      }
    }, 2_000);

    const avatarFile = await telegramCachedStorage.getAvatarById(currentUserId);
    return {
      id: currentUserId,
      // @ts-ignore
      avatar: avatarFile || "",
      nickname: nickname,
      isGroup: false,
    };
  }

  async setTheme() {
    const settingsBtn = await pollExcFn(() => {
      return document.querySelector(
        "#Main #LeftMainHeader .DropdownMenu.main-menu .icon.icon-settings",
      );
    });
    triggerClickEvent(settingsBtn);

    try {
      const avatarUrl = await pollExcFn(() => {
        const img = document.querySelector<HTMLImageElement>(
          "#Settings .settings-main-menu.self-profile .ProfilePhoto img",
        );
        if (img?.src) {
          return img.src;
        }
      }, 2_000).catch(() => null);

      const userInfo = await this.getCurrentUserInfo();
      if (userInfo) {
        telegram.updateCurrentUserInfo({
          ...userInfo,
          avatar:
            appStore.getAppById(getCurrentWebviewId()).userInfo?.avatar || "",
        });
      }
      if (avatarUrl) {
        telegram.updateCurrentUserAvatar(avatarUrl, this.currentUserId);
      }
    } catch (error) {
      console.error("用户没有头像");
    }

    const generalSettingsBtn = await pollExcFn(() => {
      return document.querySelector(
        "#Settings .settings-main-menu .icon.icon-settings.ListItem-main-icon",
      );
    });

    triggerMouseDownEvent(generalSettingsBtn);

    const autoThemeBtn = await pollExcFn(() => {
      return document.querySelector(
        "#Settings input[name='theme'][value='auto']",
      );
    });

    triggerClickEvent(autoThemeBtn);

    triggerPopstateEvent(window);
    await sleep();
    triggerEscEvent();
    await sleep(500);
    triggerEscEvent();
  }

  get isLoginEd() {
    return telegramLocalStorage.isLoginEd;
  }

  get currentUserId() {
    return telegramLocalStorage.userId;
  }

  get currentChatUserId() {
    if (!this.isChatPage) {
      return "";
    }
    const regex = /#(-?\d+)/;

    const url = location.href;
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    } else {
      return "";
    }
  }

  get isChatPage(): boolean {
    const regex = /\/a\/#/;
    const url = location.href;
    return regex.test(url);
  }

  get isLoginPage() {
    return !this.isLoginEd;
  }

  isGroup(userId: string) {
    return userId.startsWith("-");
  }
}

export const telegramSDK = new TelegramSDK();
