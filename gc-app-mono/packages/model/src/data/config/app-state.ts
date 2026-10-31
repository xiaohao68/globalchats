import { IThirdAppConfig } from "../store";
import {
  EPlatform,
  IChatUserConfig,
  IThirdAppUserInfo,
} from "./third-app-config";

export enum EAppStatus {
  closed,
  show,
  hide,
  loading,
  disabled,
}

export enum ELoadingStatus {
  none = "none",
  init = "init",
  navigation = "navigation",
  started = "started",
  finished = "finished",
}

export interface AppState {
  id: IThirdAppConfig["id"];
  platform: EPlatform;
  index: number;
  status: EAppStatus;
  isSelect: boolean;
  isOnline: boolean;
  loadingStatus: ELoadingStatus;

  unreadCount: number;
  userInfo?: IThirdAppUserInfo;
  currentChatUser?: IThirdAppUserInfo;
  chatUserConfigList: Record<string, IChatUserConfig>;
}

export const makeDefaultAppState = (appConfig: IThirdAppConfig): AppState => ({
  id: appConfig.id,
  platform: appConfig.platform,
  index: appConfig.index, // persist
  status: EAppStatus.closed,
  isSelect: false,
  isOnline: false,
  loadingStatus: ELoadingStatus.none,

  unreadCount: 0,
  userInfo: appConfig.userInfo, // persist

  chatUserConfigList: appConfig.chatUserConfigList, // persist
});
