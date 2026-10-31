import { throttle } from "lodash-es";
import { createLogger, type ILogger, type LogSource } from "@gc/logger";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { MainWebviewId } from "@gc/model";

/**
 * 当前 frame 是不是被嵌在别的页面里（子 frame）。
 *
 * ⭐ 2026-10-21 必须加的原因（业务员反馈「红条一直说登录失效」）：
 * preload 会被注入到页面里的**每一个 iframe**，而 LinkedIn 首页/消息页里塞了上百个
 * 广告与统计 iframe —— `https://www.google.com/signIn`、`https://li.protechts.net/signIn`、
 * `https://lnkd.demdex.net/signIn`、`https://merchantpool1.linkedin.com/signIn`……
 * 每个 frame 都会 mount 一份监听器，各自判定「我这个 frame 不在消息页」，
 * 于是每分钟往界面推一条「可监听=false」，把红条刷成「登录态失效」，
 * 让业务员以为要重新登录（实际顶层页面在消息页好好的）。
 *
 * 所以：**这些告警只允许顶层 frame 发**。
 * `window.top !== window.self` 在顶层永远为 false；在跨域 iframe 里比较
 * window proxy 不会抛错，同样得到 true。
 * 万一是内嵌在别的页面里访问 top 抛错，按子 frame 处理（只影响告警，不影响监听）。
 */
const IS_SUB_FRAME = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();

/**
 * 消息监听器公共基类
 * ============================================================
 * 各平台（LinkedIn / TikTok / Messenger / Facebook / Teams）的「客户来信监听」
 * 骨架完全一样，只有 **DOM 选择器与解析方式** 不同。这个基类负责骨架，
 * 平台子类只实现 5 个方法。
 *
 * ── 基类负责（与 DOM 无关）──────────────────────────────────
 *   · 生命周期：MutationObserver + 节流 + 首扫延迟 + 心跳兜底
 *   · 两条路线的**基线管理**（首次扫描不报"变化"，但会话列表会做一次**未读补扫**）
 *   · 开机补扫：停机期间攒下的未读，重启后补报一次（catchUpUnreadOnStart）
 *   · 新消息判定、去重、时间闸门、位置闸门
 *   · 路线 A / 路线 B 的去重（当前打开的会话由 A 负责，B 跳过）
 *   · 诊断日志节流、分块写日志
 *
 * ── 平台子类负责（与 DOM 强相关）────────────────────────────
 *   · isWatchablePage()          —— 当前是否处于能监听的页面
 *   · parseMessageList()         —— 【路线 A】当前打开会话的消息列表
 *   · parseConversationList()    —— 【路线 B】会话列表快照
 *   · getActiveConversationId()  —— 当前打开的会话 id（用于去重 / 切会话重置基线）
 *   · beforeScan()               —— 可选，扫描前的平台专属动作
 *
 * 为什么要有这一层：LinkedIn 那份实现是 800 行独立代码，若每个平台照抄一遍，
 * 6 个平台就是 6×800 行，改一处要改六处。抽层后平台侧只剩「选择器 + 解析」，
 * 约 100~150 行。
 */

/** 监听器产出的单条会话快照（平台无关） */
export interface IWatchedConversation {
  /** 平台侧会话 id（拿不到时可为空串，由宿主用客户名派生键兜底） */
  conversationExternalId: string;
  customerName: string;
  customerAvatar: string;
  /** 该会话最新一条消息的正文 */
  preview: string;
  unreadCount: number;
  /** 用于判断「这条会话是否出现了新内容」的指纹 */
  fingerprint: string;
  /** 真实消息 id（拿不到时缺省，由宿主合成） */
  messageExternalId?: string;
  /** 消息方向：incoming=客户发来，outgoing=我方发出 */
  direction?: "incoming" | "outgoing";
  /** 消息时间文本（如 "11:41"） */
  timeText?: string;
  /** 客户在平台侧的画像/用户 id（拿不到则空） */
  customerProfileId?: string;
  /** 真实发送时间（毫秒时间戳；0 或缺省＝未知） */
  sentAtMs?: number;
}

/** 【路线 A】从当前会话页解析出的单条消息 */
export interface IParsedMessage {
  /** 平台侧消息 id（真实优先；拿不到时子类自己合成一个稳定值） */
  messageId: string;
  /** 这个 id 是否来自平台真实字段（仅用于日志判断） */
  isRealId: boolean;
  direction: "incoming" | "outgoing";
  /** 发送者显示名 */
  senderName: string;
  /** 正文（空串＝撤回/系统气泡，会上报时被跳过） */
  body: string;
  timeText: string;
  avatar: string;
  /** 真实发送时间（毫秒）；解不出填 0 */
  sentAtMs: number;
  /** 平台侧的画像/用户 id */
  profileId?: string;
}

export interface IMessageWatcherOptions {
  /** 平台标识，用于日志与诊断前缀（如 "linkedin"） */
  platform: string;
  /** 诊断 logger 的 source */
  logSource: LogSource;
  /** 发现某个会话出现新消息时回调（首次基线扫描不会触发） */
  onNewMessage: (conversation: IWatchedConversation) => void;
  /** 是否输出调试日志 */
  debug?: boolean;
  /**
   * 历史消息宽限（毫秒）。发送时间早于「开始监听时刻 − 该值」的消息
   * 一律视为滚动加载出来的历史消息，不上报。
   */
  historyGraceMs?: number;
  /** 发送时间解不出时，只认列表末尾 N 条 */
  recentWindow?: number;
  /** 观察器节流间隔（毫秒） */
  throttleMs?: number;
  /** 首扫延迟（毫秒） */
  initialDelayMs?: number;
  /**
   * **开机补扫**（默认开启）
   *
   * 背景：本类原先的铁律是「首扫只建基线、绝不上报」，这样确实不重复，
   * 但代价是 —— **程序没运行（关机/退出/WebView 被回收）期间客户发来的消息，
   * 重启后会被当成历史消息塞进基线，永远不上报 ⇒ 永久丢失**。
   * 业务员关一次电脑就漏一批真实客户来信，而且他自己不会知道。
   *
   * 现在改成：首次建立**会话列表**基线时，把「平台上确实带未读标记」的会话补报一次。
   * 为什么只认未读：未读是平台自己打的标记，不是我们猜的，误报率最低；
   * 已读的会话即使重启也不需要补（业务员已经看过了）。
   *
   * 幂等靠两件事兜底：① 补报用的合成 id 固定为 `catchup:<会话键>:<正文哈希>`，
   * 不含时间（平台列表里的时间多是「6分钟前」这类相对值，会随时间变化 ⇒ 不能进指纹）；
   * ② 落库侧 `UNIQUE(conversation_id, external_message_id)`。
   *
   * 三个平台都没有官方私信接口，监听只能跑在业务员电脑上，所以这个补扫是
   * 「关机期间不漏客户」的唯一保障 —— 除非以后有平台走官方 API。
   */
  catchUpUnreadOnStart?: boolean;
  /**
   * **看门狗**：启动后多久还没拿到任何会话数据就报一条 WARN（毫秒，默认 90 秒）。
   *
   * 为什么需要：监听最危险的失败形态不是「报错」，而是**完全静默** ——
   * 脚本活着、心跳照跑、日志只有 debug 诊断，业务员以为在监控，
   * 实际一条消息都没收。2026-10-19 真事故就是这样：
   * LinkedIn 登录态被踢，页面停在 /signIn，296 条 debug 诊断淹没了一切，
   * 直到客户投诉才发现「脚本压根不在消息页上」。设 0 可关闭。
   */
  stallWarnAfterMs?: number;
  /** 心跳兜底间隔（毫秒） */
  heartbeatMs?: number;
  /**
   * 路线 A 解析不出客户名时的兜底名。
   * ⚠️ 这个值会参与下游的「客户名派生键」，改动等于让同一条消息换 key，
   * 所以各平台请沿用重构前它自己的兜底文案。
   */
  fallbackCustomerName?: string;
}

/** 名字归一化：DOM 里是 "Eric Kulon"，去空格 + 小写做键 */
export const normName = (value: string): string =>
  value.replace(/\s+/g, "").toLowerCase();

/** 稳定的短哈希，用来合成「平台侧消息 id」 */
export const shortHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
};

/** 多级降级取值：第一个非空文本就算数（选择器写错也不会抛） */
export const pickText = (root: Element, selectors: string[]): string => {
  for (const selector of selectors) {
    let el: Element | null = null;
    try {
      el = root.querySelector(selector);
    } catch {
      continue;
    }
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return "";
};

/** 多级降级取属性值 */
export const pickAttr = (root: Element, selector: string, attr: string): string => {
  let el: Element | null = null;
  try {
    el = root.querySelector(selector);
  } catch {
    return "";
  }
  return el?.getAttribute(attr)?.trim() || "";
};

/** 按候选顺序找第一个「有命中」的选择器，返回命中元素列表与所用选择器 */
export const queryFirstMatch = (
  selectors: string[],
): { elements: Element[]; selector: string } => {
  for (const selector of selectors) {
    let found: Element[] = [];
    try {
      found = Array.from(document.querySelectorAll(selector));
    } catch {
      continue;
    }
    if (found.length > 0) return { elements: found, selector };
  }
  return { elements: [], selector: "" };
};

export abstract class MessageWatcherBase {
  #observer?: MutationObserver;
  #heartbeat?: number;
  #options: IMessageWatcherOptions;
  #dumpLogger: ILogger;
  #alertLogger: ILogger;

  /** 日志前缀，如 "[LinkedIn 监听]" */
  #tag: string;

  // ── 路线 A：当前打开的会话 ──
  #seenMessageIds = new Set<string>();
  #hasMessageBaseline = false;
  /** 上一轮路线 A 绑定的会话 id（变了就作废消息基线） */
  #baselineConversationId = "";

  // ── 路线 B：会话列表 ──
  #snapshot = new Map<string, IWatchedConversation>();
  #hasBaseline = false;
  /** 本次运行已经补报过哪些 id（避免同一会话反复补报刷日志） */
  #catchUpReported = new Set<string>();
  /** 本次运行是否已经做过开机补扫（基线重建时不要重复扫） */
  #catchUpDone = false;

  #scanCount = 0;
  /** 开始监听的时刻（毫秒） */
  #watchStartMs = Date.now();
  #lastDiagnoseAt = 0;
  /** 上一次「页面不在目标站点」告警的时间（半小时最多一条，避免刷屏） */
  #offPageWarnAt = 0;
  /**
   * 上一次的「是否处于可监听页面」状态。
   *
   * 2026-10-21 新增：用来把「监听失效」这件事**通知到界面**。
   * 之前只有日志，业务员看不到，表现就是「软件打开着但一条消息都没有」，
   * 他还以为是在等客户。
   *
   * 只在**状态变化**时上报（不是每次扫描），避免每 8 秒刷一次 IPC。
   */
  #lastWatchable?: boolean;
  /**
   * 上次向界面推送监听状态的时间。
   *
   * 光靠「状态变化才发」不够：注入脚本第一次扫描（1~2 秒）就可能比
   * React 组件挂载、useEffect 注册监听更早，那一条消息就丢了，
   * 而状态之后不再变化 ⇒ 界面永远收不到。
   * 所以再加一条兜底：即使状态没变，也每 60 秒重发一次（幂等，界面重复设置同样的值无副作用）。
   */
  #lastWatchNotifyAt = 0;
  /** 「启动后一直拿不到任何数据」的看门狗 */
  #stallTimer: number | undefined;

  constructor(options: IMessageWatcherOptions) {
    this.#options = options;
    this.#tag = `[${options.platform} 监听]`;
    this.#dumpLogger = createLogger(options.logSource, "watcher-dump");
    // 告警专用通道：监听「静默失效」是这套系统最危险的失败形态，
    // 必须能一眼在日志里看到，不能和 debug 诊断混在一起。
    this.#alertLogger = createLogger(options.logSource, "watcher-alert");
  }

  // ================================================================
  // 子类必须实现
  // ================================================================
  /** 当前页面是否可监听（如 LinkedIn 必须停在 /messaging） */
  protected abstract isWatchablePage(): boolean;

  /** 【路线 A】解析当前打开会话的消息列表；不在会话页可返回 [] */
  protected abstract parseMessageList(): IParsedMessage[];

  /**
   * 【路线 B】解析会话列表快照。
   * key 用「平台侧会话 id」，拿不到时可用 `name:<归一化名>` 之类兜底。
   * 只要客户名拿得到就该产出一条 —— 不要要求平台侧 id 非空，
   * 否则「没点开过的客户」会被静默丢弃（LinkedIn 踩过这个坑）。
   */
  protected abstract parseConversationList(): Map<string, IWatchedConversation>;

  /**
   * 当前打开的会话 id。空白表示「不在会话里」——此时路线 A 整体跳过。
   * 也用于「切换会话 ⇒ 消息基线作废」与「路线 B 跳过当前会话避免重复入库」。
   */
  protected getActiveConversationId(): string {
    return "";
  }

  /** 扫描前的平台专属动作（学习 active 会话、一次性深度转储等） */
  protected beforeScan(): void {}

  /**
   * 某条消息**即将上报**时的回调（用于平台侧的「名字 → 会话 id」学习等副作用）。
   * 只在真正上报时触发，不会因为扫描到历史消息而误学。
   */
  protected onMessageReported(
    _message: IParsedMessage,
    _conversationId: string,
  ): void {}

  /** 命中条目却一条都解析不出时的平台专属转储 */
  protected onEmptyConversationList(detail: string): void {
    this.diagnose("选到条目但一条都解析不出", detail);
  }

  // ================================================================
  // 暴露给子类的工具
  // ================================================================
  protected get options(): IMessageWatcherOptions {
    return this.#options;
  }

  protected get watchStartMs(): number {
    return this.#watchStartMs;
  }

  protected get scanCount(): number {
    return this.#scanCount;
  }

  protected log(message: string) {
    if (this.#options.debug) {
      console.log(`${this.#tag} ${message}`);
    }
  }

  /** 只在排查需要时输出（同一原因 8 秒内最多一条，避免刷爆日志） */
  protected diagnose(reason: string, detail: string) {
    const now = Date.now();
    if (now - this.#lastDiagnoseAt < 8000) return;
    this.#lastDiagnoseAt = now;
    this.log(`诊断 #${this.#scanCount} ${reason} → ${detail}`);
  }

  /** 分块写日志（单条太长会被各处截断） */
  protected dumpLines(prefix: string, lines: string[]) {
    const chunkSize = 1200;
    lines.forEach((line, index) => {
      for (let offset = 0; offset < line.length; offset += chunkSize) {
        this.#dumpLogger.info(
          `${prefix}[${index}.${offset / chunkSize}] ${line.slice(offset, offset + chunkSize)}`,
        );
      }
    });
  }

  // ================================================================
  // 生命周期
  // ================================================================
  start() {
    if (this.#observer) return;
    this.#watchStartMs = Date.now();

    // 列表会被框架反复重建，观察 body 比盯某个具体容器更耐改版。
    // 节流：一次重渲染会引发几十条 mutation 记录，逐条处理纯属浪费。
    const throttleMs = this.#options.throttleMs ?? 800;
    this.#observer = new MutationObserver(
      throttle(() => this.#scan(), throttleMs, { leading: false, trailing: true }),
    );
    this.#observer.observe(document.body, { childList: true, subtree: true });

    // 先扫一次，让「打开页面时列表已经渲染好」的情况也能立刻建立基线
    window.setTimeout(() => this.#scan(), this.#options.initialDelayMs ?? 1500);
    // 心跳兜底：正常情况下观察器会持续被触发，但页面长时间零变动时
    // （比如切到后台标签）这里保证一次也不会漏。
    this.#heartbeat = window.setInterval(
      () => this.#scan(),
      this.#options.heartbeatMs ?? 5000,
    );

    // 看门狗：跑了很久却一条会话都没拿到 ⇒ 大概率页面不对（被踢登录页 / 代理异常），
    // 主动报一条 WARN，别让「静默失效」一直藏着。设 0 可关闭。
    const stallAfter = this.#options.stallWarnAfterMs ?? 90_000;
    if (stallAfter > 0) {
      this.#stallTimer = window.setTimeout(() => {
        this.#stallTimer = undefined;
        if (this.#hasBaseline || this.#hasMessageBaseline) return;
        this.#alertLogger.warn(
          `${this.#tag} ⚠️ 启动 ${Math.round(stallAfter / 1000)} 秒仍未拿到任何会话数据，` +
            `监听很可能无效：${location.href} —— 请确认已进入消息页且登录态有效`,
        );
        // 光报警不够：业务员不会看日志。页面 URL 看着对、DOM 却一条都解析不出来，
        // 最常见的原因是平台 SPA 已经被搞坏（路由错乱 / JS 分片没加载上），
        // 这种状态**只有整页刷新能恢复**。这里给一次自愈的机会。
        this.#trySelfHeal();
      }, stallAfter);
    }

    this.log("已启动，等待消息列表渲染");
  }

  /**
   * 一次性自愈：整页刷新。
   *
   * 为什么需要：2026-10-21 业务员那台机器上出现过「URL 明明在 /messaging/thread/…，
   * 但消息列表 / 会话列表一个节点都解析不到」—— 因为更早的一次
   * `history.pushState("/signIn")`（登录时代遗留）把平台 SPA 路由搞坏了，
   * 之后 URL 能改回去、**DOM 却回不去**，只有整页刷新才能恢复。
   *
   * 保险丝（缺一不可）：
   *   · 只在顶层 frame 做（子 frame 刷新没意义）
   *   · 每个标签页最多 1 次（sessionStorage 计数），绝不进入刷新循环
   *   · 用户正在输入框里打字时不做（避免吞掉正在写的回复）
   */
  #trySelfHeal() {
    if (IS_SUB_FRAME) return;

    const key = `gc_selfheal_${this.#options.platform}`;
    let tried = 0;
    try {
      tried = Number(window.sessionStorage.getItem(key) ?? "0") || 0;
    } catch {
      /* 拿不到 sessionStorage 就不做，宁可不自愈也不能刷新循环 */
      return;
    }
    if (tried >= 1) return;

    // 用户正在回复客户时绝不刷新
    try {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
    } catch {
      /* 判断不了就当没在输入 */
    }

    try {
      window.sessionStorage.setItem(key, String(tried + 1));
    } catch {
      return;
    }

    this.#alertLogger.warn(
      `${this.#tag} 页面 URL 正常但解析不到任何会话，疑似页面渲染已损坏 —— 自动刷新一次以恢复监听：${location.href}`,
    );
    window.setTimeout(() => {
      try {
        location.reload();
      } catch {
        /* 刷新失败也不能影响监听器本身 */
      }
    }, 500);
  }

  stop() {
    this.#observer?.disconnect();
    this.#observer = undefined;
    if (this.#heartbeat !== undefined) {
      window.clearInterval(this.#heartbeat);
      this.#heartbeat = undefined;
    }
    if (this.#stallTimer !== undefined) {
      window.clearTimeout(this.#stallTimer);
      this.#stallTimer = undefined;
    }
    this.#snapshot.clear();
    this.#seenMessageIds.clear();
    this.#catchUpReported.clear();
    this.#catchUpDone = false;
    this.#hasBaseline = false;
    this.#hasMessageBaseline = false;
  }

  // ================================================================
  // 把「当前页面能不能监听」告诉界面
  // ================================================================
  /**
   * 为什么不用 Rust 侧的 PlatformNeedRelogin：
   * 那个靠 `on_navigation` 看 URL，**跨域重定向不触发**。
   * 实测 LinkedIn 登录失效会跳到 accounts.google.com/signIn（走 Google 登录），
   * on_navigation 抓不到，红条就永远不出现，业务员只会觉得"软件坏了"。
   * 注入脚本这边是主动轮询 DOM/URL 的，页面跑到哪儿它都知道，绝不会漏。
   */
  #notifyHostWatchState(watchable: boolean) {
    // 子 frame（广告/统计 iframe）里没有平台的会话列表，报什么都不可信，
    // 只会把界面红条刷成「登录态失效」。只让顶层 frame 说话。见 IS_SUB_FRAME 注释。
    if (IS_SUB_FRAME) return;
    try {
      webviewChannel.sendMessage(
        webviewChannel.createMessage({
          receiverIds: [MainWebviewId],
          type: EChannelMessageEventType.watcherAlert,
          payload: {
            platform: this.#options.platform,
            url: location.href,
            // watchable=true 时传空串，界面据此把红条收起来
            reason: watchable
              ? ""
              : `现在停在 ${location.pathname}，这个页面监听不了。` +
                `常见原因：① 登录态失效被踢回登录页 ② 代理没启动、平台判定异地 IP ` +
                `③ 停在首页/动态页没进消息页`,
          },
        }),
      );
    } catch (err) {
      // 通知界面失败，绝不能影响监听本身
      this.log(`通知宿主监听状态失败：${String(err)}`);
    }
  }

  // ================================================================
  // 主扫描
  // ================================================================
  #scan() {
    this.#scanCount += 1;

    // 「能不能监听」一旦变化就通知宿主界面。
    // 放在最前面：只要状态变了，不管后面走哪条分支都要让业务员知道。
    // 另外每 60 秒无条件重发一次 —— 防止第一次消息发出时界面还没挂好监听（见字段注释）。
    const watchable = this.isWatchablePage();
    const changed = this.#lastWatchable !== watchable;
    const stale = Date.now() - this.#lastWatchNotifyAt > 60_000;
    if (changed || stale) {
      this.#lastWatchable = watchable;
      this.#lastWatchNotifyAt = Date.now();
      this.#notifyHostWatchState(watchable);
    }

    if (!watchable) {
      // 页面跑偏时必须「吵」一次。
      // 2026-10-19 真事故：LinkedIn 被踢到 /signIn，这里每 8 秒吐一条 debug 诊断，
      // 296 条噪音把真正的问题盖住了 —— 排查半天才发现监听脚本压根不在消息页上。
      // 现在改成：WARN 级、带完整 href、半小时最多一条。
      const now = Date.now();
      if (now - this.#offPageWarnAt > 30 * 60_000) {
        this.#offPageWarnAt = now;
        this.#alertLogger.warn(
          `${this.#tag} ⚠️ 页面不在可监听范围，正在收不到任何消息：${location.href} —— ` +
            `常见原因：① 登录态失效被踢回登录页 ② 代理没启动、平台判定异地 IP ` +
            `③ 停在首页/动态页没进消息页`,
        );
      }
      this.diagnose("不在可监听页面", `pathname=${location.pathname}`);
      return;
    }

    this.beforeScan();
    this.#scanMessageList();
    this.#scanConversationList();
  }

  // ================================================================
  // 路线 A：当前打开的会话 —— 能拿到真实消息 id，幂等最可靠
  // ================================================================
  #scanMessageList() {
    const conversationId = this.getActiveConversationId();
    // 没有「当前会话」＝不在会话页，这条路整体跳过
    if (!conversationId) return;

    // 切换会话 ⇒ 上一会话的消息基线作废（否则新会话的历史消息会被当成新消息）
    if (conversationId !== this.#baselineConversationId) {
      this.#baselineConversationId = conversationId;
      this.#seenMessageIds.clear();
      this.#hasMessageBaseline = false;
    }

    const parsed = this.parseMessageList();
    if (parsed.length === 0) return;

    const RECENT_WINDOW = this.#options.recentWindow ?? 5;
    const recentFrom = Math.max(0, parsed.length - RECENT_WINDOW);
    const freshFrom = this.#watchStartMs - (this.#options.historyGraceMs ?? 120_000);

    // 首次拿到非空消息列表 → 只登记基线，绝不上报
    if (!this.#hasMessageBaseline) {
      parsed.forEach((m) => this.#seenMessageIds.add(m.messageId));
      this.#hasMessageBaseline = true;
      const incomingCount = parsed.filter((m) => m.direction === "incoming").length;
      this.log(
        `会话基线已建立 conversationId=${conversationId} 共 ${parsed.length} 条消息` +
          `（其中对方 ${incomingCount} 条，不产生任何上报）`,
      );
      return;
    }

    let reported = 0;
    let skippedOld = 0;

    parsed.forEach((m, index) => {
      if (this.#seenMessageIds.has(m.messageId)) return;
      this.#seenMessageIds.add(m.messageId);

      // 只上报「客户发来的」
      if (m.direction !== "incoming") return;
      // ⚠️ 空正文不能直接丢（2026-10-20 修正）。
      // 以前这里是 `if (!m.body) return;`，后果是：客户发来一张图 / 一条语音 / 一个表情包，
      // 正文解析为空 ⇒ 整条消息被丢弃 ⇒ **业务员完全不知道有人找过他**。
      // 这比「显示得不好看」严重得多，属于「漏消息」。
      // 现在改成给一个占位文案：宁可粗一点，也绝不漏掉「有动静」这个事实。
      // 平台解析器如果能识别得更细（[图片]/[语音]），会自己填 body，走不到这里的兜底。
      const body = m.body || "[媒体消息]";
      // ① 时间戳闸门：挡住往上滚动加载出来的老消息
      if (m.sentAtMs > 0 && m.sentAtMs < freshFrom) {
        skippedOld += 1;
        return;
      }
      // ② 位置闸门：时间戳解不出时的兜底
      if (m.sentAtMs === 0 && index < recentFrom) return;

      reported += 1;
      this.onMessageReported(m, conversationId);
      this.#options.onNewMessage({
        conversationExternalId: conversationId,
        customerName:
          m.senderName || this.#options.fallbackCustomerName || this.#options.platform,
        customerAvatar: m.avatar,
        preview: body,
        unreadCount: 0,
        fingerprint: m.messageId,
        messageExternalId: m.messageId,
        direction: "incoming",
        timeText: m.timeText,
        customerProfileId: m.profileId || undefined,
        sentAtMs: m.sentAtMs || undefined,
      });
    });

    if (reported > 0 || skippedOld > 0) {
      this.log(
        `conversationId=${conversationId} 上报 ${reported} 条客户来信` +
          (skippedOld > 0 ? `（另跳过 ${skippedOld} 条滚动加载出的历史消息）` : ""),
      );
    }
  }

  // ================================================================
  // 开机补扫（v2，2026-10-20 重写）
  //
  // 为什么必须做：本类其余逻辑都是「只报变化」，一旦程序没在跑，
  // 期间发生的消息在重启后会被并进基线，永远不会上报 —— 客户来信永久丢失。
  //
  // ⚠️ v1 为什么两次都没成（真事故，别再犯）：
  //   v1 只补「平台上带未读标记」的会话。这有两个致命依赖：
  //     ① 未读徽标必须真的渲染出来（虚拟滚动、样式改版、平台 A/B 测试时经常为空）
  //     ② 监听必须真的停在消息页（实际它被平台踢到了 /signIn，整个 scan 第一行就 return）
  //   两个依赖任何一个断掉，补扫就一条都出不来，而且**完全静默**——
  //   日志里只有被淹没的 debug 诊断，看谁都以为「补扫没写」。
  //
  // ✅ v2 的规则：**首次拿到会话列表时，把每个会话的「最后一条」全部上报一遍**，
  //   由数据库 `UNIQUE(conversation_id, external_message_id)` 去重：
  //     · 这条已经入过库 → 撞唯一键，什么都不发生（不重复、不新增未读）
  //     · 这条没入过库   → 正常入库 + 未读 +1 ＝ 停机期间漏掉的那条被补回来了
  //   ⇒ **不依赖平台的未读标记**，也不需要在 preload 里反查数据库。
  //   代价是首次运行会把现有客户各带进来一条（这正是老板要的「只要最后一条」）。
  // ================================================================
  #catchUpUnread(current: Map<string, IWatchedConversation>) {
    // 允许平台/调试时关掉（默认开）
    if (this.#options.catchUpUnreadOnStart === false) {
      this.log("开机补扫：已被配置关闭，跳过");
      return;
    }
    // 同一次运行只补一次（页面来回切换导致基线重建时不要重复扫）
    if (this.#catchUpDone) return;
    this.#catchUpDone = true;

    const pending: IWatchedConversation[] = [];
    let skippedOutgoing = 0;
    let skippedEmpty = 0;

    current.forEach((conversation, key) => {
      // 我方最后发出的不需要补（客户还没回，业务员自己知道）
      if (conversation.direction === "outgoing") {
        skippedOutgoing += 1;
        return;
      }
      // 名字拿不到就没法建客户键，硬报会把多个客户合并成一条
      if (!conversation.customerName) return;
      // 没有正文（纯图片/贴纸/撤回）补了也只是空行
      if (!conversation.preview) {
        skippedEmpty += 1;
        return;
      }

      // ⚠️ 合成 id **只由「会话键 + 正文」决定，绝不带时间**：
      // 列表里的时间多是「6分钟前」这种相对值，每次刷新都在变，
      // 一旦进指纹，每次重启都会算成一条新消息 ⇒ 同一个客户刷出一堆重复行。
      const id = `catchup:${key}:${shortHash(conversation.preview)}`;
      if (this.#catchUpReported.has(id)) return;
      this.#catchUpReported.add(id);

      pending.push({ ...conversation, messageExternalId: id });
    });

    // 这条日志必须永远可见（不走 debug 开关）：
    // v1 就是因为「没补报时一声不吭」才让人查了两轮都没头绪。
    this.#alertLogger.info(
      `${this.#tag} 开机补扫：会话 ${current.size} 条 → 本次上报 ${pending.length} 条最后消息` +
        `（跳过：我方最后发言 ${skippedOutgoing} 条、无正文 ${skippedEmpty} 条；` +
        `已入过库的会被数据库唯一键静默挡掉）`,
    );

    pending.forEach((conversation) => {
      this.#options.onNewMessage(conversation);
    });
  }

  // ================================================================
  // 路线 B：会话列表 —— 没点开也能提醒
  // ================================================================
  #scanConversationList() {
    const current = this.parseConversationList();
    if (current.size === 0) {
      this.onEmptyConversationList("");
      return;
    }

    if (!this.#hasBaseline) {
      this.#snapshot = current;
      this.#hasBaseline = true;
      const names = Array.from(current.values())
        .map((c) => c.customerName || "?")
        .join("、");
      this.log(`列表基线已建立，共 ${current.size} 条会话（${names}）`);
      // 基线建完之后，再做一次「开机补扫」—— 把停机期间攒下的未读补报上去
      this.#catchUpUnread(current);
      return;
    }

    const activeId = this.getActiveConversationId();
    let reported = 0;
    const reportedNames: string[] = [];
    let skippedOutgoing = 0;

    current.forEach((conversation, key) => {
      const previous = this.#snapshot.get(key);

      // 判定「这条会话是否出现了新动静」：
      //   · 上轮见过 → 预览正文变了、或未读数变多了，说明来了新消息；
      //   · 首次出现 → 只有它带未读标记才算新消息
      //     （否则多半是滚动加载出来的历史会话，静默登记即可）。
      const contentChanged = previous
        ? previous.preview !== conversation.preview
        : false;
      const unreadGrew = previous
        ? conversation.unreadCount > previous.unreadCount
        : conversation.unreadCount > 0;
      if (!contentChanged && !unreadGrew) return;

      // 当前打开的会话由路线 A（有真实消息 id）负责，这里跳过以免重复入库
      if (activeId && conversation.conversationExternalId === activeId) return;

      // 自己发出的不算客户来信
      if (conversation.direction === "outgoing") {
        skippedOutgoing += 1;
        return;
      }

      // ★ 这里**不要求**平台侧会话 id 非空。
      // 会话 id / 客户 id 由宿主用客户名派生键兜底 —— 若强制要求 id，
      // 就变成了「只有点开过的客户才能监听」。只要名字拿得到就该上报。
      if (!conversation.customerName) return;

      reported += 1;
      reportedNames.push(conversation.customerName);
      this.#options.onNewMessage(conversation);
    });

    this.#snapshot = current;
    if (reported > 0) {
      this.log(`列表路线上报 ${reported} 条新消息：${reportedNames.join("、")}`);
    }
    if (skippedOutgoing > 0) {
      this.log(`列表路线跳过 ${skippedOutgoing} 条我方去信`);
    }
  }
}
