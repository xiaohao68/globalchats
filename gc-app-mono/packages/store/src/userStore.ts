import {
  AppState,
  EPlatform,
  IFingerprintConfig,
  IGlobalSetting,
  IProxyConfig,
  IThirdAppConfig,
  IUserConfig,
  makeEmptyUserConfig,
} from "@gc/model";
import { assign, clone, filter, isEmpty } from "lodash-es";
import { globalStore } from "./globalStore.ts";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/vanilla/shallow";

//-------------------------------------------------------------------------------------
// persist cache
//-------------------------------------------------------------------------------------
interface Store extends IUserConfig {
  // state

  //-------------------------------------------------------------------------------------
  // user
  //-------------------------------------------------------------------------------------

  //-------------------------------------------------------------------------------------
  // thirdAppConfig
  //-------------------------------------------------------------------------------------
  setUserStore: (userConfig: IUserConfig) => void;
  updateGlobalSetting: (setting: Partial<IGlobalSetting>) => void;
  getThirdAppConfigListSize: () => number;
  getThirdAppConfigListByPlatform: (platform: EPlatform) => IThirdAppConfig[];
  getThirdAppConfigById: (appId: string) => IThirdAppConfig;
  createThirdApp: (appConfig: IThirdAppConfig) => void;
  removeThirdApp: (appId: string) => void;
  updateThirdAppList: (appConfigList: IThirdAppConfig[]) => void;
  updateThirdAppListFromAppStateList: (appList: AppState[]) => void;

  // getCurrentChatUserTranslateConfigByAppId
  getValidThirdAppProxyConfigById: (
    appId: string,
    isIndependent?: boolean,
  ) => IProxyConfig;

  getValidThirdAppFingerprintConfigById: (appId: string) => IFingerprintConfig;

  //-------------------------------------------------------------------------------------
  //
  //-------------------------------------------------------------------------------------
  syncPersistCache: () => void;
}

export const useUserStore = createWithEqualityFn<Store>(
  (setState, getState, _store) => {
    return {
      // state
      ...makeEmptyUserConfig(),

      //-------------------------------------------------------------------------------------
      // thirdAppConfig
      //-------------------------------------------------------------------------------------
      setUserStore: (userConfig) => {
        console.log("userConfig");
        console.log(userConfig);
        setState({
          ...userConfig,
        });
      },
      updateGlobalSetting: (partialGlobalSetting) => {
        if (isEmpty(partialGlobalSetting)) {
          return;
        }
        const globalSetting = assign(
          getState().globalSetting,
          partialGlobalSetting,
        );
        setState({
          globalSetting: clone(globalSetting),
        });
        getState().syncPersistCache();
      },
      getThirdAppConfigListSize: () => {
        const thirdAppConfigList = getState().thirdAppConfigList;
        return Object.keys(thirdAppConfigList).length;
      },
      getThirdAppConfigListByPlatform: (platform: EPlatform) => {
        const thirdAppConfigList = getState().thirdAppConfigList;
        return filter(
          thirdAppConfigList,
          (it) => it.platform === platform,
        ).sort((a, b) => a.index - b.index);
      },

      getThirdAppConfigById: (appId) => {
        const thirdAppConfigList = getState().thirdAppConfigList;
        return thirdAppConfigList[appId]!;
      },

      createThirdApp: (appConfig) => {
        const thirdAppConfigList = getState().thirdAppConfigList;
        thirdAppConfigList[appConfig.id] = appConfig;
        setState({
          thirdAppConfigList: clone(thirdAppConfigList),
        });

        getState().syncPersistCache();
      },

      removeThirdApp: (appId) => {
        const thirdAppConfigList = getState().thirdAppConfigList;
        delete thirdAppConfigList[appId];
        setState({
          thirdAppConfigList: clone(thirdAppConfigList),
        });

        getState().syncPersistCache();
      },
      updateThirdAppList: (appConfigList) => {
        const thirdAppConfigList = getState().thirdAppConfigList;
        appConfigList.forEach((appConfig) => {
          thirdAppConfigList[appConfig.id] = appConfig;
        });
        setState({
          thirdAppConfigList: clone(thirdAppConfigList),
        });
        getState().syncPersistCache();
      },
      updateThirdAppListFromAppStateList: (appStateList: AppState[]) => {
        const thirdAppConfigList = getState().thirdAppConfigList;
        appStateList.forEach((app) => {
          thirdAppConfigList[app.id]!.index = app.index;
          thirdAppConfigList[app.id]!.userInfo = app.userInfo;
        });
        setState({
          thirdAppConfigList: clone(thirdAppConfigList),
        });
        getState().syncPersistCache();
      },

      getValidThirdAppProxyConfigById: (appId: string, isIndependent) => {
        const appConfig = getState().getThirdAppConfigById(appId);
        const globalSetting = getState().globalSetting;
        if (isIndependent === undefined) {
          isIndependent = appConfig.proxy.isIndependent;
        }
        // console.log(isIndependent,appConfig,globalSetting)
        if (isIndependent) {
          return appConfig.proxy;
        }
        return {
          ...globalSetting.proxy,
          isIndependent: appConfig.proxy.isIndependent,
        };
      },

      getValidThirdAppFingerprintConfigById: (appId: string) => {
        const appConfig = getState().getThirdAppConfigById(appId);
        const globalSetting = getState().globalSetting;
        if (appConfig.fingerprint.isIndependent) {
          return appConfig.fingerprint;
        }
        return {
          ...globalSetting.fingerprint,
          isIndependent: appConfig.fingerprint.isIndependent,
        };
      },
      //-------------------------------------------------------------------------------------
      // persist
      //-------------------------------------------------------------------------------------
      syncPersistCache: () => {
        const currentSignInUserConfig =
          globalStore.getCurrentSignInUserConfig();
        // console.log("currentSignInUserConfig");
        // console.log(currentSignInUserConfig);
        if (!currentSignInUserConfig) {
          return;
        }
        currentSignInUserConfig.userInfo = getState().userInfo;
        currentSignInUserConfig.globalSetting = getState().globalSetting;
        currentSignInUserConfig.thirdAppConfigList =
          getState().thirdAppConfigList;

        globalStore.updateUserConfigList([currentSignInUserConfig]);
        // globalStore.updateGlobalSetting(getState().globalSetting);
      },
    };
  },
  shallow,
);

export const userStore = new Proxy<Store>({} as Store, {
  get(_target, propKey, receiver) {
    return Reflect.get(useUserStore.getState(), propKey, receiver);
  },
});
