import { ipcTauri } from "./ipcTauri.ts";
import {
  AGGREGATED_CHAT_APP_ID,
  AGGREGATED_CHAT_URL_DEV,
  EAppStatus,
  ELoadingStatus,
  EPlatform,
  IThirdAppConfig,
  IWebviewOptions,
  makeDefaultThirdAppLayout,
  PlatformLoadingDuration,
  SideWebviewId,
} from "@gc/model";
import { appStore, makeWebviewOptionsByAppConfig, userStore } from "@gc/store";
import { forEach, isEmpty, map } from "lodash-es";
import { EChannelMessageEventType, webviewChannel } from "./webviewChannel.ts";
import {
  isMainWebview,
  Nullable,
  sleep,
} from "@gc/utils";
import { sideWebviewManager } from "./sideWebviewManager.ts";
import { navigateTo } from "@gc/misc";

export class WebviewManger {
  private lastActiveAppId: string | null = null;

  constructor() {
    if (isMainWebview()) {
      webviewChannel.emitter.on<EChannelMessageEventType.loadingProgress>(
        EChannelMessageEventType.loadingProgress,
        async (message) => {
          const currentAppId = appStore.currentAppId;
          const appId = message.senderId;
          // 注意：新版三栏界面（Dashboard）自建的平台 WebView（如 platform-telegram）
          // 不会注册进 appStore。这里若直接用 getAppById，会抛 "appId not found"，
          // 产生大量 unhandled rejection。所以只处理 appStore 里存在的 app，
          // 其余的加载状态由对应组件自己监听 WebviewChannel 事件处理。
          const app = appStore.appList[appId];
          if (isEmpty(app)) {
            return;
          }
          app.loadingStatus = message.payload.status;
          appStore.updateAppList([app]);
          if (message.payload.status === ELoadingStatus.finished) {
            if (currentAppId === appId) {
              await sleep(PlatformLoadingDuration);
              await this.show(appId);
            }
            app.loadingStatus = ELoadingStatus.none;
            appStore.updateAppList([app]);
          }
        },
      );
    }

    console.log("WebviewManger constructor");
    webviewChannel.emitter.on(
      EChannelMessageEventType.navigate,
      ({ payload }) => {
        console.log("收到信息");
        navigateTo(payload.path);
      },
    );
  }

  async create(
    platform: EPlatform,
    url: string = "",
    initialConfig?: Partial<Pick<IThirdAppConfig, "proxy" | "fingerprint">>,
  ): Promise<Nullable<IThirdAppConfig>> {
    await this.hidePrevious();
    const app = appStore.createApp(platform, url);
    app.loadingStatus = ELoadingStatus.init;
    const appConfig = userStore.getThirdAppConfigById(app.id)!;

    if (initialConfig?.proxy) {
      appConfig.proxy = initialConfig.proxy;
    }
    if (initialConfig?.fingerprint) {
      appConfig.fingerprint = initialConfig.fingerprint;
    }
    if (initialConfig) {
      userStore.updateThirdAppList([appConfig]);
    }

    await ipcTauri.invoke("create_webview", {
      options: makeWebviewOptionsByAppConfig(appConfig),
    });
    appStore.changeCurrentApp(app);

    await webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [SideWebviewId],
        type: EChannelMessageEventType.refreshStoreState,
        payload: {},
      }),
    );
    await webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [SideWebviewId],
        type: EChannelMessageEventType.changeCurrentApp,
        payload: {
          app: app,
        },
      }),
    );
    return appConfig;
  }

  async remove(appId: string) {
    appStore.removeApp(appId);
    await ipcTauri.invoke("remove_webview", {
      webviewId: appId,
    });
  }

  async update(webviewOptions: IWebviewOptions) {
    if (isEmpty(webviewOptions)) {
      return;
    }
    await ipcTauri.invoke("update_webview", {
      options: webviewOptions,
    });
  }

  async reload(appId: string) {
    if (isEmpty(appId)) {
      return;
    }
    const appConfig = userStore.getThirdAppConfigById(appId)!;
    const app = appStore.getAppById(appId)!;
    app.loadingStatus = ELoadingStatus.none;
    try {
      await ipcTauri.invoke("reload_webview", {
        options: makeWebviewOptionsByAppConfig(appConfig),
      });
    } catch (error) {
      console.error("reload error", error);
    }
  }

  async reloadAll(
    shouldUpdate: (appConfig: IThirdAppConfig) => boolean = () => true,
  ) {
    const thirdAppConfigList = userStore.thirdAppConfigList;
    forEach(thirdAppConfigList, (appConfig) => {
      const appState = appStore.getAppById(appConfig.id);
      if (
        appState.status === EAppStatus.closed ||
        appState.status === EAppStatus.disabled
      ) {
        return;
      }
      if (shouldUpdate(appConfig)) {
        this.reload(appConfig.id);
      }
    });
  }

  async open(appId: string) {
    if (isEmpty(appId)) {
      return;
    }
    const appConfig = userStore.getThirdAppConfigById(appId)!;
    const app = appStore.getAppById(appId)!;
    if (app.status === EAppStatus.closed) {
      app.loadingStatus = ELoadingStatus.init;
    }
    app.status = EAppStatus.show;
    app.isSelect = true;
    app.isOnline = true;

    ipcTauri.invoke("open_webview", {
      options: makeWebviewOptionsByAppConfig(appConfig),
    });
    await this.hidePrevious(appId);
    // console.log(app);
    appStore.changeCurrentApp(app);
    webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [SideWebviewId],
        type: EChannelMessageEventType.changeCurrentApp,
        payload: {
          app: app,
        },
      }),
    );
  }

  async hidePrevious(currentAppId?: string) {
    console.log("hidePrevious");
    const previousAppId = appStore.currentAppId;
    if (isEmpty(currentAppId) && isEmpty(previousAppId)) {
      return;
    }
    if (currentAppId === previousAppId) {
      return;
    }
    if (isEmpty(previousAppId)) {
      return;
    }

    await this.hide(previousAppId!);
  }

  async show(appId: string) {
    if (isEmpty(appId)) {
      return;
    }
    const app = appStore.getAppById(appId)!;
    app.status = EAppStatus.show;
    appStore.updateAppList([app]);
    await ipcTauri.invoke("show_webview", {
      webviewId: appId,
    });
  }

  async hide(appId: string) {
    console.log(appId);
    if (isEmpty(appId)) {
      return;
    }
    const app = appStore.getAppById(appId)!;
    app.status = EAppStatus.hide;
    app.isSelect = false;
    appStore.updateAppList([app]);
    await ipcTauri.invoke("hide_webview", {
      webviewId: appId,
    });
  }

  async close(appId: string) {
    if (isEmpty(appId)) {
      return;
    }
    const app = appStore.getAppById(appId)!;
    app.status = EAppStatus.closed;
    app.loadingStatus = ELoadingStatus.none;
    app.isSelect = false;
    app.isOnline = false;
    appStore.updateAppList([app]);
    await ipcTauri.invoke("close_webview", {
      webviewId: appId,
    });

    if (appId === appStore.currentAppId) {
      appStore.clearCurrentApp();
      webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [SideWebviewId],
          type: EChannelMessageEventType.changeCurrentApp,
          payload: { app: undefined },
        }),
      );
    }
  }

  async closeAll() {
    appStore.clearCurrentApp();

    const appList = map(appStore.appList, (app) => {
      app.status = EAppStatus.closed;
      app.loadingStatus = ELoadingStatus.none;
      app.isSelect = false;
      app.isOnline = false;
      app.unreadCount = 0;
      app.currentChatUser = undefined;
      ipcTauri.invoke("close_webview", {
        webviewId: app.id,
      });
      return app;
    });

    sideWebviewManager.hideSideWebview();
    appStore.updateAppList(appList);
  }

  async hideAll() {
    appStore.clearCurrentApp();
    const appList = map(appStore.appList, (app) => {
      app.status = EAppStatus.hide;
      app.isSelect = false;
      ipcTauri.invoke("hide_webview", {
        webviewId: app.id,
      });
      return app;
    });

    sideWebviewManager.hideSideWebview();
    appStore.updateAppList(appList);
  }

  //-------------------------------------------------------------------------------------
  // emitter
  //-------------------------------------------------------------------------------------

  //-------------------------------------------------------------------------------------
  // Aggregated Chat WebView
  //-------------------------------------------------------------------------------------

  async openAggregatedChat(): Promise<void> {
    const existingApp = appStore.appList[AGGREGATED_CHAT_APP_ID];

    if (existingApp && existingApp.status !== EAppStatus.closed) {
      await this.hidePrevious(AGGREGATED_CHAT_APP_ID);
      existingApp.status = EAppStatus.show;
      existingApp.isSelect = true;
      appStore.updateAppList([existingApp]);
      appStore.changeCurrentApp(existingApp);
      await ipcTauri.invoke("show_webview", {
        webviewId: AGGREGATED_CHAT_APP_ID,
      });
      return;
    }

    await this.createAggregatedChat();
  }

  private async createAggregatedChat(): Promise<void> {
    await this.hidePrevious(AGGREGATED_CHAT_APP_ID);

    const appState = appStore.createAggregatedChatApp();
    appState.loadingStatus = ELoadingStatus.init;

    const options: IWebviewOptions = {
      id: AGGREGATED_CHAT_APP_ID,
      url: AGGREGATED_CHAT_URL_DEV,
      platform: EPlatform.Aggregated,
      layout: makeDefaultThirdAppLayout(),
      active: true,
      visible: false,
    };

    await ipcTauri.invoke("create_webview", { options });
    appStore.changeCurrentApp(appState);

    await webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [SideWebviewId],
        type: EChannelMessageEventType.changeCurrentApp,
        payload: { app: appState },
      }),
    );
  }

  async hideAllMultiProxyWebviews(): Promise<void> {
    const apps = Object.values(appStore.appList);
    const visibleApps = apps.filter(
      (app) =>
        app.status === EAppStatus.show && app.id !== AGGREGATED_CHAT_APP_ID,
    );

    this.lastActiveAppId = appStore.currentAppId || null;

    for (const app of visibleApps) {
      await this.hide(app.id);
    }
  }

  async showLastActiveWebview(): Promise<void> {
    if (this.lastActiveAppId) {
      const app = appStore.getAppById(this.lastActiveAppId);
      if (app && app.status !== EAppStatus.closed) {
        await this.show(this.lastActiveAppId);
        appStore.changeCurrentApp(app);
      }
    }
  }

  async hideCurrentWebview(): Promise<void> {
    const currentAppId = appStore.currentAppId;
    if (currentAppId) {
      this.lastActiveAppId = currentAppId;
      await this.hide(currentAppId);
    }
  }
}

export const webviewManger = new WebviewManger();
