import { IThirdAppUserInfo } from "@gc/model";
import mitt from "mitt";
import { AbstractLifeCycle } from "@gc/misc";

export enum ESDKEventType {
  changeCurrentUser = "changeCurrentUser",
  changeCurrentChatUser = "changeCurrentChatUser",
  changeLoginStatus = "changeLoginStatus",
  logout = "logout",
}

interface ISDKEventMessagePayload {
  [ESDKEventType.changeCurrentUser]: {
    user: IThirdAppUserInfo;
  };
  [ESDKEventType.changeCurrentChatUser]: {
    user: IThirdAppUserInfo;
  };
  [ESDKEventType.changeLoginStatus]: {
    isLogin: boolean;
  };
  [ESDKEventType.logout]: undefined;
}

export interface ISDKEventMessage<K extends ESDKEventType = ESDKEventType> {
  payload: ISDKEventMessagePayload[K];
}

type ISDKEventMessageRecord = {
  [K in ESDKEventType]: ISDKEventMessage<K>;
};

export class SDKEvent implements AbstractLifeCycle {
  readonly emitter = mitt<ISDKEventMessageRecord>();

  mount() {}
  destroy() {
    this.emitter.all.clear();
  }
}
