import { globalStore } from "@gc/store";
import { ETheme, ITranslateConfig, MainWebviewId } from "@gc/model";
import { ipcTauri } from "./ipcTauri.ts";
import { AbstractLifeCycle } from "@gc/misc";
import { EChannelMessageEventType, webviewChannel } from "./webviewChannel.ts";
import { isMainWebview, Nullable } from "@gc/utils";
import { i18nNext } from "@gc/i18n";
import { isEmpty } from "lodash-es";
import { z } from "zod";

export const translateFormSchema = z.object({
  modelId: z.string().min(1, "请选择"),
  isIndependent: z.boolean(),
  receiveMessageEnable: z.boolean(),
  receiveMessageSrcLang: z.string().min(1, "请选择"),
  receiveMessageDstLang: z.string().min(1, "请选择"),

  sendMessageEnable: z.boolean(),
  sendMessageSrcLang: z.string().min(1, "请选择"),
  sendMessageDstLang: z.string().min(1, "请选择"),
});
export const makeFormDataByTranslateConfig = (
  globalTranslate: Nullable<ITranslateConfig>,
): Partial<z.infer<typeof translateFormSchema>> => {
  return {
    modelId: globalTranslate?.modelId,
    isIndependent: globalTranslate?.isIndependent,
    receiveMessageEnable: globalTranslate?.receiveMessage.enable,
    receiveMessageSrcLang: globalTranslate?.receiveMessage.from,
    receiveMessageDstLang: globalTranslate?.receiveMessage.to,

    sendMessageEnable: globalTranslate?.sendMessage.enable,
    sendMessageSrcLang: globalTranslate?.sendMessage.from,
    sendMessageDstLang: globalTranslate?.sendMessage.to,
  };
};

class GlobalSettingManager implements AbstractLifeCycle {
  mount() {
    // Apply incoming global settings updates on any webview
    webviewChannel.emitter.on(
      EChannelMessageEventType.updateSettings,
      ({ payload }) => {
        const gs = payload.globalSetting;
        if (!gs) return;

        const old = globalStore.globalSetting;
        const themeChanged = old.theme !== gs.theme;
        const i18nChanged = old.i18n !== gs.i18n;

        // update local store snapshot (non-main won't persist)
        globalStore.updateGlobalSetting(gs);

        if (themeChanged) {
          this.updateAppTheme();
        }
        if (i18nChanged) {
          i18nNext.changeLanguage(gs.i18n);
        }
        // translate changes are picked up by engine observers via store getters
      },
    );

    if (globalStore.globalSetting.theme === ETheme.system) {
      this.setTheme(this.systemTheme);
    } else {
      this.updateAppTheme();
    }
    console.log(globalStore.globalSetting.translate);
    // this.setI18n(globalStore.globalSetting.i18n);
    // this.setTranslate(globalStore.globalSetting.i18n);
  }

  destroy() {}

  //-------------------------------------------------------------------------------------
  // theme
  //-------------------------------------------------------------------------------------
  get theme() {
    return globalStore.globalSetting.theme;
  }

  get isDark() {
    return this.theme === ETheme.dark;
  }

  get systemTheme() {
    // return window.matchMedia("(prefers-color-scheme: dark)").matches
    //   ? ETheme.dark
    //   : ETheme.light;
    return ETheme.light;
  }

  setTheme(theme: ETheme) {
    globalStore.updateGlobalSetting({ theme });
    this.updateAppTheme();
    // broadcast/persist via unified channel
    webviewChannel.sendMessage({
      receiverIds: [isMainWebview() ? "*" : MainWebviewId],
      type: EChannelMessageEventType.updateSettings,
      payload: { globalSetting: globalStore.globalSetting },
    });
  }

  async updateAppTheme() {
    console.log("updateAppTheme", this.isDark);

    if (this.isDark) {
      document.documentElement.classList.add(ETheme.dark);
      if (isMainWebview()) {
        await ipcTauri.invoke("set_theme", { theme: ETheme.dark });
      }
    } else {
      document.documentElement.classList.remove(ETheme.dark);
      if (isMainWebview()) {
        await ipcTauri.invoke("set_theme", { theme: ETheme.light });
      }
    }
  }

  //-------------------------------------------------------------------------------------
  // i18n
  //-------------------------------------------------------------------------------------
  setI18n(i18n: string) {
    globalStore.updateGlobalSetting({ i18n });
    i18nNext.changeLanguage(i18n);
    webviewChannel.sendMessage({
      receiverIds: [isMainWebview() ? "*" : MainWebviewId],
      type: EChannelMessageEventType.updateSettings,
      payload: { globalSetting: globalStore.globalSetting },
    });
  }

  setTranslate(translate: ITranslateConfig) {
    if (isEmpty(translate)) return;
    globalStore.updateGlobalSetting({ translate });
    webviewChannel.sendMessage({
      receiverIds: [isMainWebview() ? "*" : MainWebviewId],
      type: EChannelMessageEventType.updateSettings,
      payload: { globalSetting: globalStore.globalSetting },
    });
  }

  validateTranslate(translate: Nullable<ITranslateConfig>) {
    if (isEmpty(translate)) {
      return false;
    }

    return translateFormSchema.safeParse(
      makeFormDataByTranslateConfig(translate),
    ).success;
  }
}

export const globalSettingManager = new GlobalSettingManager();
