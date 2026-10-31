import {
  EChannelMessageEventType,
  globalSettingManager,
  webviewManger,
} from "@gc/webview";
import { webviewChannel } from "@gc/channel";
import { appStore, globalStore, syncLocalCachedStore, userStore } from "@gc/store";
import { domReady, isMainWebview } from "@gc/utils";
import { initApiClient } from "@gc/api";
import { addTimeSliceTask } from "@gc/misc";
import { assign, isEmpty, isEqual } from "lodash-es";

export const initApp = async () => {
  console.log("initApp runed");

  await domReady();
  initApiClient({
    getUin: () => userStore.userInfo.uin,
    getLang: () => userStore.globalSetting.i18n,
    getAccessToken: () => userStore.userInfo.accessToken,
    onAuthError: () => {
      console.error("API auth error detected, signing out...");
      globalStore.signOut();
    },
  });
  await webviewChannel.mount();
  await syncLocalCachedStore();

  webviewChannel.emitter.on(
    EChannelMessageEventType.requestStoreState,
    ({ senderId }) => {
      webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [senderId],
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
    },
  );

  globalSettingManager.mount();

  webviewChannel.emitter.on(
    EChannelMessageEventType.changeAppUnreadCount,
    ({ senderId, payload }) => {
      const unreadCount = payload.unreadCount;
      const app = appStore.getAppById(senderId);
      app.unreadCount = unreadCount;
      appStore.persistUpdateAppList([app]);
    },
  );
  webviewChannel.emitter.on(
    EChannelMessageEventType.changeAppUserInfo,
    ({ senderId, payload }) => {
      console.log(payload);
      const app = appStore.getAppById(senderId);
      app.userInfo = assign(app.userInfo, payload.userInfo);
      appStore.persistUpdateAppList([app]);
    },
  );
  webviewChannel.emitter.on(
    EChannelMessageEventType.changeAppCurrentChatUser,
    ({ senderId, payload }) => {
      console.log(payload);
      appStore.updateCurrentChatUserByAppId(payload.userInfo, senderId);
    },
  );
  webviewChannel.emitter.on(
    EChannelMessageEventType.changeCurrentApp,
    ({ payload }) => {
      addTimeSliceTask(() => {
        console.log("changeCurrentApp");
        if (isEmpty(payload.app)) {
          appStore.clearCurrentApp();
          return;
        }
        appStore.changeCurrentApp(payload.app);
      });
    },
  );

  webviewChannel.emitter.on(
    EChannelMessageEventType.changeAppChatUserConfig,
    ({ payload }) => {
      if (isEmpty(payload.chatUserConfig)) {
        appStore.removeUserConfig(payload.appId, payload.userId);
      } else {
        appStore.updateUserConfig(payload.appId, payload.userId, payload.chatUserConfig);
      }
    },
  );
  webviewChannel.emitter.on(EChannelMessageEventType.logout, ({ senderId }) => {
    appStore.logout(senderId);
  });

  webviewChannel.emitter.on(
    EChannelMessageEventType.updateSettings,
    ({ payload }) => {
      const { appId, globalSetting, thirdAppConfig } = payload;

      if (globalSetting) {
        const oldGS = globalStore.globalSetting;
        const proxyChanged = !isEqual(globalSetting.proxy, oldGS.proxy);
        const fingerprintChanged = !isEqual(globalSetting.fingerprint, oldGS.fingerprint);

        userStore.updateGlobalSetting(globalSetting);

        if (isMainWebview()) {
          webviewChannel.sendMessage(
            webviewChannel.createMessage({
              receiverIds: ["*"],
              type: EChannelMessageEventType.updateSettings,
              payload: { globalSetting: globalStore.globalSetting },
            }),
          );

          if (proxyChanged) {
            webviewManger.reloadAll((appConfig) => !appConfig.proxy.isIndependent);
          }
          if (fingerprintChanged) {
            webviewManger.reloadAll((appConfig) => !appConfig.fingerprint.isIndependent);
          }
        }
      }

      if (appId && thirdAppConfig) {
        userStore.updateThirdAppList([thirdAppConfig]);
        if (isMainWebview()) {
          webviewManger.reload(appId);
        }
      }
    },
  );
};

export const initThirdApp = async () => {
  await domReady();

  initApiClient({
    getUin: () => userStore.userInfo.uin,
    getLang: () => userStore.globalSetting.i18n,
    getAccessToken: () => userStore.userInfo.accessToken,
    onAuthError: () => {
      // ⭐ 2026-10-21：后端（gc-main）早已废弃，signOut() 内部是
      // history.pushState("/signIn") —— 在内嵌平台网页里会把
      // www.linkedin.com/messaging 改写成 www.linkedin.com/signIn（404 页），
      // 消息列表 DOM 消失 ⇒ 监听与补扫全部失效。故不再登出、不再跳转。
      console.warn("API auth error detected in third app（已忽略，不登出、不跳转）");
    },
  });

  await webviewChannel.mount();
  await syncLocalCachedStore();
  globalSettingManager.mount();
  fixThirdAppLayout();
};

export const fixThirdAppLayout = () => {
  // document.body.style.borderRadius = "16px";
  // document.body.style.overflow = "hidden";
  // document.body.style.position = "relative";
  // document.documentElement.style.borderRadius = "16px";
  // document.documentElement.style.overflow = "hidden";
  // document.body.style.position = "relative";
};

