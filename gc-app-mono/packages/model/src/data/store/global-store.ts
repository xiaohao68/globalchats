import { IGlobalSetting, IUserConfig, makeEmptyGlobalSetting } from "../config";

export interface IGlobalStore {
  userConfigList: {
    [userId: string]: IUserConfig;
  };
  globalSetting: IGlobalSetting;
  currentSignInUserId?: string;
}

export const makeEmptyGlobalStore = (): IGlobalStore => {
  return {
    userConfigList: {},
    globalSetting: makeEmptyGlobalSetting(),
    currentSignInUserId: undefined,
  };
};
