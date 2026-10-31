import { startDomProbe, stopDomProbe, type IDomProbeConfig } from "../engine/domProbe";

/**
 * TikTok 消息页 DOM 探针（临时诊断工具，配置见 ../engine/domProbe.ts）
 *
 * ⚠️ 已知坑：TikTok `/messages` 页面里同时有「通知」和「私信」两个 tab，
 * 默认可能停在**通知 tab**（`data-e2e` 只有 comments / likes / followers / mentions 那批，
 * 会话列表为空）。采集时务必先切到**私信 tab**再等 dump。
 */
const CONFIG: IDomProbeConfig = {
  label: "TikTok",
  logSource: "tiktok",
  pageMatch: /^\/messages/,
  attrs: ["data-e2e", "data-testid", "role", "aria-label"],
  hostCandidates: [
    "#main-content-messages",
    '[data-e2e*="conversation"]',
    '[data-e2e*="chat"]',
    '[class*="message"]',
  ],
  linkPatterns: ["/messages/"],
  maxDumps: 6,
  firstDelayMs: 4000,
};

export function startTikTokDomProbe() {
  startDomProbe(CONFIG);
}

export function stopTikTokDomProbe() {
  stopDomProbe(CONFIG.logSource);
}
