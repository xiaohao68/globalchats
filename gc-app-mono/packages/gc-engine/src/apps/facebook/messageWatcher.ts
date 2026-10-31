import {
  MessageWatcherBase,
  normName,
  pickAttr,
  queryFirstMatch,
  shortHash,
  type IParsedMessage,
  type IMessageWatcherOptions,
  type IWatchedConversation,
} from "../engine/MessageWatcherBase.ts";

/**
 * Facebook 消息监听器（平台薄壳）
 * ============================================================
 * 骨架（生命周期 / 基线 / 去重 / 上报判定 / 诊断）全在
 * `../engine/MessageWatcherBase.ts`；本文件只负责「怎么从 Facebook 的 DOM 里把数据抠出来」。
 *
 * ── 铁律：一个哈希 class 都不用 ────────────────────────────────
 * Facebook 的 class（`x1lliihq x193iq5w x6ikm8r x10wlt62 …`）是**编译期哈希**，
 * 每次改版都换一批，而且**同一个 class 串会同时出现在会话列表和消息气泡上**
 * （实测截图里会话行的名字块与消息正文块外层都是
 *  `div.html-div.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.x18d9i69.x1c1uobl`），
 * 所以 class 既不稳定、也没有区分度。本文件只锚定三类稳定信号：
 *
 *   ① **href 里的 thread id** —— `/messages/t/<数字>/`
 *      Meta 靠它做前端路由，删了会话列表就点不动了 ⇒ 最稳。
 *   ② **无障碍语义属性** —— `role="grid" / "row" / "gridcell"`、
 *      `data-pagelet="MWThreadListContent"`、`aria-label`
 *      删了读屏器就瞎了 ⇒ 比 class 稳得多。
 *   ③ **结构启发式** —— 「行根下第一个文本叶子＝客户名，第二个＝消息预览」。
 *      Meta 的文本一律渲染成两层 span（外层 `span[dir="auto"]`，
 *      内层 `span.x1lliihq.x6ikm8r…`），所以「无子元素 span」就是文本叶子的通用特征。
 *
 * ── 两条路线 ──────────────────────────────────────────────────
 *
 * 【路线 A · 主力】当前打开的会话（`/messages/t/<threadId>/`）
 *   - **会话 id 直接来自 URL**（`facebookSDK.currentChatUserId` 用的同一个正则）
 *   - 消息正文＝消息区里的叶子 span；方向靠「我方气泡靠右（flex-end）/ 白字」
 *     与「对方气泡带头像」判断
 *   - ⚠️ 消息区里**没有客户名**，得从「会话列表里指向本 thread 的那一行」学，
 *     退而求其次用 `document.title` / 会话头部标题。三处都学不到就**放弃路线 A**
 *     （`getActiveConversationId()` 返回空串），让路线 B 接手 ——
 *     否则所有学不到名字的客户会被兜底名合并成同一条客户记录。详见该方法注释。
 *
 * 【路线 B · 辅助】会话列表（`data-pagelet="MWThreadListContent"`）
 *   - 先按 `a[href*="/messages/t/"]` 锚点找行（拿到真实 thread id），
 *     锚点不存在才退到「语义容器 + role=row + 结构启发式」
 *   - 未读判定：`aria-label` 命中 → 未读；否则看名称/预览的**字重**（未读会话加粗）
 *
 * ⚠️ 客户 / 会话的**持久化键沿用「客户名派生」**（与 LinkedIn 一致）：
 *    `facebook:name:<归一化名>` / `facebook:1v1:<归一化名>`。
 *    原因：两条路线能同时拿到的字段只有客户名；若用 thread id 做键，
 *    「列表路线拿不到 href」的那些会话会分裂成两条记录。
 *    thread id 仍然会被学下来（`#nameToThreadId`），将来做「点聚合栏跳到会话」时直接用。
 */

// ================================================================
// 选择器与常量
// ================================================================

/** 会话列表根容器候选（语义属性；`data-pagelet` 是 Meta 自有标记，比 class 稳） */
const CHAT_LIST_ROOT_SELECTORS = [
  '[data-pagelet="MWThreadListContent"]',
  '[data-pagelet*="ThreadList"]',
  '[role="complementary"] [role="grid"]',
  '[role="tabpanel"] [role="grid"]',
  '[role="grid"]',
];

/** 会话列表行候选（容器法兜底时用） */
const CHAT_ROW_SELECTORS = ['[role="row"]', '[role="listitem"]', '[role="gridcell"]'];

/**
 * 消息区根容器候选（**顺序即优先级**）。
 *
 * 前两个来自 2026-10-15 探针实采：真实 DOM 是
 * `div[role=main] > div[data-pagelet=MWInboxDetail] > … > div[data-pagelet=MWInboxDetail_MessageList]`。
 * `data-pagelet` 是 Meta 自己的区块标记（删了它内部监控/埋点就断），比 class 稳得多。
 */
const MESSAGE_AREA_SELECTORS = [
  '[data-pagelet*="MWInboxDetail_MessageList"]',
  '[data-pagelet*="InboxDetail_MessageList"]',
  '[data-pagelet="MWInboxDetail"]',
  '[data-pagelet*="MessageList"]',
  '[role="main"] [role="log"]',
  '[role="main"]',
];

/**
 * **单条消息行的锚点**（探针实测 `data-pagelet="MWMessageRow"` ×6，与屏幕上 6 条消息一一对应）。
 *
 * 这是路线 A 最硬的抓手：不用再靠「叶子 span 往上爬树」猜哪一层是消息行，
 * 直接拿 Meta 标好的行。方向判定、头像提取都在这一层做。
 */
const MESSAGE_ROW_SELECTOR = '[data-pagelet="MWMessageRow"]';

/** 会话头部区块（用来学「当前会话的客户名」，见 `learnNameFromArea`） */
const INBOX_DETAIL_SELECTOR = '[data-pagelet="MWInboxDetail"]';

/** 会话头部标题文本：`与Eric Kulon的对话` */
const CONV_TITLE_RE = /^与\s*(.+?)\s*的对话(?:中的消息)?$/;

/** 会话头部按钮的 aria-label：`Eric Kulon的更多选项` */
const CONV_MORE_OPTIONS_RE = /^(.+?)\s*的更多选项$/;

/**
 * 会话页 URL 里的 thread id。
 *
 * ⚠️ **实测有两种形态**（2026-10-15 用探针采到真实 URL）：
 *   · 普通会话：`/messages/t/<数字>/`
 *   · **E2EE 加密会话：`/messages/e2ee/t/<数字>/`** ← 老板当前打开的正是这一种
 * 只写 `/messages/t/` 会让 E2EE 会话**整条路线 A 被静默跳过**
 * （现象＝监听器起来了、基线也建了，但当前会话的消息一条都收不到）。
 */
const THREAD_ID_RE = /\/messages\/(?:e2ee\/)?t\/(\d+)/;

/**
 * 会话行链接锚点。
 *
 * 同上：E2EE 会话的 href 形如 `/messages/e2ee/t/<id>/`，字符串里**不包含**
 * `/messages/t/` 这个子串 —— 单写 `/messages/t/` 时锚点法全军覆没，
 * 只能退到结构启发式，容易选错容器（实测退到了右侧「聊天信息」侧栏）。
 */
const THREAD_ANCHOR_SELECTOR = 'a[href*="/messages/e2ee/t/"], a[href*="/messages/t/"]';

/** 「叶子 span」选择器：Meta 的文本一律落在无子元素的 span 上 */
const TEXT_LEAF_SELECTOR = 'span[dir="auto"], span, div';

/**
 * 不该被当正文的界面文案 / 时间分隔。
 *
 * 刻意只放「形状独特」的词：如果客户真发来一句 `Aa` 或 `你`，误过滤的代价
 * 比漏过滤一条界面文案大得多（界面文案只是噪音，客户消息漏了就是漏了）。
 */
const UI_TEXT_RE =
  /^(Aa|Enter|回车|查看更多|查看全部|See more|See all|输入消息|Type a message|按 Enter 键发送|Press Enter to send|星期[一二三四五六日天]|周[一二三四五六日天]|昨天|今天|Yest?erday|Today|Mon(day)?|Tue(sday)?|Wed(nesday)?|Thu(rsday)?|Fri(day)?|Sat(urday)?|Sun(day)?|\d{1,2}:\d{2}(:\d{2})?|\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}(\/\d{2,4})?)$/i;

/** 端到端加密等系统提示（FB 每次开新会话都会插一条） */
const SYSTEM_HINT_RE =
  /端到端加密|end-to-end encrypted|已开启加密|加密聊天|消息丢失|message unavailable|无法获取此消息/i;

/**
 * ⭐ Meta 的无障碍描述模板 —— **2026-10-15 探针实采的最大发现**。
 *
 * 每条 `MWMessageRow` 里都有一个文本叶子，前半段是 Meta 为读屏器生成的元信息，
 * **正文紧跟在最后一个全角冒号之后**：
 *   · `Enter，消息由Eric发送于16:25：1`                    ← 今天的消息：只有时间
 *   · `Enter，消息由你发送于2026年10月15日 16:27：你好啊？` ← **不是今天的：时间前面多一段日期**
 *   · `Enter，消息由Eric Kulon发送于周四18:01：123156`     ← 本周内的：日期写作「周四」
 *   · `Enter，消息丢失。`                                  ← 系统提示（无「消息由…发送于…」段）
 *
 * ⚠️⚠️ **踩过的坑（2026-10-16 真事故）**：原来的时间部分写死成 `\d{1,2}:\d{2}`，
 * 只认纯时间；**一旦 Meta 在时间前塞了日期（非今天的消息就是这样），整段正则直接失配** ⇒
 *   ① 正文清洗失效：界面显示成 `消息由你发送于2026年10月15日 16:27：你好啊？`；
 *   ② **方向判定退化成猜** —— 而几何判定当时也刚好失效（见 `resolveDirection` 的说明），
 *      结果是**我方发出的消息被当成客户来信入库**（库里真的出现了这条脏数据）。
 * 所以时间部分必须写成「任意短前缀 + `H:MM`」，前缀里放得下 `2026年10月15日` / `周四` / 空。
 *
 * 捕获组：① 发送者 ② 日期前缀（可能为空）③ 时间 ④ 正文
 *
 * ⚠️ 正文本身以 `Enter` 开头也安全：正则锚定的是整段模板，不是单独的前缀词。
 */
const META_TEXT_RE =
  /^(?:Enter[，,]\s*)?消息由\s*(.+?)\s*发送于\s*(.*?)\s*([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)\s*[：:]\s*([\s\S]*)$/;

/** 只带 `Enter，` 前缀、后面没接「消息由…发送于…」的（如 `Enter，消息丢失。`） */
const META_LEAD_RE = /^(?:Enter[，,]\s*)+/;

/** 「自己」在 Meta 描述里的几种写法（`消息由你发送于…` / `消息由You发送于…`） */
const SELF_SENDER_RE = /^(你|您|我|自己|本人|You|you|Me|me)$/;

/**
 * 清洗一条消息行的原始文本：
 * 剥掉 Meta 的无障碍元信息前缀，返回**纯正文** + 顺带抠出的发送者与时间。
 */
interface ICleanedBody {
  /** 真正的消息正文 */
  body: string;
  /** Meta 写明的发送者（空串＝这条没有元信息段） */
  sender: string;
  /** Meta 写明的逐条时间（`16:25`，空串＝没拿到） */
  time: string;
  /**
   * Meta 写在时间前面的日期段（`2026年10月15日` / `周四` / 空串）。
   * 目前**只用于诊断日志**，没有转成 sentAt —— 见下面 `#parseRows` 里 sentAtMs 的说明。
   */
  dateText: string;
}

function cleanBody(raw: string): ICleanedBody {
  const text = (raw || "").trim();
  const hit = text.match(META_TEXT_RE);
  if (hit) {
    return {
      body: (hit[4] || "").trim(),
      sender: (hit[1] || "").trim(),
      time: (hit[3] || "").trim(),
      dateText: (hit[2] || "").trim(),
    };
  }
  // 没匹配上完整模板，但仍有 `Enter，` 前缀的（系统提示类）——只剥前缀
  return { body: text.replace(META_LEAD_RE, "").trim(), sender: "", time: "", dateText: "" };
}

/** 时间文本形状（会话列表预览的尾部 `· 6分钟`） */
const TIME_LIKE_RE =
  /^(\d+\s*(分钟|小时|天|分|min|mins|m|h|d|hour|hours|day|days)|刚刚|now|昨天|今天|yesterday|today|星期[一二三四五六日天]|周[一二三四五六日天]|\d{1,2}:\d{2}(:\d{2})?|\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}(\/\d{2,4})?)$/i;

/** 名字 → thread id 的学习结果落盘键（跨刷新保留） */
const NAME_MAP_STORAGE_KEY = "gc:facebook:nameToThreadId";

/** 单行文本超过这个长度就不像「会话名 / 预览」了，当噪音丢掉 */
const MAX_ROW_TEXT = 240;

// ================================================================
// DOM 解析小工具
// ================================================================

/** 取「文本叶子」：无子元素且文本非空的 span/div，按文档顺序 */
function textLeaves(root: Element, limit = 8): Element[] {
  const out: Element[] = [];
  let nodes: Element[] = [];
  try {
    nodes = Array.from(root.querySelectorAll(TEXT_LEAF_SELECTOR));
  } catch {
    return out;
  }
  for (const el of nodes) {
    if (el.childElementCount > 0) continue; // 只取最内层，避免同一段文字被数两次
    const text = (el.textContent || "").trim();
    if (!text) continue;
    out.push(el);
    if (out.length >= limit) break;
  }
  return out;
}

const textOf = (el: Element | null): string => (el?.textContent || "").trim();

/** 字重缓存：getComputedStyle 不便宜，同一节点只算一次 */
const weightCache = new WeakMap<Element, number>();

function fontWeightOf(el: Element | null): number {
  if (!el) return 400;
  const cached = weightCache.get(el);
  if (cached !== undefined) return cached;
  let weight = 400;
  try {
    const raw = getComputedStyle(el).fontWeight || "";
    const parsed = Number.parseInt(raw, 10);
    weight = Number.isFinite(parsed) && parsed > 0 ? parsed : /bold/i.test(raw) ? 700 : 400;
  } catch {
    /* 元素已脱离文档时忽略 */
  }
  weightCache.set(el, weight);
  return weight;
}

/** 文字颜色是否接近白色（我方气泡是白字蓝底） */
function looksWhiteText(el: Element | null): boolean {
  if (!el) return false;
  try {
    const raw = getComputedStyle(el).color || "";
    const hit = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!hit) return false;
    const [r, g, b] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
    return r > 235 && g > 235 && b > 235;
  } catch {
    return false;
  }
}

/** 头像：行内第一张「不像表情 / 小图标」的图片 */
function pickAvatar(root: Element): string {
  let imgs: Element[] = [];
  try {
    imgs = Array.from(root.querySelectorAll("img[src]"));
  } catch {
    return "";
  }
  for (const img of imgs) {
    const src = img.getAttribute("src") || "";
    if (!src || /emoji|\.gif|^data:/i.test(src)) continue;
    const width = (img as HTMLImageElement).naturalWidth || 0;
    if (width && width < 24) continue; // 未读点、表情小图
    return src;
  }
  return "";
}

/** 「恰好承载一条会话」的行根：取最近的 role=row，但拒绝包含多条会话的容器行 */
function pickRowRoot(anchor: Element): Element {
  const row = anchor.closest('[role="row"]');
  if (row) {
    const text = textOf(row);
    let anchors = 0;
    try {
      anchors = row.querySelectorAll(THREAD_ANCHOR_SELECTOR).length;
    } catch {
      anchors = 1;
    }
    if (text.length <= MAX_ROW_TEXT && anchors <= 1) return row;
  }
  return anchor;
}

/** 按 thread id 找到它在会话列表里的那一行（用来学「当前会话的客户名」） */
function findRowByThreadId(threadId: string): Element | null {
  if (!threadId) return null;
  let anchor: Element | null = null;
  try {
    // 两种 href 形态都要试（E2EE 会话走 `/messages/e2ee/t/<id>/`）
    anchor = document.querySelector(
      `a[href*="/messages/e2ee/t/${threadId}"], a[href*="/messages/t/${threadId}"]`,
    );
  } catch {
    return null;
  }
  return anchor ? pickRowRoot(anchor) : null;
}

/**
 * 解析会话列表行。
 *
 * 优先「锚点法」（直接从 `a[href*="/messages/t/<id>"]` 反推行根）——
 * 只要 Meta 还保留前端路由链接，这条路就永远成立；
 * 锚点全部落空时才退到「语义容器 + role=row」的结构法。
 */
function resolveListRows(): { rows: Element[]; via: string } {
  const anchors: Element[] = [];
  try {
    document.querySelectorAll(THREAD_ANCHOR_SELECTOR).forEach((a) => anchors.push(a));
  } catch {
    /* ignore */
  }

  if (anchors.length > 0) {
    const rows: Element[] = [];
    const seen = new Set<Element>();
    for (const a of anchors) {
      const row = pickRowRoot(a);
      if (row && !seen.has(row)) {
        seen.add(row);
        rows.push(row);
      }
    }
    if (rows.length > 0) return { rows, via: "anchor" };
  }

  // 容器法：语义容器 → role=row（去掉被其它 row 包住的嵌套行）
  const { elements: roots, selector } = queryFirstMatch(CHAT_LIST_ROOT_SELECTORS);
  for (const root of roots) {
    for (const rowSelector of CHAT_ROW_SELECTORS) {
      const found = Array.from(root.querySelectorAll(rowSelector)).filter(
        (el) => !el.parentElement?.closest(rowSelector),
      );
      const usable = found.filter((el) => {
        const text = textOf(el);
        return text.length > 0 && text.length <= MAX_ROW_TEXT && textLeaves(el, 3).length > 0;
      });
      if (usable.length > 0) return { rows: usable, via: `container:${selector}>${rowSelector}` };
    }
  }

  return { rows: [], via: "" };
}

/**
 * 拆会话列表预览。
 *
 * Facebook 的预览是「正文 · 时间」（如 `123 · 6分钟`，英文 `123 · 6m`），
 * 我方发出的会在前面加「你: 」/「You: 」——正好用来判方向。
 * 时间那里**加了形状校验**，避免把正文里本来就有的 `·` 误当分隔符。
 */
function splitPreview(raw: string): { senderIsMe: boolean; content: string; timeText: string } {
  let text = raw.trim();
  let timeText = "";

  const hit = text.match(/^([\s\S]+?)\s*[·•・│]\s*([^·•・│]{1,16})$/);
  const head = hit?.[1]?.trim() ?? "";
  const tail = hit?.[2]?.trim() ?? "";
  if (head && tail && TIME_LIKE_RE.test(tail)) {
    text = head;
    timeText = tail;
  }

  const mine = text.match(/^(你|You|我)\s*[:：]\s*([\s\S]+)$/i);
  if (mine?.[2]) return { senderIsMe: true, content: mine[2].trim(), timeText };

  return { senderIsMe: false, content: text, timeText };
}

/** 把「6分钟前」这类相对时间折算成毫秒时间戳（解不出返回 0） */
function parseTimeText(text: string): number {
  const raw = text.trim();
  if (!raw) return 0;
  const now = Date.now();
  if (/^(刚刚|now)$/i.test(raw)) return now;
  if (/^(昨天|yesterday)$/i.test(raw)) return now - 86_400_000;
  if (/^(今天|today)$/i.test(raw)) return now;

  let hit = raw.match(/^(\d+)\s*(分钟|分|min|mins|m)$/i);
  if (hit) return now - Number(hit[1]) * 60_000;
  hit = raw.match(/^(\d+)\s*(小时|时|hour|hours|h)$/i);
  if (hit) return now - Number(hit[1]) * 3_600_000;
  hit = raw.match(/^(\d+)\s*(天|day|days|d)$/i);
  if (hit) return now - Number(hit[1]) * 86_400_000;
  return 0;
}

/** 未读判定：语义属性优先，其次看字重（FB 把未读会话的名称/预览加粗） */
function detectUnread(
  row: Element,
  nameEl: Element | null,
  previewEl: Element | null,
): number {
  try {
    if (row.querySelector('[aria-label*="未读"], [aria-label*="unread" i], [aria-label*="新消息"]')) {
      return 1;
    }
  } catch {
    /* ignore */
  }
  if (fontWeightOf(previewEl) >= 600) return 1;
  if (fontWeightOf(nameEl) >= 600) return 1;
  return 0;
}

/**
 * 消息方向判定 —— **兜底路径**。
 *
 * ⚠️ 注意这不是主判据：消息行里能读到 Meta 无障碍元信息时（`消息由xxx发送于…`），
 * 调用方**直接采信里面的发送者**（`via = "meta-sender"`，见各 route 的解析处），
 * 根本不会走到这里。只有在拿不到那段元信息时（普通非加密会话）才调用本函数。
 *
 * ⚠️ **为什么不能只靠「白字」**：老板当前用的是 FB 的**紫色渐变主题**
 * （`--chat-outgoing-message-background-gradient: linear-gradient(#aa00ff, #0070f6)`），
 * 整个消息区都是紫底，**双方消息的文字都接近白色** ——
 * 只按颜色判会把客户来信误判成「我方发出」而**整条漏掉**（比入库脏数据严重得多）。
 * 这个渐变是 **Facebook 账号自己的主题设置**，不是我们注入的样式（preload 从不注入 CSS）。
 *
 * 所以按「可靠性」排序：
 *   ① **几何对齐**：文本重心相对消息行偏右 ⇒ 我方（FB 用 flex 把己方气泡推到最右）。
 *      与主题配色无关，最稳，且不受 class 改版影响。
 *   ② **带头像** ⇒ 对方发来的（我方消息从来不给自己放头像）。
 *   ③ 白字（辅助信号，浅色主题下有效 —— 上面那个紫渐变主题下基本失效）。
 *   ④ 祖先链上的 flex-end。
 * 全部落空时**保守当作对方来信** —— 宁可多入库几条自己发的话，
 * 也绝不能把客户来信判成 outgoing 而丢掉。
 */
function resolveDirection(row: Element): { direction: "incoming" | "outgoing"; via: string } {
  const leaf = textLeaves(row, 1)[0] ?? null;

  // ① 几何对齐（主判据）
  if (leaf) {
    try {
      const lr = leaf.getBoundingClientRect();
      const rr = row.getBoundingClientRect();
      if (rr.width > 80 && lr.width > 0) {
        const leftGap = lr.left - rr.left;
        const rightGap = rr.right - lr.right;
        // ⚠️ 只在「有一侧明显留白」时才敢用几何判据（`maxGap > 40`）。
        //    两边都接近 0 说明这条消息占满整行，此时 1px 的取整误差就能翻转结论。
        // ⚠️⚠️ **不要再加 `gap >= 0` 这种守卫** —— 2026-10-16 真事故就是这么来的：
        //    实测 `文本左距1211 文本右距-1`，那个 `-1` 只是取整误差，
        //    却被 `rightGap >= 0` 挡掉，几何判定整条跳过 → 落到底部兜底
        //    → **我方发出的消息被判成客户来信入库**。
        //    改成比「大小关系」而不是比「正负」，1px 的误差就翻不动结论了。
        const maxGap = Math.max(leftGap, rightGap);
        if (maxGap > 40) {
          if (rightGap < leftGap * 0.6) {
            return { direction: "outgoing", via: "geom-right" };
          }
          if (leftGap < rightGap * 0.6) {
            return { direction: "incoming", via: "geom-left" };
          }
        }
      }
    } catch {
      /* 元素脱离文档时忽略 */
    }
  }

  // ② 带头像 ⇒ 对方发来的
  if (pickAvatar(row)) return { direction: "incoming", via: "avatar" };

  // ③ 白字（我方气泡的配色，浅色主题下才有区分度）
  if (looksWhiteText(leaf ?? row)) return { direction: "outgoing", via: "white-text" };

  // ④ 祖先链上的 flex-end 对齐
  let current: Element | null = row;
  for (let depth = 0; depth < 8 && current; depth += 1, current = current.parentElement) {
    const inline = current.getAttribute("style") || "";
    if (/justify-content:\s*(flex-end|end)/.test(inline)) {
      return { direction: "outgoing", via: "inline-flex-end" };
    }
    try {
      const justify = getComputedStyle(current).justifyContent || "";
      if (/flex-end|end$/.test(justify)) return { direction: "outgoing", via: "computed-flex-end" };
    } catch {
      /* ignore */
    }
  }

  return { direction: "incoming", via: "fallback" };
}

/**
 * 把文本叶子往上爬到「消息行」：找到第一个「父节点下还有兄弟行」的祖先，
 * 用于取头像 / 判方向。
 *
 * 仅在拿不到 `data-pagelet="MWMessageRow"` 的兜底路径上使用。
 */
function climbToMessageRow(leaf: Element, area: Element): Element {
  let current: Element = leaf;
  for (let depth = 0; depth < 10; depth += 1) {
    const parent = current.parentElement;
    if (!parent || parent === area) break;
    // 找到「兄弟行」层级：父节点下还有至少两个同标签的兄弟 ⇒ 当前节点就是一行
    if (parent.childElementCount >= 2) {
      const sameShape = Array.from(parent.children).filter(
        (child) => child.tagName === current.tagName,
      ).length;
      if (sameShape >= 2) return current;
    }
    current = parent;
  }
  return leaf;
}

/**
 * **路线 A 的客户名来源 —— 就在消息区自己身上**（本轮探针最大的发现）。
 *
 * 实测会话头部有这些语义文本（全是 Meta 为读屏器留的，比 class 稳得多）：
 *   · 消息列表容器 `aria-label="与Eric Kulon的对话中的消息"`
 *   · 头部标题      `h3` 文本 = `与Eric Kulon的对话`
 *   · 头部按钮      `aria-label="Eric Kulon的更多选项"`
 *
 * 以前只能「去会话列表里找指向本 thread 的那一行」学名字，链路长、还依赖
 * 列表已渲染（E2EE 会话的 href 一变就彻底断了）。现在就地拿，拿不到才回退旧链路。
 */
function learnNameFromArea(area: Element | null): string {
  const scopes: Element[] = [];
  if (area) scopes.push(area);
  try {
    const detail = document.querySelector(INBOX_DETAIL_SELECTOR);
    if (detail && detail !== area) scopes.push(detail);
  } catch {
    /* ignore */
  }
  if (scopes.length === 0) return "";

  // ① `aria-label`：`与XXX的对话中的消息` / `与XXX的对话` / `XXX的更多选项`
  for (const scope of scopes) {
    let labels: Element[] = [];
    try {
      labels = Array.from(scope.querySelectorAll("[aria-label]"));
    } catch {
      continue;
    }
    for (const el of labels) {
      const label = (el.getAttribute("aria-label") || "").trim();
      const hit = label.match(CONV_TITLE_RE) || label.match(CONV_MORE_OPTIONS_RE);
      if (hit?.[1]) return hit[1].trim();
    }
  }

  // ② 头部标题（`与XXX的对话`）
  for (const scope of scopes) {
    let heads: Element[] = [];
    try {
      heads = Array.from(scope.querySelectorAll('h1, h2, h3, h4, [role="heading"]'));
    } catch {
      continue;
    }
    for (const el of heads) {
      const hit = textOf(el).match(CONV_TITLE_RE);
      if (hit?.[1]) return hit[1].trim();
    }
  }

  return "";
}

/**
 * 从一条消息行里抠出正文。
 *
 * FB 把文本渲染成两层 span（外层 `span[dir="auto"]`，内层无子元素的 span），
 * 所以「无子元素的 span」就是文本叶子。一行里可能有多个（多段消息 / 表情），
 * 用空格拼起来；界面噪音（时间、按钮文案、系统提示）在这里挡掉。
 */
function extractBody(row: Element): string {
  const parts: string[] = [];
  let leaves: Element[] = [];
  try {
    leaves = Array.from(row.querySelectorAll('span[dir="auto"]'));
  } catch {
    return "";
  }
  for (const el of leaves) {
    if (el.childElementCount > 0) continue;
    const text = textOf(el);
    if (!text) continue;
    if (UI_TEXT_RE.test(text)) continue;
    if (SYSTEM_HINT_RE.test(text)) continue;
    parts.push(text);
  }
  return parts.join(" ").trim();
}

/** 行内的时间文本（`16:25` / `6分钟前`）；FB 有时把它放在气泡外，取不到就留空 */
function extractRowTime(row: Element): string {
  const hit = textLeaves(row, 6)
    .map(textOf)
    .find((text) => TIME_LIKE_RE.test(text));
  return (hit || "").trim();
}

// ================================================================
// 稳定键（⚠️ 不要改：改了会让同一个人分裂成多条客户 / 会话）
// ================================================================

/**
 * 客户在平台侧的稳定 id。
 *
 * 与 LinkedIn 同源的理由：两条路线（当前会话页 / 会话列表）能同时拿到的字段
 * **只有客户名**；thread id 在「列表行没带 href」时会缺，任何更"真实"的 id
 * 都会因为覆盖面不同而把同一个人拆成两条记录（LinkedIn 实测踩过）。
 */
export const makeCustomerKey = (name: string): string =>
  name ? `facebook:name:${normName(name)}` : "";

/** 会话在平台侧的稳定 id（一对一会话里客户 ↔ 会话一一对应） */
export const makeConversationKey = (name: string): string =>
  name ? `facebook:1v1:${normName(name)}` : "";

/**
 * 由「会话键 + 内容指纹」合成平台侧消息 id（拿不到真实 id 时的兜底）。
 *
 * ⚠️ 前缀 `facebook:` 与整体格式不能改：落库幂等靠
 * `UNIQUE(conversation_id, external_message_id)`，格式一变已有会话会重复插一遍。
 */
export const makeSyntheticMessageId = (
  conversationExternalId: string,
  fingerprint: string,
): string => `facebook:${conversationExternalId}:${shortHash(fingerprint)}`;

// ================================================================
// 监听器
// ================================================================

export interface IFacebookWatcherOptions {
  /** 发现某个会话出现新消息时回调（首次基线扫描不会触发） */
  onNewMessage: (conversation: IWatchedConversation) => void;
  /** 是否输出调试日志 */
  debug?: boolean;
}

export class FacebookMessageWatcher extends MessageWatcherBase {
  /** 名字 → thread id（学习所得，跨刷新保留，供将来「跳到会话」用） */
  #nameToThreadId = new Map<string, string>();
  /** 当前打开的会话的客户名（路线 A 的消息要挂到这个名字上） */
  #activeThreadName = "";
  /** 上一次列表解析走的是哪条路（仅诊断用） */
  #lastListVia = "";
  #lastListCount = 0;
  /** 方向判定的命中方式（仅诊断用） */
  #lastDirectionVia = "";
  /** DOM 诊断节流 */
  #lastDiagAt = 0;
  /** 路线 A 是否已经打印过「本会话一条消息都没解析出来」的转储 */
  #dumpedMessageArea = false;
  /** 是否已经转储过真实消息行结构（一次性，用来核对方向判定） */
  #dumpedRows = false;

  constructor(options: IFacebookWatcherOptions) {
    const baseOptions: IMessageWatcherOptions = {
      platform: "facebook",
      logSource: "facebook",
      // 路线 A 拿不到客户名时的兜底（与 LinkedIn 的 "LinkedIn 用户" 同构）
      fallbackCustomerName: "Facebook 用户",
      ...options,
    };
    super(baseOptions);
    this.#loadNameMap();
  }

  // ---------------- 基类要求实现 ----------------

  protected isWatchablePage(): boolean {
    return /\/messages/.test(location.pathname);
  }

  /**
   * 当前打开的会话 id = URL 里的 thread id。
   *
   * ⚠️ **只有「客户名已经学到」时才返回 id**，否则返回空串。这不是洁癖，是安全闸：
   *   · 路线 A 的消息区里没有客户名，拿不到名字就会退回兜底名「Facebook 用户」，
   *     于是**所有学不到名字的客户会被合并成同一条客户记录**（多人混进一个会话）；
   *   · 返回空串后，基类会整体跳过路线 A，同时也不会拿这个 id 去跳过路线 B 里
   *     那条会话 —— 于是**同一条消息由路线 B（列表，拿得到名字）接手**，
   *     既不丢消息，也绝不会产生错客户。
   */
  protected getActiveConversationId(): string {
    if (!this.#activeThreadName) return "";
    return this.#threadIdFromUrl();
  }

  /** URL 里的原始 thread id（不受「名字是否学到」影响，仅供内部学习用） */
  #threadIdFromUrl(): string {
    return location.pathname.match(THREAD_ID_RE)?.[1] || "";
  }

  protected beforeScan(): void {
    this.#learnActiveThread();
  }

  /** 【路线 A】当前打开会话的消息列表 */
  protected parseMessageList(): IParsedMessage[] {
    const threadId = this.getActiveConversationId();
    if (!threadId) return [];

    const area = this.#resolveMessageArea();
    if (!area) {
      this.#diagnose("消息区没找到", `候选=${MESSAGE_AREA_SELECTORS.join(" , ")}`);
      return [];
    }

    // ——— 首选：Meta 自己标好的消息行（`data-pagelet="MWMessageRow"`） ———
    const rows = this.#resolveMessageRows(area);
    if (rows.length > 0) {
      const parsed = this.#parseRows(rows, threadId);
      if (!this.#dumpedRows) {
        this.#dumpedRows = true;
        this.#dumpRows(rows);
      }
      if (parsed.length > 0) return parsed;
      this.#diagnose(
        "拿到消息行但一条正文都抠不出",
        `行数=${rows.length} 选择器=${MESSAGE_ROW_SELECTOR}`,
      );
    }

    // ——— 兜底：叶子 span 法（Meta 哪天换掉 MWMessageRow 时还能苟活） ———
    return this.#parseLeaves(area, threadId);
  }

  /** 消息行集合：先在当前消息区里找，选窄了就从整页再捞一遍 */
  #resolveMessageRows(area: Element): Element[] {
    let rows: Element[] = [];
    try {
      rows = Array.from(area.querySelectorAll(MESSAGE_ROW_SELECTOR));
    } catch {
      return [];
    }
    if (rows.length === 0) {
      try {
        rows = Array.from(document.querySelectorAll(MESSAGE_ROW_SELECTOR));
      } catch {
        return [];
      }
    }
    return rows.slice(0, 200);
  }

  /** 逐条消息行解析（首选路径） */
  #parseRows(rows: Element[], threadId: string): IParsedMessage[] {
    const parsed: IParsedMessage[] = [];
    for (const row of rows) {
      const raw = extractBody(row);
      if (!raw || raw.length > 4000) continue;

      // 剥掉 Meta 的无障碍元信息前缀（`Enter，消息由Eric发送于16:25：`）
      const cleaned = cleanBody(raw);
      const body = cleaned.body;
      if (!body || body.length > 4000) continue;
      if (UI_TEXT_RE.test(body)) continue;
      if (SYSTEM_HINT_RE.test(body)) continue;

      // 方向：Meta 写明发送者时**直接采信** —— 比几何/配色可靠得多，
      // 而且紫色渐变的加密会话主题下「白字＝我方」会失效，这里不受影响。
      // 没有元信息段（普通非加密会话）才退回几何判定。
      let direction: "incoming" | "outgoing";
      let via: string;
      if (cleaned.sender) {
        direction = SELF_SENDER_RE.test(cleaned.sender) ? "outgoing" : "incoming";
        via = "meta-sender";
      } else {
        const guess = resolveDirection(row);
        direction = guess.direction;
        via = guess.via;
      }
      this.#lastDirectionVia = via;

      const avatar = pickAvatar(row);
      const timeText = cleaned.time || extractRowTime(row);
      // ⚠️ `senderName` 必须是**会话名**，不能直接用 Meta 描述里的 `Eric`：
      //    · Meta 写的是「名」不是全名（`Eric` ≠ `Eric Kulon`）；
      //    · 宿主拿 `customerName` 去 makeCustomerKey + upsert 客户表
      //      （`ON CONFLICT (user_id, external_id) DO UPDATE SET name=…`），
      //      传 `Eric` 会**把已存在的客户改名、甚至分裂出第二条客户记录**。
      //    `cleaned.sender` 只用来判方向（以及进指纹）。
      const senderName = direction === "incoming" ? this.#activeThreadName : "";

      parsed.push({
        // 合成 id：FB 的消息节点上没有可读的真实消息 id（实测）。
        // 指纹 = 会话 + 方向 + 发送者 + 时间 + 正文。
        //   · **不含头像** —— scontent URL 带签名参数，过期就变，同一条消息会被判成新的重复入库；
        //   · **不含 index** —— 同一条消息换个位置就又入库一次。
        messageId: `synth-${shortHash(
          `${threadId}|${direction}|${cleaned.sender}|${timeText}|${body}`,
        )}`,
        isRealId: false,
        direction,
        senderName,
        body,
        timeText,
        avatar,
        // ⚠️ 故意不把 Meta 的时间转成 sentAtMs：基类拿它当「时间闸门」
        //    （`sentAtMs < freshFrom` 的消息会被**直接过滤掉**）。
        //    而 Meta 的时间多数只有 `16:27`、没有日期，一旦猜错是哪一天
        //    （比如其实是昨天的消息被算成今天）就会把**真正的客户来信滤掉**。
        //    两种损失不对称：多收一条自己发的话只是脏数据，漏一条客户来信是事故。
        //    ⇒ 宁可走位置闸门（`sentAtMs === 0` 那条分支），等拿到可靠时间源再说。
        sentAtMs: 0,
      });
    }
    return parsed;
  }

  /** 叶子 span 兜底解析（`MWMessageRow` 不存在时才会走到） */
  #parseLeaves(area: Element, threadId: string): IParsedMessage[] {
    // 正文一律是「叶子 span」。界面文案（时间分隔、占位符、系统提示）在这里挡掉。
    const leaves: Element[] = [];
    try {
      area.querySelectorAll('span[dir="auto"]').forEach((el) => {
        if (el.childElementCount === 0 && textOf(el)) leaves.push(el);
      });
    } catch {
      return [];
    }
    if (leaves.length === 0) {
      this.#diagnose("消息区里一个叶子 span 都没有", `pathname=${location.pathname}`);
      return [];
    }

    const parsed: IParsedMessage[] = [];
    leaves.forEach((leaf) => {
      if (parsed.length >= 200) return;

      const raw = textOf(leaf);
      if (!raw || raw.length > 4000) return;
      const cleaned = cleanBody(raw);
      const body = cleaned.body;
      if (!body || body.length > 4000) return;
      if (UI_TEXT_RE.test(body)) return;
      if (SYSTEM_HINT_RE.test(body)) return;
      // 输入框 / 顶栏 / 侧栏里的文字不是消息
      if (leaf.closest('[contenteditable="true"], [role="textbox"], header, [role="banner"], [role="navigation"]')) {
        return;
      }
      // 安全网：会话列表行整行是个 `/messages/…/t/<id>` 链接时，整行都会被挡掉
      // （万一消息区候选选择器误选中了会话列表，这一步能避免把预览当消息入库）
      if (leaf.closest(THREAD_ANCHOR_SELECTOR)) return;

      const row = climbToMessageRow(leaf, area);
      let direction: "incoming" | "outgoing";
      let via: string;
      if (cleaned.sender) {
        direction = SELF_SENDER_RE.test(cleaned.sender) ? "outgoing" : "incoming";
        via = "meta-sender";
      } else {
        const guess = resolveDirection(row);
        direction = guess.direction;
        via = guess.via;
      }
      this.#lastDirectionVia = via;

      const avatar = pickAvatar(row);
      const timeText = cleaned.time || extractRowTime(row);
      // 同 #parseRows：客户名一律用会话名（Meta 的 `sender` 只是「名」，会引发客户改名/分裂）
      const senderName = direction === "incoming" ? this.#activeThreadName : "";
      const seed = `${threadId}|${direction}|${cleaned.sender}|${timeText}|${body}`;

      parsed.push({
        messageId: `synth-${shortHash(seed)}`,
        isRealId: false,
        direction,
        senderName,
        body,
        timeText,
        avatar,
        // ⚠️ 故意不把 Meta 的时间转成 sentAtMs：基类拿它当「时间闸门」
        //    （`sentAtMs < freshFrom` 的消息会被**直接过滤掉**）。
        //    而 Meta 的时间多数只有 `16:27`、没有日期，一旦猜错是哪一天
        //    （比如其实是昨天的消息被算成今天）就会把**真正的客户来信滤掉**。
        //    两种损失不对称：多收一条自己发的话只是脏数据，漏一条客户来信是事故。
        //    ⇒ 宁可走位置闸门（`sentAtMs === 0` 那条分支），等拿到可靠时间源再说。
        sentAtMs: 0,
      });
    });

    if (parsed.length === 0 && !this.#dumpedMessageArea) {
      this.#dumpedMessageArea = true;
      this.#dumpMessageArea(area);
    }

    return parsed;
  }

  /** 【路线 B】会话列表快照 */
  protected parseConversationList(): Map<string, IWatchedConversation> {
    const { rows, via } = resolveListRows();
    this.#lastListVia = via;
    this.#lastListCount = rows.length;

    const current = new Map<string, IWatchedConversation>();
    if (rows.length === 0) return current;

    rows.forEach((row) => {
      const leaves = textLeaves(row, 6).filter((el) => textOf(el));
      if (leaves.length === 0) return;

      // 结构启发式：第一个叶子＝客户名，下一个「不像纯数字」的叶子＝消息预览
      const nameEl: Element | null = leaves[0] ?? null;
      let customerName = textOf(nameEl);
      if (!customerName) customerName = pickAttr(row, "img[alt]", "alt");
      if (!customerName) return;

      const previewEl = leaves.find((el, i) => i > 0 && !/^\d{1,3}$/.test(textOf(el))) || null;
      const previewRaw = textOf(previewEl);
      // 会话列表行里**也会**带 Meta 的无障碍元信息前缀（DB 里那条
      // `Enter，消息由Eric发送于18:01：123156` 就是这么漏进来的）。同样剥掉，
      // 且剥出来的时间比行尾的 `· N分钟` 更准。
      const previewMeta = cleanBody(previewRaw);
      const previewSplit = splitPreview(previewMeta.body || previewRaw);
      const senderIsMe = previewMeta.sender
        ? SELF_SENDER_RE.test(previewMeta.sender)
        : previewSplit.senderIsMe;
      const content = previewSplit.content;
      const timeText = previewMeta.time || previewSplit.timeText;

      // 真实 thread id（锚点法拿得到；容器法一般拿不到）
      let threadId = "";
      try {
        const anchor = row.querySelector(THREAD_ANCHOR_SELECTOR) || (row.closest(THREAD_ANCHOR_SELECTOR) as Element | null);
        threadId = anchor?.getAttribute("href")?.match(THREAD_ID_RE)?.[1] || "";
      } catch {
        threadId = "";
      }
      if (!threadId) threadId = this.#nameToThreadId.get(normName(customerName)) || "";
      if (threadId) this.#learn(customerName, threadId);

      const sentAtMs = parseTimeText(timeText);

      // 未读判定三路取或：
      //   ① aria-label 明说未读
      //   ② 名称/预览被加粗（FB 对未读会话的惯例）
      //   ③ 预览时间是「刚刚 / N分钟」这种新鲜值 —— 一个刚活跃的会话必然是新的
      //      （会话列表是虚拟滚动的，往上滚会把老行渲染出来，靠时间过滤掉它们）
      let unreadCount = detectUnread(row, nameEl, previewEl);
      if (unreadCount === 0 && sentAtMs > 0 && sentAtMs > Date.now() - 15 * 60_000) {
        unreadCount = 1;
      }

      const avatar = pickAvatar(row);

      // 没有 thread id 时用「名字归一化」当 key —— 只驱动上报判定，不产消息 id
      const key = threadId || `name:${normName(customerName)}`;
      if (!key || key === "name:") return;

      current.set(key, {
        // ⚠️ 这里保留**真实 thread id**（而不是名字派生键）：
        // 基类要用它跟「当前打开的会话」比对，跳过路线 A 已经处理过的那条，避免重复入库。
        conversationExternalId: threadId,
        customerName,
        customerAvatar: avatar,
        preview: content,
        unreadCount,
        // 指纹只放「内容相关」字段，**绝不能放 index**：
        // 宿主用它合成 messageExternalId，一旦掺入会随位置变化的值，
        // 同一条消息换个位置就会被当成新消息重复入库。
        fingerprint: `${content}|${timeText}|${unreadCount}`,
        direction: senderIsMe ? "outgoing" : "incoming",
        timeText,
        sentAtMs: sentAtMs || undefined,
      });
    });

    return current;
  }

  /** 命中条目却一条都解析不出 —— 只有真的选到条目时才诊断，避免空页反复刷日志 */
  protected onEmptyConversationList(_detail: string): void {
    if (this.#lastListCount === 0) return;
    this.#diagnose("选到条目但一条都解析不出", `via=${this.#lastListVia} 条目数=${this.#lastListCount}`);
  }

  /** 真正上报时顺手把「客户名 → thread id」记下来 */
  protected onMessageReported(message: IParsedMessage, conversationId: string): void {
    if (!message.senderName || !conversationId) return;
    this.#learn(message.senderName, conversationId);
  }

  // ---------------- 消息区定位 ----------------

  #resolveMessageArea(): Element | null {
    const { elements } = queryFirstMatch(MESSAGE_AREA_SELECTORS);
    if (elements.length === 0) return null;

    // 会话列表可能也长在 `[role="main"]` 里面 —— 含它的候选一律剔除，
    // 否则「叶子 span 最多」的启发式会选中会话列表，把预览文本当成消息入库。
    const listRoot = document.querySelector('[data-pagelet="MWThreadListContent"]');
    const withoutList = elements.filter((el) => !(listRoot && el.contains(listRoot)));
    const pool = withoutList.length > 0 ? withoutList : elements;

    // 真消息区里叶子 span 最多，取最多的那个
    let best: Element | null = pool[0] ?? null;
    let bestCount = -1;
    for (const el of pool.slice(0, 4)) {
      const count = el.querySelectorAll('span[dir="auto"]').length;
      if (count > bestCount) {
        bestCount = count;
        best = el;
      }
    }
    if (best && listRoot && best.contains(listRoot)) {
      this.#diagnose("消息区候选里含会话列表", `已退回不完整候选，叶子 span=${bestCount}`);
    }
    return best;
  }

  // ---------------- 学习「当前会话的客户名」 ----------------

  /**
   * 学「当前打开的会话是谁」。
   *
   * ① **消息区就地学**（实测最稳）：`aria-label="与Eric Kulon的对话中的消息"`、
   *    头部 `h3` = `与Eric Kulon的对话`、按钮 `aria-label="Eric Kulon的更多选项"`；
   * ② 会话列表里指向当前 thread 的那一行（依赖列表已渲染 + href 形态对得上）；
   * ③ `document.title`（形如 `Eric Kulon | Facebook`）；
   * ④ 会话头部标题元素（`h1/h2/[role=heading]`，排除消息区）。
   *
   * 四处都学不到就把名字留空 —— `getActiveConversationId()` 会据此让路线 B 接手，
   * 绝不会拿兜底名把多个客户合并成一条记录。
   */
  #learnActiveThread() {
    const threadId = this.#threadIdFromUrl();
    if (!threadId) {
      this.#activeThreadName = "";
      return;
    }

    const area = this.#resolveMessageArea();

    // ① 消息区就地学名（不依赖会话列表是否已渲染）
    const fromArea = learnNameFromArea(area);
    if (fromArea) {
      this.#activeThreadName = fromArea;
      this.#learn(fromArea, threadId);
      return;
    }

    // ② 会话列表里那条指向当前 thread 的行
    const row = findRowByThreadId(threadId);
    if (row) {
      const name = textOf(textLeaves(row, 3)[0] ?? null);
      if (name) {
        this.#activeThreadName = name;
        this.#learn(name, threadId);
        return;
      }
    }

    // ③ 页面标题
    const title = document.title
      .replace(/^\(\d+\)\s*/, "")
      .replace(/\s*[|·\-–]\s*(Facebook|Messenger|脸书).*$/i, "")
      .trim();
    // 标题是 Messenger / Facebook 本身就没信息量，别当成客户名
    if (title && !/^(messenger|facebook|脸书)$/i.test(title)) {
      this.#activeThreadName = title;
      this.#learn(title, threadId);
      return;
    }

    // ④ 会话头部标题元素（消息区之外，避免把消息正文当名字）
    const headings: Element[] = [];
    try {
      document.querySelectorAll('h1, h2, [role="heading"]').forEach((el) => headings.push(el));
    } catch {
      /* ignore */
    }
    for (const el of headings) {
      if (area && area.contains(el)) continue; // 消息区里的不算
      if (el.closest('[contenteditable="true"], [role="textbox"]')) continue;
      const text = textOf(el);
      if (!text || text.length > 40 || UI_TEXT_RE.test(text)) continue;
      this.#activeThreadName = text;
      this.#learn(text, threadId);
      return;
    }

    // 四处都落空：留空，交给路线 B（列表里有名字）
    this.#activeThreadName = "";
  }

  #learn(name: string, threadId: string) {
    if (!name || !threadId) return;
    const key = normName(name);
    if (!key) return;
    if (this.#nameToThreadId.get(key) === threadId) return;
    this.#nameToThreadId.set(key, threadId);
    this.#saveNameMap();
  }

  #loadNameMap() {
    try {
      const raw = localStorage.getItem(NAME_MAP_STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw) as Record<string, string>;
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === "string" && value) this.#nameToThreadId.set(key, value);
      });
    } catch {
      /* localStorage 不可用时静默降级 */
    }
  }

  #saveNameMap() {
    try {
      localStorage.setItem(NAME_MAP_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.#nameToThreadId)));
    } catch {
      /* 配额满 / 被禁用时忽略 */
    }
  }

  // ---------------- 诊断 ----------------

  #diagnose(reason: string, detail: string) {
    const now = Date.now();
    if (now - this.#lastDiagAt < 20000) return;
    this.#lastDiagAt = now;
    const counts = [
      `threadAnchors=${document.querySelectorAll(THREAD_ANCHOR_SELECTOR).length}`,
      `messageRows=${document.querySelectorAll(MESSAGE_ROW_SELECTOR).length}`,
      `inboxDetail=${document.querySelectorAll(INBOX_DETAIL_SELECTOR).length}`,
      `roleRows=${document.querySelectorAll('[role="row"]').length}`,
      `threadListRoot=${document.querySelectorAll('[data-pagelet="MWThreadListContent"]').length}`,
      `leafSpans=${document.querySelectorAll('span[dir="auto"]').length}`,
    ].join(" ");
    this.log(`诊断(${reason}) path=${location.pathname} ${counts} | ${detail}`);
    this.log(`诊断 列表解析方式=${this.#lastListVia || "(未命中)"} 条目数=${this.#lastListCount}`);
    this.log(`诊断 消息方向判定=${this.#lastDirectionVia || "(未判定)"} 当前会话名=${this.#activeThreadName || "(未学到)"}`);
    this.log(`诊断 title=${document.title}`);
  }

  /**
   * 转储真实消息行结构（首次拿到消息行时做一次）。
   *
   * 这是「先写后验」的抓手：日志里能**同时**看到 Meta 给的原始 HTML 和我的方向判定，
   * 一旦判定跟屏幕上实际情况对不上（比如对方消息被当成我方发出去的那种），
   * 照着日志改就行，不用再请老板截图。
   */
  #dumpRows(rows: Element[]) {
    const head = rows.slice(0, 6);
    this.log(
      `DOM转储 消息行共 ${rows.length} 条｜当前会话名=${this.#activeThreadName || "(未学到)"}｜转储前 ${head.length} 条`,
    );
    head.forEach((row, index) => {
      const raw = extractBody(row);
      const cleaned = cleanBody(raw);
      // 打印**真正会上报的那个判定**（与 #parseRows 同逻辑：Meta 优先，几何兜底）
      const guess = resolveDirection(row);
      const direction = cleaned.sender
        ? SELF_SENDER_RE.test(cleaned.sender)
          ? "outgoing"
          : "incoming"
        : guess.direction;
      const via = cleaned.sender ? "meta-sender" : guess.via;
      let imgs = 0;
      let color = "?";
      let geom = "?";
      try {
        imgs = row.querySelectorAll("img").length;
        const leaf = textLeaves(row, 1)[0];
        if (leaf) color = getComputedStyle(leaf).color || "?";
        const nr = row.getBoundingClientRect();
        if (leaf && nr.width > 0) {
          const lr = leaf.getBoundingClientRect();
          geom = `行宽${Math.round(nr.width)} 文本左距${Math.round(lr.left - nr.left)} 文本右距${Math.round(
            nr.right - lr.right,
          )}`;
        }
      } catch {
        /* ignore */
      }
      const metaInfo = cleaned.sender
        ? `元信息发送者="${cleaned.sender}"${cleaned.dateText ? ` 日期=${cleaned.dateText}` : ""} 时间=${cleaned.time}`
        : "无元信息段";
      this.log(
        `DOM转储 行#${index} 判定=${direction}(${via}) 图片数=${imgs} 文字色=${color} ${geom}` +
          `｜${metaInfo}｜原始="${raw.slice(0, 90)}"｜清洗后="${cleaned.body.slice(0, 90)}"`,
      );
      const html = row.outerHTML.replace(/\s+/g, " ");
      for (let offset = 0; offset < html.length && offset < 2400; offset += 1200) {
        this.log(`DOM转储 行#${index} html@${offset} ${html.slice(offset, offset + 1200)}`);
      }
    });
  }

  /** 消息区一条都解析不出时，把真实结构转储出来（只做一次） */
  #dumpMessageArea(area: Element) {
    const html = area.outerHTML.replace(/\s+/g, " ");
    this.log(`DOM转储 消息区 outerHTML(${html.length} 字符)`);
    for (let offset = 0; offset < html.length && offset < 6000; offset += 1000) {
      this.log(`DOM转储 chunk@${offset} ${html.slice(offset, offset + 1000)}`);
    }
  }
}

export type { IWatchedConversation } from "../engine/MessageWatcherBase.ts";
