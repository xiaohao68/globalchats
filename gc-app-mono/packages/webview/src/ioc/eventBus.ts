import mitt from "mitt";

export enum EAppEventType {
  appReady,
  //-------------------------------------------------------------------------------------
  // global setting
  //-------------------------------------------------------------------------------------
  // changeCurrentChatUser,
  // changeGlobalTranslate ,
  //-------------------------------------------------------------------------------------
  // app setting
  //-------------------------------------------------------------------------------------
  // changeAppTranslate = "changeAppTranslate",
  // changeAppProxy = "changeAppProxy",
  // changeAppUnreadCount,
  // changeAppUserInfo = "changeAppUserInfo",
  // changeAppCurrentChatUser = "changeAppCurrentChatUser",
  // changeChatUserConfigList = "changeChatUserConfigList",
}

export interface IAppEventPayload {
  [EAppEventType.appReady]: {};
  // [EAppEventType.changeCurrentChatUser]: {
  //     userId: string;
  // };
  //-------------------------------------------------------------------------------------
  // global setting
  //-------------------------------------------------------------------------------------
  // [EAppEventType.changeAppUnreadCount]: {
  //     unreadCount: number;
  // };
}

type ChannelMessageRecord = {
  [K in EAppEventType]: IAppEventPayload[K];
};

export const emitter = mitt<ChannelMessageRecord>();
