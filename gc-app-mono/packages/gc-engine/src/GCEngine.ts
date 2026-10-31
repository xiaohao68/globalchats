import { AbstractLifeCycle } from "@gc/misc";
import { initThirdApp } from "@gc/app-init";
import { getCurrentWebviewId } from "@gc/utils";
import { appStore } from "@gc/store";
import {
  EPlatform,
  makeDefaultAppState,
  serializeThirdAppConfig,
  type AppState,
} from "@gc/model";
import { isEmpty } from "lodash-es";
import { telegram } from "./apps";
import { whatsapp } from "./apps/whatsapp/whatsapp.ts";
import { messenger } from "./apps/messenger/messenger.ts";
import { instagram } from "./apps/instagram/instagram.ts";
import { facebook } from "./apps/facebook/facebook.ts";
import { tiktok } from "./apps/tiktok/tiktok.ts";
import { linkedin } from "./apps/linkedin/linkedin.ts";
import { teams } from "./apps/teams/teams.ts";

/**
 * `platform-linkedin` → `linkedin`；`Whatsapp Business API` → `whatsappbusinessapi`。
 * 两套命名（webview label / EPlatform 值）共存，跨层比对前先过这一层。
 */
const normalizeKey = (value: unknown) =>
  String(value ?? "")
    .replace(/^platform-/, "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();

class GCEngine implements AbstractLifeCycle {
  async mount() {
    // 初始化第三方应用环境（store / 通道）。
    // ⭐ 2026-10-21：这里必须容错 —— initThirdApp 里有等待主窗口回传 store 的轮询
    //（最长 30 秒），一旦它抛异常，后面的监听挂载就整体不执行，
    // 表现又是「页面能开、监听一条没有」。宁可环境降级，也要把监听挂上。
    try {
      await initThirdApp();
    } catch (err) {
      console.warn("[gcEngine] initThirdApp 失败，继续挂载监听：", err);
    }
    const currentWebviewId = getCurrentWebviewId();
    const app = this.#resolveApp(currentWebviewId);
    if (isEmpty(app)) {
      console.warn(
        `[gcEngine] webview "${currentWebviewId}" 没有对应的应用配置，引擎（含消息监听）不会挂载`,
      );
      return;
    }
    await this.excApp(app.platform);
  }

  /**
   * 把 webview label 映射到应用配置。
   *
   * 为什么需要这一层：`appStore.appList` 的 key 是应用配置的 UUID，
   * 而我们的平台 WebView 用的是自己的命名（"platform-linkedin"）。
   * 直接按 label 取永远取不到 —— 引擎会**静默返回**，
   * 表现为「preload 明明注入了，但监听一点动静都没有」，很难排查。
   *
   * 所以先按 label 精确匹配，取不到再按「去掉 platform- 前缀 + 忽略大小写与分隔符」兜底，
   * 仍取不到就**用静态平台配置补一份**（见 `#ensureAppFromPlatformConfig`）。
   */
  #resolveApp(webviewId: string): AppState | undefined {
    const direct = appStore.appList[webviewId];
    if (!isEmpty(direct)) return direct;

    const target = normalizeKey(webviewId);
    const matched = Object.values(appStore.appList).find(
      (item) => normalizeKey(String(item.platform)) === target,
    );
    if (!isEmpty(matched)) return matched;

    return this.#ensureAppFromPlatformConfig(webviewId, target);
  }

  /**
   * 兜底：`appList` 里没有这个平台时，用 `third-app-config.ts` 的静态配置合成一份补进去。
   *
   * 为什么必须有这道兜底（2026-10-15 实测踩坑）：
   * `appStore.appList` 来自「当前登录用户的第三方应用配置」
   * （`userConfigList[uid].thirdAppConfigList`）—— **用户没在设置里添加过的平台就不在里面**。
   * 于是 `mount()` 在第一步就 return，**引擎连同消息监听一行都不跑**，
   * 而页面本身能正常打开、能正常登录，只在一条 warn 里留下痕迹，极易误判成「选择器写错了」。
   *
   * 实测证据：同一次应用会话里 TikTok 挂载正常（appList 有它），Facebook 的 WebView
   * 建了 6 次、6 次都被静默跳过 —— 差别只有一个：appList 里有没有这个平台。
   *
   * 合成的 AppState 只落在**本 WebView 的内存 store** 里（非主页不持久化），
   * 不会污染磁盘上的用户配置；`dataStoreIdentifier` 也不会被用到（WebView 早已由 Rust 侧建好）。
   */
  #ensureAppFromPlatformConfig(
    webviewId: string,
    target: string,
  ): AppState | undefined {
    if (!target) return undefined;

    const platform = (Object.values(EPlatform) as EPlatform[]).find(
      (item) => normalizeKey(item) === target,
    );
    if (!platform) return undefined;

    const app = makeDefaultAppState(serializeThirdAppConfig(platform));
    appStore.updateAppList([app]);
    console.warn(
      `[gcEngine] webview "${webviewId}" 不在用户应用配置里，已用静态平台配置兜底补入（平台=${platform}），监听照常挂载`,
    );
    return app;
  }

  async excApp(platform: EPlatform) {
    switch (platform) {
      case EPlatform.Telegram:
        await telegram.mount();
        break;
      case EPlatform.Whatsapp:
        await whatsapp.mount();
        break;
      case EPlatform.Instagram:
        await instagram.mount();
        break;
      case EPlatform.Messenger:
        await messenger.mount();
        break;
      case EPlatform.Facebook:
        await facebook.mount();
        break;
      case EPlatform.Tiktok:
        await tiktok.mount();
        break;
      case EPlatform.Linkedin:
        await linkedin.mount();
        break;

      case EPlatform.Teams:
        await teams.mount();
        break;

      default:
        break;
    }
  }

  destroy() {}
}

export const gcEngine = new GCEngine();
