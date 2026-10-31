import { ipcTauri } from "./ipcTauri.ts";
import { ERouterPath, SideWebviewId } from "@gc/model";
import { EChannelMessageEventType, webviewChannel } from "./webviewChannel.ts";
import { isSideWebview } from "@gc/utils";
import { addTimeSliceTask, navigateTo } from "@gc/misc";
import { appStore, syncLocalCachedStore } from "@gc/store";

class SideWebviewManger {
  constructor() {
    if (!isSideWebview()) {
      return;
    }

    navigateTo(ERouterPath.rightSideView);

    webviewChannel.emitter.on(
      EChannelMessageEventType.navigate,
      ({ payload }) => {
        addTimeSliceTask(() => {
          console.log("navigate run");
          navigateTo(payload.path);
        });
      },
    );

    webviewChannel.emitter.on(
      EChannelMessageEventType.refreshStoreState,
      () => {
        console.log("refreshStoreState");

        addTimeSliceTask(syncLocalCachedStore);
      },
    );
  }

  async closeSideWebview() {
    // await ipcTauri.invoke("close_side_webview");
  }

  async openSideWebview(path: ERouterPath) {
    if (appStore.currentSideWebviewPath === path) {
      await this.hideSideWebview();
      return;
    }

    appStore.setCurrentSideWebviewPath(path);
    await this.navigate(path);
    await this.showSideWebview();
  }

  async showSideWebview() {
    await ipcTauri.invoke("show_side_webview");
  }

  async hideSideWebview() {
    appStore.setCurrentSideWebviewPath(undefined);

    await ipcTauri.invoke("hide_side_webview");
    await this.navigate(ERouterPath.rightSideView);
  }

  async navigate(path: ERouterPath) {
    await webviewChannel.sendMessage(
      webviewChannel.createMessage({
        receiverIds: [SideWebviewId],
        type: EChannelMessageEventType.navigate,
        payload: {
          path: path,
        },
      }),
    );
  }
}

export const sideWebviewManager = new SideWebviewManger();
