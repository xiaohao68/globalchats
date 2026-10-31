import { startDomProbe, stopDomProbe, type IDomProbeConfig } from "../engine/domProbe";

/**
 * Facebook 消息页 DOM 探针（临时诊断工具，配置见 ../engine/domProbe.ts）
 *
 * Facebook 的 class 是**编译期哈希**（`x1lliihq x193iq5w x6ikm8r …`），改版即失效，
 * 所以这里刻意**不采 class**，重点采语义属性：
 *   · `role`（`row` / `gridcell` / `log` / `listitem` —— 会话条目和消息气泡大概率是这些）
 *   · `aria-label`（消息正文、会话名常常整段塞在这里）
 *   · `data-pagelet`（Meta 的页面区块标记，比 class 稳得多）
 *   · `data-visualcompletion`（`ignore` / `ignore-dynamic` / `loading`）
 *
 * 另外单独抓「链接指纹」：会话页 URL 形如 `/messages/t/<threadId>/`，
 * 若列表条目里有 `<a href="/messages/t/…">`，就能**直接从 DOM 拿到稳定 thread id + 客户名**，
 * 不必像 LinkedIn 那样退回用名字派生键。
 */
const CONFIG: IDomProbeConfig = {
  label: "Facebook",
  logSource: "facebook",
  pageMatch: /^\/messages/,
  attrs: [
    "role",
    "aria-label",
    "aria-roledescription",
    "data-pagelet",
    "data-visualcompletion",
    "data-testid",
  ],
  hostCandidates: [
    '[role="main"]',
    '[role="grid"]',
    '[role="log"]',
    'div[data-pagelet*="Message"]',
  ],
  linkPatterns: ["/messages/t/", "/messages/"],
  maxDumps: 8,
  firstDelayMs: 5000,
};

export function startFacebookDomProbe() {
  startDomProbe(CONFIG);
}

export function stopFacebookDomProbe() {
  stopDomProbe(CONFIG.logSource);
}
