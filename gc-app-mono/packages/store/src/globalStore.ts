import {
  appVersionNumber,
  ERouterPath,
  IGlobalSetting,
  IGlobalStore,
  IUser,
  IUserConfig,
  MainWebviewId,
  makeEmptyGlobalStore,
  makeEmptyUserConfig,
} from "@gc/model";
import { createWithEqualityFn } from "zustand/traditional";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAppListFromUserStore, persistGlobalStorage } from "./helper";
import { assign, clone, isEmpty } from "lodash-es";
import { userStore } from "./userStore.ts";
import { appStore } from "./appStore.ts";
import { isMainWebview, isSideWebview, Nullable } from "@gc/utils";
import { shallow } from "zustand/vanilla/shallow";
import {
  EChannelMessageEventType,
  webviewChannel,
} from "@gc/channel";
import { navigateTo } from "@gc/misc";

//-------------------------------------------------------------------------------------
// persist cache
//-------------------------------------------------------------------------------------
interface Store extends IGlobalStore {
  // state

  // action
  updateGlobalStore: (globalStore: Partial<IGlobalStore>) => void;
  getCurrentSignInUserConfig: () => Nullable<IUserConfig>;
  updateCurrentSignInUserId: (userId?: string) => void;

  updateUserConfigList: (userConfigList: IUserConfig[]) => void;
  updateGlobalSetting: (setting: Partial<IGlobalSetting>) => void;
  signIn: (user: IUser) => void;
  signOut: () => void;
  isSignEd: () => boolean;
}

const emptyGlobalStoreState = makeEmptyGlobalStore();
const noopPersistStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const useGlobalStore = createWithEqualityFn(
  persist<Store>(
    (setState, getState, _store) => {
      return {
        ...emptyGlobalStoreState,

        updateGlobalStore: (globalStore) => {
          setState({ ...globalStore });
        },
        getCurrentSignInUserConfig: () => {
          const userId = getState().currentSignInUserId;
          if (!userId) {
            return;
          }
          return getState().userConfigList[userId];
        },

        updateCurrentSignInUserId: (userId) => {
          setState({
            currentSignInUserId: userId,
          });
        },

        updateUserConfigList: (userConfigList) => {
          // console.log("userConfigList")
          // console.log(userConfigList)
          const cachedUserConfigList = getState().userConfigList;
          if (isEmpty(userConfigList)) {
            return;
          }
          userConfigList.forEach((it) => {
            cachedUserConfigList[it.userInfo.id] = it;
          });
          setState({
            userConfigList: clone(cachedUserConfigList),
          });
        },

        updateGlobalSetting(partialGlobalSetting) {
          if (isEmpty(partialGlobalSetting)) {
            return;
          }
          const globalSetting = assign(
            getState().globalSetting,
            partialGlobalSetting,
          );

          userStore.updateGlobalSetting(partialGlobalSetting);
          setState({
            globalSetting: clone(globalSetting),
          });
        },

        signIn: (user) => {
          const globalSetting = getState().globalSetting;
          console.log("signIn globalSetting", globalSetting);
          // const userConfigList = getState().userConfigList;
          let currentSignInUserConfig = getState().userConfigList[user.id];
          if (isEmpty(currentSignInUserConfig)) {
            currentSignInUserConfig = makeEmptyUserConfig();
            // currentSignInUserConfig.globalSetting = globalSetting;
          }
          currentSignInUserConfig.userInfo = user;

          currentSignInUserConfig.globalSetting = globalSetting;

          getState().updateUserConfigList([currentSignInUserConfig]);
          getState().updateCurrentSignInUserId(user.id);

          userStore.setUserStore(currentSignInUserConfig);
          appStore.setAppStore(getAppListFromUserStore());
        },
        signOut: () => {
          setState({
            currentSignInUserId: undefined,
          });

          // ⭐⭐ 2026-10-21 血案：这里绝不能在任何"内嵌平台网页"里跳转。
          // signOut() 内部是 `history.pushState(null, "", "/signIn")`，
          // 在平台 WebView 里执行 = 把 https://www.linkedin.com/messaging
          // 改写成 https://www.linkedin.com/signIn（LinkedIn 这个路径不存在）
          // → SPA 立刻渲染「此页面不存在」404 页
          // → 消息列表 DOM 永远不存在 → 一条消息都监听不到，连补扫都没得补。
          // 业务员新机器 currentSignInUserId 必定为空 ⇒ 每次 mount 都会走到这里，
          // 而开发机上残留了旧登录态所以看不出问题（这就是"我这能跑、他那不行"的真正原因）。
          // 登录功能已整体移除，这里只保留主窗口（本软件界面）的兜底跳转。
          if (isSideWebview()) {
            webviewChannel.sendMessage(
              webviewChannel.createMessage({
                receiverIds: [MainWebviewId],
                type: EChannelMessageEventType.navigate,
                payload: {
                  path: ERouterPath.signIn,
                },
              }),
            );

            return;
          }

          if (isMainWebview()) {
            navigateTo(ERouterPath.signIn);
          }
        },
        isSignEd: () => {
          return !isEmpty(getState().currentSignInUserId);
        },
      };
    },
    {
      name: "globalStore",
      version: appVersionNumber, // 取版本号前2位并转换为数字：如 "1.2.5" → 1.2
      storage: createJSONStorage(() => {
        try {
          return isMainWebview() ? persistGlobalStorage : noopPersistStorage;
        } catch {
          return noopPersistStorage;
        }
      }),
      skipHydration: true,
    },
  ),
  shallow,
);

export const globalStore = new Proxy<Store>({} as Store, {
  get(_target, propKey, receiver) {
    return Reflect.get(useGlobalStore.getState(), propKey, receiver);
  },
});
