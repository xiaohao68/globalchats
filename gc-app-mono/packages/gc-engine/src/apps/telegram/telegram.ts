import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { appStore } from "@gc/store";
import { isEqual } from "lodash-es";
import { hkHistory } from "@gc/misc";
import { attachStyleSheet } from "@gc/utils";
import styles from "./styles.css?inline";
import { telegramSDK } from "./sdk";

class Telegram extends AbstractAppEngine {
  appSDK = telegramSDK;

  constructor() {
    super();
    attachStyleSheet(styles);
  }

  listenerCurrentChatUserChange() {
    window.addEventListener(hkHistory.name, () => {
      const currentChatUser = appStore.getCurrentChatUserByAppId();
      const currentChatUserId = this.appSDK.currentChatUserId;

      if (isEqual(currentChatUserId, currentChatUser?.id)) {
        return;
      }

      const chatUserInfo = this.appSDK.getCurrentChatUserInfo(
        currentChatUserId!,
      );
      this.handleChangeCurrentChatUser(chatUserInfo);
    });
  }

  async initAppSetting() {
    if (!this.appSDK.isLoginEd) {
      return;
    }
    await this.appSDK.setTheme();
  }
}

export const telegram = new Telegram();
