import {
  MessageWatcherBase,
  normName,
  pickAttr,
  pickText,
  queryFirstMatch,
  shortHash,
  type IParsedMessage,
  type IMessageWatcherOptions,
  type IWatchedConversation,
} from "../engine/MessageWatcherBase.ts";

/**
 * LinkedIn 消息监听器（平台薄壳）
 * ============================================================
 * 骨架（生命周期 / 基线 / 去重 / 上报判定 / 诊断）全在
 * `../engine/MessageWatcherBase.ts`；本文件只负责「怎么从 LinkedIn 的 DOM 里
 * 把数据抠出来」。重构前这里是 805 行独立实现。
 *
 * ── 两条路线（2026-10-14 逐层 DOM 转储后定稿）─────────────────────
 *
 * 【路线 A · 主力】当前打开的会话页（`/messaging/thread/<id>/`）
 *   - **会话 id 直接来自 URL**：`/messaging/thread/2-<base64>/`
 *     （实测 `2-MzQw...` 解 base64 = `340ed22d-d881-469e-af00-88b65cb1bdf3_100`）
 *   - **消息节点**：`.msg-s-event-listitem`
 *     · `data-event-urn="urn:li:msg_message:(urn:li:fsd_profile:XXX,2-YYY)"` ← **真实消息 id**
 *     · class 含 `msg-s-event-listitem--other` ⇒ **对方（客户）发来的**
 *     · `.msg-s-message-group__name` ⇒ 发送者名（只在一条群组的首条出现，需向下顺延）
 *     · `.msg-s-message-group__timestamp` ⇒ 时间文本（如 "11:41"）
 *     · `.msg-s-event-listitem__body` ⇒ 正文
 *
 * 【路线 B · 辅助】会话列表（任意页面可见，用于「没点开也提醒」）
 *   - 条目：`.msg-conversations-container__convo-item`（外层是 `<li id="ember47">`）
 *   - ⚠️ 条目里的「链接」是 **`<div class="msg-conversation-listitem__link">`，不是 `<a>`**
 *     ⇒ `a[href*="/messaging/thread/"]` 恒为 0，**列表 DOM 里没有任何 thread id**
 *   - ⇒ 列表路线不追求 id；客户/会话键由 `makeCustomerKey` / `makeConversationKey`
 *     用**客户名**派生（见下方注释）
 */

// ================================================================
// 选择器
// ================================================================

/** 会话条目候选选择器（按优先级） */
const CONVO_ITEM_SELECTORS = [
  ".msg-conversations-container__convo-item",
  '[class*="msg-conversations-container__convo-item"]',
  '[class*="msg-conversation-listitem"]',
];

/** 消息节点候选选择器（按优先级） */
const MESSAGE_ITEM_SELECTORS = [
  ".msg-s-event-listitem",
  '[class*="msg-s-event-listitem"]',
];

const THREAD_ID_RE = /\/messaging\/thread\/([^/?#]+)/;
/** LinkedIn 的会话 id 形如 `2-<base64>`（base64 里可能带 =） */
const RAW_THREAD_ID_RE = /(2-[A-Za-z0-9_\-=]{10,})/;
/** 消息 urn：`urn:li:msg_message:(<sender urn>,<message id>)` */
const MESSAGE_URN_RE = /urn:li:msg_message:\(\s*([^,]+)\s*,\s*([^)]+?)\s*\)/;

/** 字段的多级降级选择器：命中第一个非空值就用 */
const NAME_SELECTORS = [
  // ★ 用户实测确认（2026-10-14）：名字就在这个 h3 里
  ".msg-conversation-listitem__participant-names .truncate",
  ".msg-conversation-listitem__participant-names",
  ".msg-conversation-card__participant-names",
  ".msg-conversations-container__title-row .msg-entity-lockup__entity-title",
  ".msg-entity-lockup__entity-title",
  "h3.msg-conversations-container__title-row-name",
  ".msg-conversations-container__title-row-name",
  "h3",
  '[class*="entity-title"]',
  '[class*="title-row-name"]',
];

const PREVIEW_SELECTORS = [
  // ★ 用户实测确认：预览（含发送者前缀）在这里
  ".msg-conversation-card__message-snippet",
  '[class*="message-snippet"]',
  ".msg-conversations-container__text",
  '[class*="snippet"]',
  "p",
];

const TIME_SELECTORS = ["time", '[class*="time"]', '[class*="timestamp"]'];

const UNREAD_SELECTORS = [
  // ★ 未读时 LinkedIn 会给预览加 `--unread` 修饰类
  ".msg-conversation-card__message-snippet--unread",
  ".msg-conversation-card__unread-count",
  '[class*="unread-count"]',
  '[class*="notification-badge"]',
  '[class*="badge"]',
];

const PROFILE_LINK_SELECTOR = 'a[href*="/in/"]';

/** 名字 → 会话 id 的学习结果落盘键（跨页面刷新保留） */
const NAME_MAP_STORAGE_KEY = "gc:linkedin:nameToThreadId";

// ================================================================
// DOM 解析工具（LinkedIn 专属）
// ================================================================

/**
 * 列表预览形如 `Eric: nice to meet` —— 冒号前是发送者，后面才是正文。
 *
 * 这个前缀非常有用：既知道**是谁发的**（用来区分客户来信 / 我方去信），
 * 又能把正文从「名字: 正文」里剥出来。
 * 加了形状校验（长度、不含协议头/换行），避免把正文里的冒号误当分隔符。
 */
const splitPreviewSender = (preview: string): { sender: string; content: string } => {
  const hit = preview.match(/^([^\n:：]{1,40}?)\s*[:：]\s*([\s\S]+)$/);
  if (!hit) return { sender: "", content: preview };
  const sender = hit[1]?.trim() ?? "";
  if (!sender || /:\/\//.test(sender)) return { sender: "", content: preview };
  return { sender, content: hit[2]?.trim() ?? "" };
};

/** 从条目里尽力解析出 thread id（DOM 路线，多半失败，留着兜底） */
const resolveThreadIdFromDom = (item: Element): string => {
  const anchor =
    (item.matches?.('a[href*="/messaging/thread/"]') ? item : null) ??
    item.querySelector?.('a[href*="/messaging/thread/"]');
  const fromHref = anchor?.getAttribute("href")?.match(THREAD_ID_RE)?.[1];
  if (fromHref) return fromHref;

  for (const attr of ["href", "data-thread-id", "data-thread-urn", "data-urn", "id"]) {
    const value = item.getAttribute(attr) || "";
    const hit = value.match(THREAD_ID_RE)?.[1] ?? value.match(RAW_THREAD_ID_RE)?.[1];
    if (hit) return hit;
  }

  return "";
};

/** 从消息节点解析出平台侧消息 id（真实 urn 优先，退化才合成） */
const resolveMessageId = (
  node: Element,
  fallbackSeed: string,
): { id: string; real: boolean } => {
  const urn = node.getAttribute("data-event-urn") || "";
  const hit = urn.match(MESSAGE_URN_RE);
  if (hit?.[2]) return { id: hit[2].trim(), real: true };

  const attrId =
    node.getAttribute("data-message-id") ||
    node.getAttribute("data-urn") ||
    node.getAttribute("id") ||
    "";
  if (attrId && !/^ember\d+$/.test(attrId)) return { id: attrId, real: true };

  return { id: `synth-${shortHash(fallbackSeed)}`, real: false };
};

/** 从 profile 链接里取对方的画像 id（`/in/<id>`） */
const resolveProfileId = (node: Element): string => {
  const href = pickAttr(node, PROFILE_LINK_SELECTOR, "href");
  if (!href) return "";
  const hit = href.match(/\/in\/([^/?#]+)/);
  return hit?.[1] || "";
};

/**
 * 空正文消息的占位文案。
 *
 * 2026-10-20 之前的做法是「正文为空 ⇒ 整条丢弃」，结果是客户发来一张图，
 * 业务员完全不知道有人找过他 —— 这是漏消息，不是显示问题。
 * 现在至少给一个占位，让列表里能看到「有动静」。
 *
 * 分类顺序有讲究：先看音频/视频，再看图片。
 * 头像也是 `<img>`，必须排除，否则每条系统提示都会被标成「[图片]」。
 */
const resolveMediaPlaceholder = (node: Element): string => {
  if (node.querySelector("audio")) return "[语音]";
  if (node.querySelector("video")) return "[视频]";

  const imgs = Array.from(node.querySelectorAll("img[src]"));
  const hasContentImage = imgs.some((img) => {
    const cls = img.className || "";
    if (/avatar|profile/i.test(cls)) return false;
    // 小图标（表情、状态角标）不算内容图
    const width = (img as HTMLImageElement).naturalWidth;
    return !(width > 0 && width <= 64);
  });

  return hasContentImage ? "[图片]" : "";
};

/**
 * 从 LinkedIn 的消息 id 里解出**真实发送时间**（毫秒）。
 *
 * 消息 id 形如 `2-<base64>`，base64 解开是
 *   `1791949307694b96450-100&340ed22d-...._100`
 * 开头那 13 位就是 epoch 毫秒（实测 1791949307694 ↔ 本地 11:41，与页面显示完全吻合）。
 *
 * 有了它就不用再靠「数节点位置」猜新消息了 —— 往上滚加载出来的历史消息
 * 时间戳远早于本次开始监听的时间，基类的时间闸门会直接挡掉。
 */
const sentAtMsFromMessageId = (id: string): number => {
  const hit = id.match(/^2-([A-Za-z0-9+/=_-]{12,})$/);
  const base64Part = hit?.[1];
  if (!base64Part) return 0;
  try {
    const decoded = atob(base64Part.replace(/-/g, "+").replace(/_/g, "/"));
    const ms = decoded.match(/^(\d{13})/);
    return ms ? Number(ms[1]) : 0;
  } catch {
    return 0;
  }
};

// ================================================================
// 稳定键（务必不要改，改了会让同一个人分裂成多条记录）
// ================================================================

/**
 * 客户在平台侧的**稳定** id。
 *
 * 为什么不用 thread id 也不用画像 id：
 * - thread id 在**会话列表 DOM 里根本不存在**（只有打开会话页时 URL 才有）；
 * - 画像 id（`/in/<id>`）只在**消息气泡**里有，列表里没有。
 * ⇒ 唯一「两条路线都拿得到」的字段是**客户名**，用它当键才能保证
 *   同一个客户不会因为走了不同路线而分裂成两条记录。
 */
export const makeCustomerKey = (name: string): string =>
  name ? `linkedin:name:${normName(name)}` : "";

/**
 * 会话在平台侧的**稳定** id。
 *
 * 为什么不用 thread id：LinkedIn 的 thread id 只出现在会话页 URL 里，
 * 会话列表 DOM 中根本没有（详见文件头注释）。若用 thread id 做会话键，
 * 同一个人会因「列表路线 / 会话页路线」不同而分裂出两个会话。
 * 一对一会话里「客户 ↔ 会话」本来就一一对应，用名字派生的键最稳且永不变。
 *
 * （真实 thread id 仍会记在监听器的 `#nameToId` 表里，将来要做
 *   「从聚合栏直接跳到对应会话」时可以直接取用。）
 */
export const makeConversationKey = (name: string): string =>
  name ? `linkedin:1v1:${normName(name)}` : "";

/**
 * 由「会话键 + 内容指纹」合成平台侧消息 id（列表路线拿不到真实 id 时的兜底）。
 *
 * ⚠️ 前缀 `linkedin:` 与整体格式**不能改**：库里的幂等靠
 * `UNIQUE(conversation_id, external_message_id)`，一旦格式变化，
 * 已存在的会话会重新插一遍，产生重复消息。
 */
export const makeSyntheticMessageId = (
  conversationExternalId: string,
  fingerprint: string,
): string => `linkedin:${conversationExternalId}:${shortHash(fingerprint)}`;

// ================================================================
// 监听器
// ================================================================

export interface ILinkedInWatcherOptions {
  /** 发现某个会话的内容发生变化时回调（首次基线扫描不会触发） */
  onNewMessage: (conversation: IWatchedConversation) => void;
  /** 是否输出调试日志 */
  debug?: boolean;
}

export class LinkedInMessageWatcher extends MessageWatcherBase {
  /** 名字 → thread id（学习所得，跨刷新保留） */
  #nameToId = new Map<string, string>();
  /**
   * 「我自己」的显示名集合。
   * 会话页里不带 `--other` 的气泡就是自己发的 —— 顺手把人名记下来，
   * 列表路线的 `名字: 正文` 前缀就能据此判断方向。
   */
  #selfNames = new Set<string>();
  /** 上一次会话列表用的选择器与命中条目数（仅用于空结果时的诊断） */
  #lastListSelector = "";
  #lastListItemCount = 0;
  /** DOM 转储节流 */
  #lastDumpAt = 0;

  constructor(options: ILinkedInWatcherOptions) {
    const baseOptions: IMessageWatcherOptions = {
      platform: "linkedin",
      logSource: "linkedin",
      // 重构前路线 A 的兜底名就是这个，保持原值以免派生键变化
      fallbackCustomerName: "LinkedIn 用户",
      ...options,
    };
    super(baseOptions);
    this.#loadNameMap();
  }

  // ---------------- 基类要求实现 ----------------

  protected isWatchablePage(): boolean {
    return /\/messaging/.test(location.pathname);
  }

  protected getActiveConversationId(): string {
    return location.pathname.match(THREAD_ID_RE)?.[1] || "";
  }

  protected beforeScan(): void {
    this.#learnActiveConversation();
  }

  /** 【路线 A】当前打开会话的消息列表 */
  protected parseMessageList(): IParsedMessage[] {
    const threadId = this.getActiveConversationId();
    if (!threadId) return [];

    const { elements: nodes } = queryFirstMatch(MESSAGE_ITEM_SELECTORS);
    if (nodes.length === 0) return [];

    const parsed: IParsedMessage[] = [];
    let carriedName = "";

    nodes.forEach((node) => {
      const isOther = /msg-s-event-listitem--other/.test(node.className || "");
      // 名字只在一条群组的首条出现，向下顺延
      const ownName = pickText(node, [".msg-s-message-group__name"]);
      if (ownName) carriedName = ownName;
      const name = ownName || carriedName;
      // 不带 `--other` 就是自己发的 ⇒ 记下自己的显示名
      if (!isOther && name) this.#selfNames.add(normName(name));

      let body = pickText(node, [".msg-s-event-listitem__body"]);
      // 客户发来的空正文＝图片/语音/文件/贴纸。
      // 基类会兜底成「[媒体消息]」，但能分得出来就分细一点，业务员看列表时更清楚。
      // ⚠️ 只做占位，**不取图片地址**：LinkedIn 的 CDN 地址带签名，几小时就过期，
      //    存下来也是死链。真要看图，点卡片切到平台网页即可。
      if (!body && isOther) {
        body = resolveMediaPlaceholder(node);
      }
      const timeText = pickText(node, [".msg-s-message-group__timestamp", "time"]);
      const avatar = pickAttr(node, "img", "src");
      const profileId = resolveProfileId(node);

      const { id, real } = resolveMessageId(
        node,
        `${threadId}|${name}|${timeText}|${body}`,
      );
      if (!id) return;

      parsed.push({
        messageId: id,
        isRealId: real,
        direction: isOther ? "incoming" : "outgoing",
        senderName: name,
        body,
        timeText,
        avatar,
        profileId: profileId || undefined,
        sentAtMs: sentAtMsFromMessageId(id),
      });
    });

    return parsed;
  }

  /** 【路线 B】会话列表快照 */
  protected parseConversationList(): Map<string, IWatchedConversation> {
    const { elements: items, selector } = queryFirstMatch(CONVO_ITEM_SELECTORS);
    this.#lastListSelector = selector;
    this.#lastListItemCount = items.length;

    const current = new Map<string, IWatchedConversation>();
    if (items.length === 0) return current;

    const openThreadId = this.getActiveConversationId();

    items.forEach((item) => {
      const root: Element =
        (item.closest?.("li") as Element | null) ??
        (item.parentElement as Element | null) ??
        item;

      const timeText = pickText(root, TIME_SELECTORS);
      let customerName = pickText(root, NAME_SELECTORS);
      if (timeText && customerName.endsWith(timeText)) {
        customerName = customerName.slice(0, -timeText.length).trim();
      }
      if (!customerName) customerName = pickAttr(root, "img[alt]", "alt");

      const isActive = /convo-item-link--active/.test(
        `${item.className} ${root.innerHTML.slice(0, 400)}`,
      );

      let conversationExternalId = resolveThreadIdFromDom(item);
      if (!conversationExternalId) {
        conversationExternalId = this.#nameToId.get(normName(customerName)) || "";
      }
      // 当前打开的那条：URL 就是权威 id
      if (!conversationExternalId && isActive && openThreadId) {
        conversationExternalId = openThreadId;
      }

      if (conversationExternalId) this.#learn(customerName, conversationExternalId);

      const preview = pickText(root, PREVIEW_SELECTORS);
      const avatar = pickAttr(root, "img[src]", "src");

      // 预览形如 "Eric: nice to meet" ⇒ 拆出发送者与真实正文
      const { sender, content } = splitPreviewSender(preview);
      const senderIsMe = sender ? this.#selfNames.has(normName(sender)) : false;

      let unreadCount = 0;
      for (const selector of UNREAD_SELECTORS) {
        let badge: Element | null = null;
        try {
          badge = root.querySelector(selector);
        } catch {
          continue;
        }
        if (!badge) continue;
        // `--unread` 这类修饰类没有数字，存在即未读
        const parsedCount = Number.parseInt(badge.textContent?.trim() || "", 10);
        unreadCount = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
        break;
      }
      if (unreadCount === 0 && /unread/i.test(`${root.className} ${item.className}`)) {
        unreadCount = 1;
      }

      // 没有 id 就用「名字归一化」当键：只用来驱动「有未读」的提醒，不产消息
      const key = conversationExternalId || `name:${normName(customerName)}`;
      if (!key || key === "name:") return;

      current.set(key, {
        conversationExternalId,
        customerName,
        customerAvatar: avatar,
        preview: content,
        unreadCount,
        // 指纹里带上正文/时间/未读/发送者，任一项变都说明这条会话有新动静
        fingerprint: `${content}|${timeText}|${unreadCount}|${sender}`,
        // 列表路线没有真实消息 id，交给宿主合成
        direction: senderIsMe ? "outgoing" : "incoming",
        timeText,
      });
    });

    return current;
  }

  /**
   * 命中条目却一条都解析不出 —— 只在真的选到条目时诊断 + 转储，
   * 否则「页面上压根没有会话列表」会反复刷日志。
   */
  protected onEmptyConversationList(_detail: string): void {
    if (this.#lastListItemCount === 0) return;
    this.diagnose(
      "选到条目但一条都解析不出",
      `selector=${this.#lastListSelector} 条目数=${this.#lastListItemCount}`,
    );
    this.#dumpDom();
  }

  /** 只在真正上报时学一次「名字 → thread id」，供路线 B 兜底 */
  protected onMessageReported(message: IParsedMessage, conversationId: string): void {
    if (!message.senderName) return;
    this.#learn(message.senderName, conversationId);
  }

  // ---------------- 名字 → 会话 id 学习（跨刷新持久化） ----------------

  /** 把列表里 `--active` 的那条与 URL 的 thread id 对应起来 */
  #learnActiveConversation() {
    const threadId = this.getActiveConversationId();
    if (!threadId) return;

    const active = document.querySelector(
      ".msg-conversations-container__convo-item-link--active",
    );
    if (!active) return;
    const root: Element =
      (active.closest?.("li") as Element | null) ??
      (active.closest?.(".msg-conversations-container__convo-item") as Element | null) ??
      active;

    const timeText = pickText(root, TIME_SELECTORS);
    let name = pickText(root, NAME_SELECTORS);
    if (timeText && name.endsWith(timeText)) {
      name = name.slice(0, -timeText.length).trim();
    }
    if (!name) name = pickAttr(root, "img[alt]", "alt");
    if (!name) return;

    this.#learn(name, threadId);
  }

  #learn(name: string, threadId: string) {
    if (!name || !threadId) return;
    const key = normName(name);
    if (!key) return;
    if (this.#nameToId.get(key) === threadId) return;
    this.#nameToId.set(key, threadId);
    this.#saveNameMap();
  }

  #loadNameMap() {
    try {
      const raw = localStorage.getItem(NAME_MAP_STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, string>;
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === "string" && value) this.#nameToId.set(key, value);
      });
    } catch {
      /* localStorage 不可用时静默降级 */
    }
  }

  #saveNameMap() {
    try {
      localStorage.setItem(
        NAME_MAP_STORAGE_KEY,
        JSON.stringify(Object.fromEntries(this.#nameToId)),
      );
    } catch {
      /* 配额满 / 禁用时忽略 */
    }
  }

  // ---------------- 诊断转储 ----------------

  /** 把真实 DOM 结构转储到日志（20 秒最多一次） */
  #dumpDom() {
    const now = Date.now();
    if (now - this.#lastDumpAt < 20000) return;
    this.#lastDumpAt = now;

    const item =
      document.querySelector('[class*="msg-conversation-listitem"]') ??
      document.querySelector('[class*="convo-item"]');
    const itemHtml = (item?.outerHTML || "(未找到条目)")
      .replace(/\s+/g, " ")
      .slice(0, 900);

    const counts = [
      `a[href*=thread]=${document.querySelectorAll('a[href*="/messaging/thread/"]').length}`,
      `listitem=${document.querySelectorAll('[class*="msg-conversation-listitem"]').length}`,
      `msg-item=${document.querySelectorAll(".msg-s-event-listitem").length}`,
    ].join(" ");

    this.log(`DOM转储 pathname=${location.pathname} ${counts}`);
    this.log(`DOM转储 已学习名字→id: ${this.#nameToId.size} 组`);
    this.log(`DOM转储 首条会话HTML: ${itemHtml}`);
  }
}

export type { IWatchedConversation } from "../engine/MessageWatcherBase.ts";
