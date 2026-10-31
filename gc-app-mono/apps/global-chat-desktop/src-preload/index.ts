import { gcEngine } from "@gc/gc-engine";
import { setupWebviewLogBridge, type LogSource } from "@gc/logger";
import { getCurrentWebview } from "@tauri-apps/api/webview";

// ============================================================================
// ⚠️ 这段"等 Tauri 就绪"的逻辑是 2026-10-21 加的关键修复，改动前必读
//
// 问题现象：打包成 release 版发给业务员后，**监听一条消息都收不到**，
// 但页面能正常打开、能登录平台。
//
// 排查结论（靠日志定位）：
//   1. 平台 WebView 里 preload 确实注入了（有 WebviewChannel 日志），
//      但日志的 source 是 "preload" 而不是 "linkedin"
//      —— 说明下面的 isTauriWebview() 返回了 false，
//      也就是 __TAURI_INTERNALS__ 那一刻还不存在。
//   2. 紧接着 gcEngine.mount() 里所有 invoke 全部落空，
//      日志里刷了 12316 条：
//      `[TAURI] Couldn't find callback id X ...`
//   3. 结果：mount 第一步拿应用配置就失败 → 监听根本没启动
//      → 全天 0 条「监听] 诊断」日志（debug 版有 2828 条）。
//
// 为什么 debug 版没事：dev 模式下 Tauri 的注入顺序不同，
// 我们这个 initialization_script 执行时 __TAURI_INTERNALS__ 已经存在，
// 所以 isTauriWebview() 一直都是 true，问题从来没暴露。
// release（custom-protocol）下我们的脚本跑在 Tauri 初始化之前，就炸了。
//
// 修法：轮询等 __TAURI_INTERNALS__ 真正可用再 mount，最多等 15 秒。
// 绝不能"到点就放弃"——超时也照样 mount，宁可少日志也不能不监听。
// ============================================================================

const getWebviewLabel = (): string | null => {
  try {
    const label = (window as any)?.__TAURI_INTERNALS__?.metadata?.currentWebview?.label;
    return typeof label === "string" && label.length > 0 ? label : null;
  } catch {
    return null;
  }
};

const getSourceFromLabel = (label: string): LogSource => {
  if (label.includes("telegram")) return "telegram";
  if (label.includes("whatsapp")) return "whatsapp";
  if (label.includes("instagram")) return "instagram";
  if (label.includes("messenger")) return "messenger";
  if (label.includes("facebook")) return "facebook";
  if (label.includes("tiktok")) return "tiktok";
  if (label.includes("linkedin")) return "linkedin";
  if (label.includes("teams")) return "teams";
  return "preload";
};

/**
 * 是否主框架（top frame）。
 *
 * ⚠️ 2026-10-21 的教训（务必看完再改）：
 * 曾用 `window.top === window.self` 判断，结果在 Tauri 的 WebView 里
 * **连主框架都被判成子框架**，preload 直接一条都没跑，监听完全消失。
 * 所以这里改成 fail-open：任何判断不了的情况都当作主框架放行。
 *
 * 判断用 `window.frameElement`：主文档没有 frameElement（null），
 * iframe 里则指向宿主 <iframe> 元素。跨域 iframe 访问会抛错，同样放行
 * ——宁可多跑几个监听器（日志会重复、基线可能打架），
 * 也不能因为浏览器差异把主框架一起禁掉。
 */
const isSubFrame = (() => {
  try {
    return window.frameElement !== null;
  } catch {
    return false;
  }
})();

// 防止重复初始化；只跳过**能明确判定**的子框架
if (!isSubFrame && !(window as any).__GC_PRELOAD_INITIALIZED__) {
  (window as any).__GC_PRELOAD_INITIALIZED__ = true;

  let booted = false;

  const boot = (label: string | null, waitedMs: number) => {
    if (booted) return;
    booted = true;

    try {
      setupWebviewLogBridge({ source: label ? getSourceFromLabel(label) : "preload" });
    } catch {
      setupWebviewLogBridge({ source: "preload" });
    }

    // 用日志把"等了多久"记下来：以后再有同类问题，
    // 搜 `[preload] 启动` 就能立刻看出是时序问题还是别的原因
    try {
      console.log(`[preload] 启动 mount，webview=${label ?? "未知"}，等待 Tauri 就绪 ${waitedMs}ms`);
    } catch {
      /* 日志失败不能影响 mount */
    }

    gcEngine.mount();
  };

  const startedAt = Date.now();
  const MAX_WAIT_MS = 15000;
  const TICK_MS = 50;

  const tick = () => {
    const label = getWebviewLabel();
    if (label) {
      boot(label, Date.now() - startedAt);
      return;
    }
    const waited = Date.now() - startedAt;
    if (waited >= MAX_WAIT_MS) {
      // 超时兜底：不放弃，照样 mount。
      // 宁可拿不到 label（日志 source 会退化成 preload），也不能让监听彻底不启动。
      boot(null, waited);
      return;
    }
    setTimeout(tick, TICK_MS);
  };

  tick();
}
