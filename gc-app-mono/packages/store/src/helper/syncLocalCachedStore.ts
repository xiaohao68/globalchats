import { domReady, isMainWebview } from "@gc/utils";
import { persistGlobalStorage, settingStorage } from "./persistStorage.ts";
import { StorageValue } from "zustand/middleware";
import {
  ERouterPath,
  IGlobalStore,
  MainWebviewId,
  makeEmptyGlobalStore,
  SideWebviewId,
} from "@gc/model";
import { isEmpty } from "lodash-es";
import { userStore } from "../userStore.ts";
import { appStore } from "../appStore.ts";
import { getAppListFromUserStore } from "./getAppListFromUserStore.ts";
import { globalStore } from "../globalStore.ts";
import {
  ChannelMessage,
  EChannelMessageEventType,
  webviewChannel,
} from "@gc/channel";
import { migrateStore } from "./migrate.ts";
import { navigateTo } from "@gc/misc";
import { getCachedUserStore } from "./getCachedUserStore.ts";

export const getLocalCachedStore = async (): Promise<IGlobalStore> => {
  const defaultGlobalStoreState = makeEmptyGlobalStore();

  await domReady();
  // 主页从本地获取
  if (isMainWebview()) {
    await persistGlobalStorage.mount();
    let hasStoredData = await settingStorage?.has("globalStore");
    if (hasStoredData) {
      const rawData =
        await settingStorage?.get<StorageValue<IGlobalStore>>("globalStore");

      if (!isEmpty(rawData)) {
        const state = rawData.state!;
        const version = rawData.version!;
        return migrateStore(state, version);
      }
    }

    return defaultGlobalStoreState;
  }

  // 非主页从 主页请求获取
  return await requestGLobalStoreFormMainStore();
};

let pendingRequest: Promise<IGlobalStore> | null = null;

const MAX_RETRY_COUNT = 15; // 最多重试 15 次（30 秒）

export const requestGLobalStoreFormMainStore = async () => {
  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = new Promise<IGlobalStore>((resolve, reject) => {
    let retryCount = 0;

    const requestGlobalStore = () => {
      retryCount++;
      if (retryCount > MAX_RETRY_COUNT) {
        cleanup();
        reject(new Error("requestGLobalStoreFormMainStore: 超时，主窗口未响应"));
        return;
      }
      webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [MainWebviewId],
          type: EChannelMessageEventType.requestStoreState,
          payload: {},
        }),
      );
    };

    const interval = setInterval(requestGlobalStore, 2000);

    const cleanup = () => {
      clearInterval(interval);
      webviewChannel.emitter.off(
        EChannelMessageEventType.sendStoreState,
        handleStoreState,
      );
      pendingRequest = null;
    };

    const handleStoreState = ({
      payload,
    }: ChannelMessage<EChannelMessageEventType.sendStoreState>) => {
      cleanup();
      resolve(payload.globalStore);
    };

    webviewChannel.emitter.on(
      EChannelMessageEventType.sendStoreState,
      handleStoreState,
    );

    requestGlobalStore();
  });

  return pendingRequest;
};

let isSyncing = false;

export const syncLocalCachedStore = async () => {
  // 防止重复同步
  if (isSyncing) {
    return;
  }
  isSyncing = true;

  try {
    let cachedGLobalStore: IGlobalStore;
    try {
      cachedGLobalStore = await getLocalCachedStore();
    } catch (e) {
      console.warn("syncLocalCachedStore: 获取缓存失败，使用默认值", e);
      cachedGLobalStore = makeEmptyGlobalStore();
    }
    console.log("syncLocalCachedStore cachedGLobalStore", cachedGLobalStore);

    // 检查缓存的 token 是否为旧的 im_access 类型，如果是则强制登出
    if (isMainWebview() && cachedGLobalStore.currentSignInUserId) {
      const userConfig = cachedGLobalStore.userConfigList[cachedGLobalStore.currentSignInUserId];
      const token = userConfig?.userInfo?.accessToken;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]!));
          if (payload.type === "im_access") {
            console.warn("[syncLocalCachedStore] Detected im_access token, clearing sign-in state for migration");
            cachedGLobalStore.currentSignInUserId = undefined;
          }
        } catch {}
      }
    }

    globalStore.updateGlobalStore({
      userConfigList: cachedGLobalStore.userConfigList,
      globalSetting: cachedGLobalStore.globalSetting,
      currentSignInUserId: cachedGLobalStore.currentSignInUserId,
    });

    userStore.setUserStore(getCachedUserStore());
    appStore.setAppStore(getAppListFromUserStore());

    // console.log("userStore");
    // console.log(userStore);
    // console.log("appStore");
    // console.log(appStore);
    if (isMainWebview()) {
      await webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [SideWebviewId],
          type: EChannelMessageEventType.sendStoreState,
          payload: {
            globalStore: {
              userConfigList: globalStore.userConfigList,
              globalSetting: globalStore.globalSetting,
              currentSignInUserId: globalStore.currentSignInUserId,
            },
          },
        }),
      );
    }

    if (!globalStore.isSignEd()) {
      // ⭐⭐ 同上（2026-10-21 血案）：只允许主窗口跳转。
      // 在平台 WebView（内嵌 LinkedIn / Facebook …）里执行 navigateTo("/signIn")
      // 会把页面 URL 改成 <平台域名>/signIn，平台 SPA 直接渲染 404，
      // 消息列表再也不渲染 ⇒ 监听 / 补扫全部失效。
      if (isMainWebview()) {
        navigateTo(ERouterPath.signIn);
      }
    }
  } finally {
    isSyncing = false;
  }
};
