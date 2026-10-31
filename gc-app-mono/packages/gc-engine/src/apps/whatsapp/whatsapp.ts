import { AbstractAppEngine } from "../engine/AbstractAppEngine.ts";
import { sleep } from "@gc/utils";
import { whatsappSDK } from "./sdk";
import { ESDKEventType } from "../engine/sdk/SDKEvent.ts";

class Whatsapp extends AbstractAppEngine {
  appSDK = whatsappSDK;

  async getCurrentUserInfo() {
    await sleep(100);
    await super.getCurrentUserInfo();
  }

  listenerCurrentChatUserChange() {
    this.appSDK.emitter.on(
      ESDKEventType.changeCurrentChatUser,
      ({ payload }) => {
        const { user } = payload;
        this.handleChangeCurrentChatUser(user);
      },
    );
  }
}

export const whatsapp = new Whatsapp();
