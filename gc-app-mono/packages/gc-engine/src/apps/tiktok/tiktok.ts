import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { attachStyleSheet } from "@gc/utils";
import styles from "./styles.css?inline";
import { tiktokSDK } from "./sdk";
import { ESDKEventType } from "../engine/sdk/SDKEvent.ts";
import { appStore } from "@gc/store";
import { isEmpty, isEqual, throttle } from "lodash-es";
import { startTikTokDomProbe, stopTikTokDomProbe } from "./domProbe.ts";

class Tiktok extends AbstractAppEngine {
  appSDK = tiktokSDK;
  #chatChangeObserver?: MutationObserver;

  constructor() {
    super();
    attachStyleSheet(styles);
  }

  async mount() {
    await super.mount();
    this.#chatChangeObserver = new MutationObserver(
      throttle(() => this.#checkChatChange(), 100),
    );
    this.#chatChangeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ----------------------------------------------------------------
    // 【临时】DOM 探针
    //
    // TikTok 网页用官方 `data-e2e` 测试钩子标注 DOM，比 LinkedIn 的 BEM class
    // 更稳定。写正式监听前先用探针把真实结构 dump 到日志，避免猜选择器。
    // 正式 watcher 落地后，把这一行和 domProbe.ts 一起删掉。
    // ----------------------------------------------------------------
    startTikTokDomProbe();
  }

  destroy() {
    super.destroy();
    this.#chatChangeObserver?.disconnect();
    stopTikTokDomProbe();
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

  listenerCurrentChatUserChange() {
    this.appSDK.emitter.on(
      ESDKEventType.changeCurrentChatUser,
      ({ payload }) => {
        const { user } = payload;
        if (isEmpty(user)) {
          return;
        }
        this.handleChangeCurrentChatUser(user);
      },
    );
  }
}

export const tiktok = new Tiktok();
