import { startDomProbe, stopDomProbe, type IDomProbeConfig } from "../engine/domProbe";

/**
 * Messenger（messenger.com）DOM 探针（临时诊断工具，配置见 ../engine/domProbe.ts）
 *
 * Messenger 与 Facebook 的 messages 页**同属 Meta 一套技术栈**（class 都是编译期哈希），
 * 但 messenger.com 是老壳、facebook.com/messages 是新壳，DOM 结构未必一致 ——
 * 所以两个平台各挂一份探针，一次把两套都采清楚。
 *
 * messenger.com 的会话页 URL 形如 `/t/<threadId>`。
 */
const CONFIG: IDomProbeConfig = {
  label: "Messenger",
  logSource: "messenger",
  pageMatch: /^\/(t\/|$)/,
  attrs: [
    "role",
    "aria-label",
    "aria-roledescription",
    "data-pagelet",
    "data-visualcompletion",
    "data-testid",
  ],
  hostCandidates: [
    'div[data-pagelet="MWInboxHomeRootInbox"]',
    '[role="main"]',
    '[role="grid"]',
    '[role="log"]',
  ],
  linkPatterns: ["/t/"],
  maxDumps: 8,
  firstDelayMs: 5000,
};

export function startMessengerDomProbe() {
  startDomProbe(CONFIG);
}

export function stopMessengerDomProbe() {
  stopDomProbe(CONFIG.logSource);
}
