import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { appStore, userStore } from "@gc/store";
import { isEqual } from "lodash-es";
import { hkHistory } from "@gc/misc";
import { attachStyleSheet, getCurrentWebviewId, sleep } from "@gc/utils";
import styles from "./styles.css?inline";
import { messengerSDK } from "./sdk";
import { startMessengerDomProbe, stopMessengerDomProbe } from "./domProbe";

class Messenger extends AbstractAppEngine {
  appSDK = messengerSDK;

  constructor() {
    super();
    attachStyleSheet(styles);
  }

  async mount() {
    await super.mount();
    // 临时诊断：把 messenger.com 真实 DOM 结构 dump 到 app.log（正式监听上线后删除）
    startMessengerDomProbe();
  }

  destroy() {
    super.destroy();
    stopMessengerDomProbe();
  }

  protectedJump() {
    const url = location.href;
    if (!url.includes("facebook.com/messages/t/")) {
      return;
    }
    location.href = userStore.getThirdAppConfigById(
      getCurrentWebviewId(),
    ).webviewOptions.url;
  }

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
}

export const messenger = new Messenger();
