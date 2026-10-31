import { createLogger, type LogSource } from "@gc/logger";

/**
 * 通用 DOM 探针（临时诊断工具）
 * ============================================================
 * 目的：一次性拿到某平台消息页的**真实 DOM 结构**，避免像 LinkedIn 那样
 * 靠猜选择器、来回试错好几轮。
 *
 * 为什么做成通用模块：六平台的「采集逻辑」完全一样，只有三样东西不同 ——
 *   · 页面匹配规则（pageMatch）
 *   · 高价值属性白名单（attrs：TikTok 是 data-e2e，Meta 系是 role/aria-label/data-pagelet…）
 *   · 消息区根节点候选（hostCandidates）
 * 各平台只需写一份十几行的配置，见 `apps/<platform>/domProbe.ts`。
 *
 * 每次 dump 采集：
 *   1. 上下文（url / path / 属性命中数 / body 子节点数）
 *   2. **属性值频次表**（按出现次数倒序）—— 最高频的那个属性值往往就是「列表项」
 *   3. 属性元素明细（父链 + 文本摘要）
 *   4. **链接指纹**（href 含 linkPatterns 的 `<a>`）—— 会话 id / 客户名常常只在 href 里
 *   5. 「类列表容器」启发式识别 + 前 3 个条目 outerHTML
 *   6. 消息区层级大纲 + 左列大纲
 *
 * 触发：进入匹配页面 N 秒后 dump 一次；之后每次 URL 变化再 dump 一次，总计不超过 maxDumps 次。
 * 也可在控制台手动触发：`window.__gcDumpDom()`。
 *
 * ⚠️ 只读 DOM、不点任何按钮、不发任何请求；正式监听上线前会删掉。
 */

export interface IDomProbeConfig {
  /** 显示名，用于日志（如 "Facebook"） */
  label: string;
  /** 日志 source（与平台一致，如 "facebook"） */
  logSource: LogSource;
  /** 只在此正则匹配 `location.pathname` 时采集 */
  pageMatch: RegExp;
  /** 高价值属性名白名单（按此顺序扫描） */
  attrs: string[];
  /** 消息区根节点候选选择器（依次尝试，全落空则用 body 兜底） */
  hostCandidates: string[];
  /** 链接指纹：href 含这些子串的 `<a>` 会被单独列出 */
  linkPatterns?: string[];
  /** 「有意义节点」的 class 关键字（用于大纲过滤） */
  classHint?: RegExp;
  /** 总采集次数上限 */
  maxDumps?: number;
  /** 首次进入页面后的等待时间（等渲染稳定） */
  firstDelayMs?: number;
}

/** 单条日志上限（app.log 对超长单行会截断，宁可分多条） */
const LINE_BUDGET = 1100;
/** outerHTML 保留长度 */
const HTML_CLIP = 900;
/** 属性频次表最多输出多少条 */
const ATTR_TABLE_MAX = 70;
/** 属性明细最多多少个元素 */
const ATTR_DETAIL_MAX = 60;
/** 链接指纹最多多少条 */
const LINK_MAX = 60;
/** body 子节点少于这个数＝页面还没渲染完（骨架屏），此时 dump 没意义，重试而不是浪费一次预算 */
const MIN_BODY_CHILDREN = 15;
/** 页面未就绪时的重试次数 */
const READY_RETRY_MAX = 3;
/** 每次重试前再等多久（ms） */
const READY_RETRY_MS = 4000;

const DEFAULT_CLASS_HINT =
  /chat|message|conversation|session|list|item|bubble|nickname|avatar|content|title|panel|sidebar|main|cell|entry|row|header|text|time|badge|unread|thread|inbox/i;

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "NOSCRIPT",
  "SVG",
  "PATH",
  "CANVAS",
  "IFRAME",
  "BR",
  "HEAD",
]);

interface IProbeState {
  cfg: IDomProbeConfig;
  logger: ReturnType<typeof createLogger>;
  started: boolean;
  dumpCount: number;
  lastHref: string;
  urlTimer?: number;
  pendingTimer?: number;
  scheduled: boolean;
}

const states = new Map<string, IProbeState>();

function clamp(s: string, max: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…[+${one.length - max}]` : one;
}

function textBrief(el: Element, max = 60): string {
  return clamp(el.textContent || "", max);
}

/** 把长数组切成若干条不超过 LINE_BUDGET 的日志行 */
function emit(state: IProbeState, title: string, lines: string[]) {
  if (!lines.length) {
    state.logger.info(`${title}｜(空)`);
    return;
  }
  let buf = "";
  let part = 1;
  for (const line of lines) {
    if (buf && buf.length + line.length + 1 > LINE_BUDGET) {
      state.logger.info(`${title}｜chunk${part}｜${buf}`);
      buf = "";
      part += 1;
    }
    buf = buf ? `${buf}\n${line}` : line;
  }
  if (buf) state.logger.info(`${title}｜chunk${part}｜${buf}`);
}

/** `div#app > div.a.b[role=row]` 这种紧凑路径 */
function compactPath(el: Element, attrs: string[], depth = 6): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  let guard = 0;
  while (cur && guard < depth && cur !== document.body) {
    let seg = cur.tagName.toLowerCase();
    if (cur.id) seg += `#${cur.id}`;
    for (const a of attrs) {
      const v = cur.getAttribute(a);
      if (v) seg += `[${a}=${v.length > 24 ? `${v.slice(0, 24)}…` : v}]`;
    }
    const cls = typeof cur.className === "string" ? cur.className.trim() : "";
    if (cls) seg += `.${cls.split(/\s+/).slice(0, 2).join(".")}`;
    parts.unshift(seg);
    cur = cur.parentElement;
    guard += 1;
  }
  return parts.join(" > ");
}

/** 按白名单属性收集元素，并统计「属性=值」频次 */
function collectAttrs(attrs: string[]) {
  const els: { el: Element; attr: string; value: string }[] = [];
  const freq = new Map<string, number>();
  for (const attr of attrs) {
    document.querySelectorAll(`[${attr}]`).forEach((el) => {
      const v = el.getAttribute(attr);
      if (!v) return;
      els.push({ el, attr, value: v });
      const k = `${attr}=${v}`;
      freq.set(k, (freq.get(k) || 0) + 1);
    });
  }
  const table = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ATTR_TABLE_MAX)
    .map(([k, n]) => `· ×${String(n).padStart(3, " ")}  ${k.length > 120 ? `${k.slice(0, 120)}…` : k}`);
  return { els, table, total: els.length };
}

/** 链接指纹 */
function collectLinks(patterns: string[]): string[] {
  if (!patterns.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!patterns.some((p) => href.includes(p))) return;
    const key = `${href}|${textBrief(a, 30)}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (out.length >= LINK_MAX) return;
    out.push(
      `· ${clamp(href, 90)}  ⏎ "${textBrief(a, 50)}"  @ ${compactPath(a.parentElement || a, ["role"])}`,
    );
  });
  return out;
}

/** 层级大纲：只保留带 id / 白名单属性 / 语义 class 的节点 */
function outline(
  root: Element,
  cfg: IDomProbeConfig,
  maxDepth = 7,
  maxLines = 90,
): string[] {
  const out: string[] = [];
  const classHint = cfg.classHint || DEFAULT_CLASS_HINT;

  const walk = (el: Element, depth: number) => {
    if (out.length >= maxLines || depth > maxDepth) return;
    if (SKIP_TAGS.has(el.tagName)) return;

    const cls = typeof el.className === "string" ? el.className : "";
    const hits = cfg.attrs.filter((a) => el.getAttribute(a));
    const interesting = !!el.id || hits.length > 0 || classHint.test(cls);

    if (interesting) {
      let seg = el.tagName.toLowerCase();
      if (el.id) seg += `#${el.id}`;
      for (const a of hits) {
        const v = el.getAttribute(a) || "";
        seg += `[${a}=${v.length > 30 ? `${v.slice(0, 30)}…` : v}]`;
      }
      const c = cls.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
      if (c) seg += ` .${c}`;
      const txt = el.children.length === 0 ? ` "${textBrief(el, 40)}"` : "";
      out.push(`${"  ".repeat(Math.min(depth, 6))}${seg}${txt}`);
    }

    for (const child of Array.from(el.children)) walk(child, depth + 1);
  };

  walk(root, 0);
  return out;
}

/** 启发式找「类列表容器」：子元素 3~40 个、都是同类标签且结构相似 */
function guessListContainers(): Element[] {
  const hits: Element[] = [];
  document.querySelectorAll("div, ul, ol, section").forEach((el) => {
    const n = el.childElementCount;
    if (n < 3 || n > 40) return;
    const kids = Array.from(el.children);
    const first = kids[0];
    if (!first) return;
    const tag = first.tagName;
    if (!kids.every((k) => k.tagName === tag)) return;
    const cls0 = first.className;
    if (!cls0 || !kids.every((k) => k.className === cls0)) return;
    if (first.childElementCount === 0) return;
    hits.push(el);
  });
  return hits.slice(-4);
}

function dump(state: IProbeState, reason: string) {
  const { cfg, logger } = state;
  state.dumpCount += 1;
  const n = state.dumpCount;
  const tag = `[#${n}]`;

  logger.info(`===== ${cfg.label} DOM 探针 dump#${n} (${reason}) =====`);

  const { els, table, total } = collectAttrs(cfg.attrs);
  logger.info(
    `${tag} 上下文｜url=${location.href}｜path=${location.pathname}｜属性命中=${total}｜body子节点=${document.body.childElementCount}`,
  );

  // 1. 属性值频次表 —— 最高频的值往往就是「列表项」
  emit(state, `${tag} 属性频次表 (${cfg.attrs.join(" / ")})`, table);

  // 2. 属性元素明细
  const detail = els
    .slice(0, ATTR_DETAIL_MAX)
    .map(
      (e) =>
        `· ${e.el.tagName.toLowerCase()}[${e.attr}=${clamp(e.value, 40)}] @ ${compactPath(e.el.parentElement || e.el, cfg.attrs, 4)} ⏎ "${textBrief(e.el, 45)}"`,
    );
  emit(state, `${tag} 属性元素明细`, detail);

  // 3. 链接指纹 —— 会话 id / 客户名常常只在 href 里
  if (cfg.linkPatterns?.length) {
    emit(state, `${tag} 链接指纹 (${cfg.linkPatterns.join(" | ")})`, collectLinks(cfg.linkPatterns));
  }

  // 4. 类列表容器 + 前 3 个条目
  const containers = guessListContainers();
  emit(
    state,
    `${tag} 类列表容器`,
    containers.map((c, i) => `#${i} 子元素=${c.childElementCount} @ ${compactPath(c, cfg.attrs, 5)}`),
  );
  containers.forEach((c, i) => {
    const kids = Array.from(c.children).slice(0, 3);
    emit(
      state,
      `${tag} 列表#${i} 前${kids.length}个条目`,
      kids.map(
        (k, j) =>
          `· 条目${j} 路径=${compactPath(k, cfg.attrs, 5)}\n  html=${clamp(k.outerHTML, HTML_CLIP)}`,
      ),
    );
  });

  // 5. 消息区大纲
  let host: Element | null = null;
  for (const sel of cfg.hostCandidates) {
    host = document.querySelector(sel);
    if (host) {
      logger.info(`${tag} 消息区命中候选选择器：${sel}`);
      break;
    }
  }
  if (host) {
    emit(state, `${tag} 消息区大纲 @ ${compactPath(host, cfg.attrs, 4)}`, outline(host, cfg));
  } else {
    logger.info(`${tag} 消息区大纲｜所有候选选择器都落空，用 body 兜底：${cfg.hostCandidates.join(" , ")}`);
    emit(state, `${tag} body 大纲`, outline(document.body, cfg, 6, 70));
  }

  // 6. 左列大纲（会话列表通常在最左列）
  if (!cfg.linkPatterns?.length) {
    const firstCol = document.body.querySelector("div > div > div");
    if (firstCol && firstCol !== host) {
      emit(state, `${tag} 左列大纲 @ ${compactPath(firstCol, cfg.attrs, 4)}`, outline(firstCol, cfg, 6, 60));
    }
  }

  logger.info(`===== ${cfg.label} DOM 探针 dump#${n} 结束（预算 ${cfg.maxDumps ?? 6} 次，已用 ${n}）=====`);
}

function scheduleDump(state: IProbeState, reason: string, delayMs: number) {
  const max = state.cfg.maxDumps ?? 6;
  if (state.dumpCount >= max || state.scheduled) return;
  state.scheduled = true;

  const attempt = (left: number) => {
    state.pendingTimer = window.setTimeout(() => {
      if (state.dumpCount >= max) {
        state.scheduled = false;
        return;
      }
      // 页面还是骨架屏 → 重试，不浪费一次采集预算（走代理时首屏常需十几秒）
      const kids = document.body.childElementCount;
      if (kids < MIN_BODY_CHILDREN && left > 0) {
        state.logger.info(
          `${state.cfg.label} DOM 探针｜页面尚未渲染完（body 子节点=${kids}），${READY_RETRY_MS / 1000}s 后重试（剩 ${left} 次）`,
        );
        attempt(left - 1);
        return;
      }
      state.scheduled = false;
      try {
        dump(state, reason);
      } catch (error) {
        state.logger.error(`${state.cfg.label} DOM 探针异常: ${String(error)}`);
      }
    }, delayMs);
  };

  attempt(READY_RETRY_MAX);
}

export function startDomProbe(cfg: IDomProbeConfig) {
  const key = cfg.logSource;
  const existed = states.get(key);
  if (existed?.started) return;

  const state: IProbeState = {
    cfg,
    logger: createLogger(cfg.logSource, "dom-probe"),
    started: true,
    dumpCount: 0,
    lastHref: "",
    scheduled: false,
  };
  states.set(key, state);

  const max = cfg.maxDumps ?? 6;
  const firstDelay = cfg.firstDelayMs ?? 4000;
  state.logger.info(
    `${cfg.label} DOM 探针已启动｜url=${location.href}｜页面匹配=${cfg.pageMatch.test(location.pathname)}｜预算=${max} 次`,
  );

  // 控制台手动触发，方便随时补一次
  (window as unknown as Record<string, unknown>).__gcDumpDom = () => {
    state.dumpCount = Math.min(state.dumpCount, max - 1);
    state.scheduled = false;
    scheduleDump(state, "手动触发", 0);
  };

  if (cfg.pageMatch.test(location.pathname)) {
    scheduleDump(state, "首次进入目标页", firstDelay);
  } else {
    state.logger.info(`${cfg.label} DOM 探针｜当前不是目标页，等切过去再采`);
  }

  // URL 变化（切换会话 / 从别处进来）→ 再采一次
  state.lastHref = location.href;
  state.urlTimer = window.setInterval(() => {
    if (state.dumpCount >= max) {
      if (state.urlTimer) window.clearInterval(state.urlTimer);
      return;
    }
    if (location.href === state.lastHref) return;
    state.lastHref = location.href;
    if (!cfg.pageMatch.test(location.pathname)) return;
    scheduleDump(state, "URL 变化（疑似切换会话）", 2500);
  }, 1500);
}

export function stopDomProbe(logSource: LogSource) {
  const state = states.get(logSource);
  if (!state) return;
  if (state.urlTimer) window.clearInterval(state.urlTimer);
  if (state.pendingTimer) window.clearTimeout(state.pendingTimer);
  state.urlTimer = undefined;
  state.pendingTimer = undefined;
  state.started = false;
  state.logger.info(`${state.cfg.label} DOM 探针已停止`);
  states.delete(logSource);
}
