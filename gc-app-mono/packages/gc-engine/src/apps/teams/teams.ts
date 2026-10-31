import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { teamsSDK } from "./sdk";
import { ESDKEventType } from "../engine/sdk/SDKEvent.ts";
import { appStore } from "@gc/store";
import { isEmpty, isEqual, throttle } from "lodash-es";

class Teams extends AbstractAppEngine {
  appSDK = teamsSDK;
  #chatChangeObserver?: MutationObserver;

  async mount() {
    await super.mount();
    this.#chatChangeObserver = new MutationObserver(
      throttle(() => this.#checkChatChange(), 100),
    );
    this.#chatChangeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  destroy() {
    super.destroy();
    this.#chatChangeObserver?.disconnect();
  }

  #checkChatChange() {
    const currentChatUser = appStore.getCurrentChatUserByAppId();
    const currentChatUserId = this.appSDK.currentChatUserId;

    if (isEmpty(currentChatUserId)) {
      return;
    }

    if (isEqual(currentChatUserId, currentChatUser?.id)) {
      return;
    }

    this.appSDK.emitter.emit(ESDKEventType.changeCurrentChatUser, {
      payload: {
        user: this.appSDK.getCurrentChatUserInfo(currentChatUserId)!,
      },
    });
  }
}

export const teams = new Teams();
