import { isEmpty } from "lodash-es";
import { AbstractLifeCycle, hkLocalStorage } from "@gc/misc";
import { telegramSDK } from "../sdk";
import { ESDKEventType } from "../../engine/sdk/SDKEvent.ts";

type IUserAuth = {
  dcID: number;
  id: string;
};
type ITgmeSync = {
  canRedirect: boolean;
};

class TelegramLocalStorage implements AbstractLifeCycle {
  #userAuthKey = "user_auth";
  #tgmeSyncKey = "tgme_sync";
  #prevIsLogin = false;

  constructor() {
    this.mount();
  }

  mount() {
    this.#prevIsLogin = this.isLoginEd;
    hkLocalStorage.onLocalStorageChange(this.#tgmeSyncKey, () => {
      const isLogin = this.isLoginEd;
      if (isLogin !== this.#prevIsLogin) {
        telegramSDK.emitter.emit(ESDKEventType.changeLoginStatus, {
          payload: {
            isLogin: !isLogin,
          },
        });
        this.#prevIsLogin = isLogin;
      }
    });
  }

  destroy() {}

  get isLoginEd() {
    const tgmeSyncStr = localStorage.getItem(this.#tgmeSyncKey)!;
    if (isEmpty(tgmeSyncStr)) {
      return false;
    }
    const tgmeSync: ITgmeSync = JSON.parse(tgmeSyncStr);
    return tgmeSync.canRedirect;
  }

  get userId() {
    if (!this.isLoginEd) {
      return;
    }

    const userAuthStr = localStorage.getItem(this.#userAuthKey)!;
    if (isEmpty(userAuthStr)) {
      return;
    }

    const userAuth: IUserAuth = JSON.parse(userAuthStr);
    return userAuth.id;
  }
}

export const telegramLocalStorage = new TelegramLocalStorage();
