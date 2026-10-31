import {
  AGGREGATED_CHAT_APP_ID,
  AppState,
  EAppMode,
  EAppStatus,
  ELoadingStatus,
  EPlatform,
  ERightSidebarPanel,
  ERouterPath,
  IChatUserConfig,
  IThirdAppConfig,
  IThirdAppUserInfo,
  ITranslateConfig,
  MainWebviewId,
  makeDefaultAppState,
  serializeThirdAppConfig,
} from "@gc/model";
import { clone, filter, isEmpty, reduce, sortBy } from "lodash-es";
import { userStore } from "./userStore.ts";
import { getAppListFromUserStore } from "./helper";
import {
  getCurrentWebviewId,
  isMainWebview,
  isThirdApp,
  Nullable,
} from "@gc/utils";
import { EChannelMessageEventType, webviewChannel } from "@gc/channel";
import { createWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/vanilla/shallow";

//-------------------------------------------------------------------------------------
// webview label → appStore key 的容忍解析
//-------------------------------------------------------------------------------------
/**
 * 新版三栏界面（Dashboard）自建的平台 WebView 用 `platform-<name>` 命名
 * （如 `platform-linkedin`），而上游代码（gc-engine / 各平台 SDK）一律假设
 * 「webview id === appId」。于是 `appStore.getAppById("platform-linkedin")`
 * 会抛 `appId not found` —— 这个异常会让 `Linkedin.mount()` 在 `super.mount()`
 * 处直接中断，连消息监听都挂不上，而且只在页面的 unhandledrejection 里出现，
 * 极难排查。
 *
 * 这里加一层容忍：精确命中优先；未命中再按「去掉 platform- 前缀 + 忽略大小写与
 * 分隔符」用平台名匹配（`platform-linkedin` → `linkedin` ↔ `EPlatform.Linkedin`）。
 */
const normalizeAppKey = (value: unknown) =>
  String(value ?? "")
    .replace(/^platform-/, "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();

const resolveAppKey = (
  appList: Record<string, AppState>,
  appId?: string,
): string | undefined => {
  if (!appId) {
    return undefined;
  }
  if (!isEmpty(appList[appId])) {
    return appId;
  }
  const target = normalizeAppKey(appId);
  if (!target) {
    return undefined;
  }
  return Object.keys(appList).find((key) => {
    const app = appList[key];
    return (
      normalizeAppKey(key) === target ||
      normalizeAppKey(app?.platform) === target
    );
  });
};

//-------------------------------------------------------------------------------------
// runtime cache
//-------------------------------------------------------------------------------------
interface Store {
  //-------------------------------------------------------------------------------------
  // state
  //-------------------------------------------------------------------------------------
  appList: Record<string, AppState>;

  currentAppId?: string;
  currentSideWebviewPath?: ERouterPath;

  appMode: EAppMode;
  rightSidebarPanel: ERightSidebarPanel | null;
  //-------------------------------------------------------------------------------------
  // action
  //-------------------------------------------------------------------------------------
  setAppStore: (appList: Store["appList"]) => void;
  setAppMode: (mode: EAppMode) => void;
  setRightSidebarPanel: (panel: ERightSidebarPanel | null) => void;
  createAggregatedChatApp: () => AppState;
  createApp: (platform: EPlatform, url: string) => AppState;
  removeApp: (appId: string) => void;
  updateAppList: (appList: AppState[]) => void;
  persistUpdateAppList: (appList: AppState[]) => void;
  getCurrentApp: () => Nullable<AppState>;
  changeCurrentApp: (app: AppState) => void;
  clearCurrentApp: () => void;

  getAppListSize: () => number;
  getAppListByPlatform: (platform: EPlatform) => AppState[];
  getAppList: () => AppState[];
  getAppById: (appId: string) => AppState;
  getPlatformUnreadByPlatform: (platform: EPlatform) => number;
  getPlatformById: (appId?: string) => EPlatform;

  //-------------------------------------------------------------------------------------
  // 三方app方便调用的
  //-------------------------------------------------------------------------------------
  getCurrentChatUserByAppId: (appId?: string) => AppState["currentChatUser"];
  updateCurrentChatUserByAppId: (
    user: IThirdAppUserInfo,
    appId?: string,
  ) => void;
  clearCurrentChatUserByAppId: (appId?: string) => void;
  getCurrentChatUserTranslateConfigByAppId: (
    appId?: string,
  ) => Nullable<ITranslateConfig>;
  shouldTranslateReceiveMessage: () => boolean;
  shouldTranslateInputMessage: () => boolean;
  updateUserConfig: (
    appId: string,
    userId: string,
    userConfig: IChatUserConfig,
  ) => void;
  removeUserConfig: (appId: string, userId: string) => void;
  logout: (appId?: string) => void;

  //-------------------------------------------------------------------------------------
  //
  //-------------------------------------------------------------------------------------
  setCurrentSideWebviewPath: (path?: ERouterPath) => void;
}

export const useAppStore = createWithEqualityFn<Store>((setState, getState) => {
  return {
    // state
    appList: getAppListFromUserStore(),
    currentAppId: undefined,
    currentSideWebviewPath: undefined,
    appMode: EAppMode.AggregatedChat,
    rightSidebarPanel: ERightSidebarPanel.CRM,
    //-------------------------------------------------------------------------------------
    // thirdAppConfig
    //-------------------------------------------------------------------------------------
    setAppStore: (appList) => {
      setState({ appList });
    },
    setAppMode: (mode) => {
      setState({ appMode: mode });
    },
    setRightSidebarPanel: (panel) => {
      setState({ rightSidebarPanel: panel });
    },
    createAggregatedChatApp: () => {
      const cachedAppList = getState().appList;
      const appState: AppState = {
        id: AGGREGATED_CHAT_APP_ID,
        platform: EPlatform.Aggregated,
        index: -1,
        status: EAppStatus.loading,
        isSelect: true,
        isOnline: true,
        loadingStatus: ELoadingStatus.none,
        unreadCount: 0,
        chatUserConfigList: {},
      };

      cachedAppList[appState.id] = appState;
      setState({
        appList: clone(cachedAppList),
      });
      return appState;
    },
    createApp: (platform, url) => {
      const appConfig: IThirdAppConfig = serializeThirdAppConfig(platform);
      const app = makeDefaultAppState(appConfig);
      const cachedAppList = getState().appList;

      appConfig.index = getState().getAppListSize() + 1;
      appConfig.webviewOptions.url = url;
      app.index = appConfig.index;
      app.status = EAppStatus.loading;
      app.loadingStatus = ELoadingStatus.none;
      app.isSelect = true;
      app.isOnline = true;

      cachedAppList[app.id] = app;
      setState({
        appList: clone(cachedAppList),
      });
      userStore.createThirdApp(appConfig);
      return app;
    },
    removeApp: (appId: string) => {
      const cachedAppList = getState().appList;
      const currentApp = getState().getCurrentApp();
      if (currentApp?.id === appId) {
        getState().clearCurrentApp();
      }
      delete cachedAppList[appId];
      setState({
        appList: clone(cachedAppList),
      });
      userStore.removeThirdApp(appId);
    },
    updateAppList: (appList: AppState[]) => {
      const cachedAppList = getState().appList;
      appList.forEach((app) => {
        cachedAppList[app.id] = app;
      });
      setState({ appList: clone(cachedAppList) });
    },
    persistUpdateAppList: (appList: AppState[]) => {
      const cachedAppList = getState().appList;
      appList.forEach((app) => {
        cachedAppList[app.id] = app;
      });
      setState({ appList: clone(cachedAppList) });
      userStore.updateThirdAppListFromAppStateList(appList);
    },
    getCurrentApp: () => {
      const currentAppId = getState().currentAppId;
      if (!currentAppId) {
        return;
      }
      return getState().appList[currentAppId];
    },
    changeCurrentApp: (app: AppState) => {
      setState({
        currentAppId: app.id,
      });
    },
    clearCurrentApp: () => {
      setState({
        currentAppId: undefined,
      });
    },
    getAppListSize: () => {
      const cachedAppList = getState().appList;
      return Object.keys(cachedAppList).length;
    },

    getAppListByPlatform: (platform) => {
      const appList = getState().appList;
      return filter(appList, (it) => it.platform === platform).sort(
        (a, b) => a.index - b.index,
      );
    },

    getAppList: () => {
      const appList = getState().appList;
      return sortBy(
        filter(appList, (it) => it.platform !== EPlatform.Aggregated),
        (it) => it.index,
      );
    },
    getAppById: (appId: string) => {
      const appList = getState().appList;
      const key = resolveAppKey(appList, appId);
      const app = key ? appList[key] : undefined;
      if (isEmpty(app)) {
        throw new Error(`appId not found: ${appId}`);
      }
      return app;
    },
    getPlatformUnreadByPlatform: (platform) => {
      return reduce(
        getState().appList,
        (acc, appState) => {
          if (platform === appState.platform) {
            acc += appState.unreadCount;
            return acc;
          }
          return acc;
        },
        0,
      );
    },
    getPlatformById: (appId = getCurrentWebviewId()) => {
      const appList = getState().appList;
      const key = resolveAppKey(appList, appId);
      const app = key ? appList[key] : undefined;
      if (isEmpty(app)) {
        throw new Error(`appId not found: ${appId}`);
      }
      return app.platform;
    },
    //-------------------------------------------------------------------------------------
    // 方便第三方app调用的
    //-------------------------------------------------------------------------------------
    getCurrentChatUserByAppId: (appId = getCurrentWebviewId()) => {
      const appList = getState().appList;
      const key = resolveAppKey(appList, appId);
      const app = key ? appList[key] : undefined;

      if (isEmpty(app)) {
        return;
      }
      return app.currentChatUser;
    },
    updateCurrentChatUserByAppId: (user, appId = getCurrentWebviewId()) => {
      const appList = getState().appList;
      const key = resolveAppKey(appList, appId);
      const app = key ? appList[key] : undefined;
      if (isEmpty(app)) {
        return;
      }
      app.currentChatUser = user;
      getState().updateAppList([app]);
    },
    clearCurrentChatUserByAppId: (appId = getCurrentWebviewId()) => {
      const appList = getState().appList;
      const key = resolveAppKey(appList, appId);
      const app = key ? appList[key] : undefined;
      if (isEmpty(app)) {
        return;
      }
      app.currentChatUser = undefined;
      getState().updateAppList([app]);
    },
    getCurrentChatUserTranslateConfigByAppId: (
      appId = getCurrentWebviewId(),
    ) => {
      const chatUser = getState().getCurrentChatUserByAppId(appId);
      const appList = getState().appList;
      const key = resolveAppKey(appList, appId);
      const app = key ? appList[key] : undefined;
      const globalTranslateConfig = userStore.globalSetting.translate!;

      if (!chatUser || !app) {
        return;
      }

      const userConfig = app.chatUserConfigList[chatUser.id];
      if (!userConfig || !userConfig.translate) {
        return globalTranslateConfig;
      }

      const translateConfig = userConfig.translate;
      if (translateConfig.isIndependent) {
        return translateConfig;
      }
      return globalTranslateConfig;
    },

    shouldTranslateReceiveMessage: () => {
      const translateConfig =
        getState().getCurrentChatUserTranslateConfigByAppId();

      if (!translateConfig) {
        return false;
      }
      return translateConfig.receiveMessage.enable;
    },

    shouldTranslateInputMessage: () => {
      const translateConfig =
        getState().getCurrentChatUserTranslateConfigByAppId();
      if (!translateConfig) {
        return false;
      }
      return translateConfig.sendMessage.enable;
    },

    updateUserConfig: (appId, userId, userConfig) => {
      const app = getState().appList[appId]!;
      app.chatUserConfigList[userId] = userConfig;

      getState().persistUpdateAppList([app]);
    },
    removeUserConfig: (appId, userId) => {
      const app = getState().appList[appId]!;
      delete app.chatUserConfigList[userId];
      getState().persistUpdateAppList([app]);
    },

    logout: (appId = getCurrentWebviewId()) => {
      const appList = getState().appList;
      const key = resolveAppKey(appList, appId);
      const app = key ? appList[key] : undefined;
      const updateAppList = getState().updateAppList;
      if (isEmpty(app)) {
        return;
      }
      app.unreadCount = 0;
      app.userInfo = undefined;
      app.currentChatUser = undefined;

      updateAppList([app]);
      if (isThirdApp()) {
        webviewChannel.sendMessage(
          webviewChannel.createMessage({
            receiverIds: [MainWebviewId],
            type: EChannelMessageEventType.logout,
            payload: {},
          }),
        );
      }

      if (isMainWebview()) {
        getState().persistUpdateAppList([app]);
      }
    },
    setCurrentSideWebviewPath: (path) => {
      setState({
        currentSideWebviewPath: path,
      });
    },
  };
}, shallow);

export const appStore = new Proxy<Store>({} as Store, {
  get(_target, propKey, receiver) {
    return Reflect.get(useAppStore.getState(), propKey, receiver);
  },
});
