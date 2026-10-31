import { FC, useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { cn } from "@gc/ui/lib/utils";
import { EChannelMessageEventType, webviewChannel } from "@gc/webview";
import { mainLogger } from "@gc/logger";

// ============================================================
// 6 平台真实 SVG Logo + 品牌色
// ============================================================

export interface PlatformConfig {
  name: string;
  url: string;
  color: string;
  colorLight: string;
  icon: React.ReactNode;
  /**
   * 每个平台独立的 dataStoreIdentifier（必须是合法 UUID）。
   * Tauri 会据此给每个平台分配独立的 cookie / localStorage / IndexedDB 目录，
   * 保证 6 个平台登录态互不干扰，也让同一平台多账号可以完全隔离。
   */
  dataStoreIdentifier: string;
}

const TelegramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const MessengerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="currentColor" d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.99-.88c.17-.07.36-.09.54-.04.91.25 1.88.38 2.89.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46l-2.94 4.66c-.47.74-1.47.93-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66c.47-.74 1.47-.93 2.17-.4l2.34 1.75c.21.16.5.16.72 0l3.16-2.4c.42-.32.97.18.69.63z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TeamsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path fill="currentColor" d="M19.2 7.2h-5.4V4.5c0-.3-.2-.5-.5-.5H8.7c-.3 0-.5.2-.5.5v2.7H2.8c-.3 0-.5.2-.5.5v9c0 .3.2.5.5.5h5.4v2.7c0 .3.2.5.5.5h2.6c.3 0 .5-.2.5-.5v-2.7h5.4c.3 0 .5-.2.5-.5v-9c0-.3-.2-.5-.5-.5zM8.2 16.2H3.2V8.2h5v8zm4.6 2.8H9.7v-2.7h3.1v2.7zm5.9-2.8h-5V8.2h5v8z"/>
    <circle fill="currentColor" cx="16.5" cy="5.7" r="2.2"/>
  </svg>
);

export const PLATFORMS = {
  telegram: {
    name: "Telegram",
    url: "https://web.telegram.org",
    color: "#0088CC",
    colorLight: "#E1F0FA",
    icon: <TelegramIcon />,
    dataStoreIdentifier: "1a2b3c4d-0001-4000-8000-000000000001",
  },
  tiktok: {
    name: "TikTok",
    url: "https://www.tiktok.com/messages",
    color: "#69C9D0",
    colorLight: "#E8F8FA",
    icon: <TikTokIcon />,
    dataStoreIdentifier: "1a2b3c4d-0002-4000-8000-000000000002",
  },
  linkedin: {
    name: "LinkedIn",
    url: "https://www.linkedin.com/messaging",
    color: "#0A66C2",
    colorLight: "#E6F1FB",
    icon: <LinkedInIcon />,
    dataStoreIdentifier: "1a2b3c4d-0003-4000-8000-000000000003",
  },
  messenger: {
    name: "Messenger",
    url: "https://www.messenger.com",
    color: "#006AFF",
    colorLight: "#E6EFFF",
    icon: <MessengerIcon />,
    dataStoreIdentifier: "1a2b3c4d-0004-4000-8000-000000000004",
  },
  facebook: {
    name: "Facebook",
    url: "https://www.facebook.com/messages",
    color: "#1877F2",
    colorLight: "#E6F0FF",
    icon: <FacebookIcon />,
    dataStoreIdentifier: "1a2b3c4d-0005-4000-8000-000000000005",
  },
  teams: {
    name: "Teams",
    url: "https://teams.microsoft.com",
    color: "#6264A7",
    colorLight: "#EDEDF7",
    icon: <TeamsIcon />,
    dataStoreIdentifier: "1a2b3c4d-0006-4000-8000-000000000006",
  },
} as const satisfies Record<string, PlatformConfig>;

export type PlatformKey = keyof typeof PLATFORMS;

/**
 * 平台列表（顺序即左侧栏展示顺序）。
 *
 * 这里**显式写死顺序**，不直接用 `Object.keys(PLATFORMS)`。
 * 原因：PLATFORMS 的定义顺序是 telegram 打头，而 Telegram 是我们唯一
 * 既不支持监听、登录又最麻烦（要手机号 + 验证码）的平台。
 * 2026-10-20 业务员反馈「打开就要登录」，其实就是默认落在了 Telegram，
 * 而 Telegram Web 首屏就是一个手机号登录页，看着像软件在要密码。
 *
 * 所以把真正能用起来的 LinkedIn / Facebook 排到最前面。
 */
export const PLATFORM_KEYS = [
  "linkedin",
  "facebook",
  "tiktok",
  "messenger",
  "telegram",
  "teams",
] as PlatformKey[];

// ============================================================
// 平台图标组件（含 hover 动效 + 展开按钮）
// ============================================================

interface PlatformIconProps {
  platform: PlatformKey;
  isActive: boolean;
  unreadCount?: number;
  onClick: () => void;
  onExpand?: () => void;
}

export const PlatformIcon: FC<PlatformIconProps> = ({
  platform,
  isActive,
  unreadCount = 0,
  onClick,
  onExpand,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = PLATFORMS[platform];

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 主图标 */}
      <div
        className={cn(
          "w-[48px] h-[48px] rounded-[12px] flex items-center justify-center cursor-pointer",
          "transition-all duration-200 ease-out",
          isActive
            ? "shadow-lg scale-[1.02]"
            : "hover:scale-[1.08] hover:shadow-md",
        )}
        style={{
          background: isActive ? config.color : isHovered ? config.colorLight : "#F0F0F0",
          boxShadow: isActive ? `0 2px 12px ${config.color}40` : undefined,
        }}
        onClick={onClick}
        title={config.name}
      >
        <div
          className={cn("transition-colors duration-200")}
          style={{ color: isActive ? "white" : isHovered ? config.color : "#888" }}
        >
          {config.icon}
        </div>
      </div>

      {/* 未读提示：有客户来信就点一个红点，**不显示条数**（老板 2026-10-20 拍板）。
          条数对本产品没有意义 —— 系统只关心「有没有新消息要处理」。 */}
      {unreadCount > 0 && (
        <span
          className="absolute -top-[1px] -right-[1px] w-[10px] h-[10px] rounded-full bg-[#FF3B30] border-2 border-white z-10"
          aria-label="有新消息"
        />
      )}

      {/* hover 时显示展开按钮（显示该平台客户列表） */}
      {isHovered && onExpand && (
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-full bg-white border border-[#E0DDD6] shadow-sm flex items-center justify-center cursor-pointer z-10 hover:bg-[#F7F6F3] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          title="展开客户列表"
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M3 1L6 4L3 7" fill="none" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 平台 WebView 组件（真实 Tauri 子 WebView 内嵌）
// ============================================================

/**
 * 从占位容器的真实位置换算出 Rust 侧需要的布局。
 *
 * 关键：Rust 的 WebviewLayoutOptions 只认 left / top / right / bottom / width / height，
 * 不支持 x / y（传 x/y 会被当成 left=0, top=0，导致网页盖住整个界面）。
 * 这里用 right / bottom 而不是 width / height，可以让 Rust 侧的 auto_resize
 * 在窗口缩放时自动重算尺寸，不需要前端反复纠正。
 */
const measureLayout = (el: HTMLElement | null) => {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return null;
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(Math.max(0, window.innerWidth - rect.right)),
    bottom: Math.round(Math.max(0, window.innerHeight - rect.bottom)),
  };
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface PlatformWebViewProps {
  platform: PlatformKey;
  isVisible: boolean;
  /**
   * 该平台账号绑定的代理（来自 database: platform_account.proxy_id → proxy_config）。
   * 形如 http://user:pass@host:port 或 socks5://host:port。
   * 这是「一人多号 + 每号独立 IP」的基础：每个账号走自己的出口 IP。
   */
  proxyUrl?: string;
  /** 该平台账号绑定的 User-Agent（来自 platform_account.user_agent），为空则用 WebView 默认值 */
  userAgent?: string;
  /** 该平台账号 id（用于日志/后续监听链路） */
  platformAccountId?: number;
}

export const PlatformWebView: FC<PlatformWebViewProps> = ({
  platform,
  isVisible,
  proxyUrl,
  userAgent,
  platformAccountId,
}) => {
  const config = PLATFORMS[platform];
  const webviewId = `platform-${platform}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  /**
   * 代理被降级为直连时的提示文案（非空即显示黄条）。
   *
   * 来源：Rust 侧在建窗口前会对该账号绑定的代理做一次 TCP 连通性预检，
   * 探不通就抛 ProxyUnavailable 事件，并**保留代理、拒绝直连**。
   *
   * 为什么不直连：中国 IP 裸连 LinkedIn 这类按出口 IP 判定地区的平台，
   * 会被当场作废登录态（第二天打开又要重新登录）甚至风控封号。
   * 宁可给一张连不上的报错页，也不能让账号裸奔。
   *
   * 不提示的话，用户会以为是「平台登不上」，而实际原因是
   * database: proxy_config 里存了一个连不上的地址
   * （种子数据里就有一条 us-proxy.example.com:1080）。
   */
  const [proxyNotice, setProxyNotice] = useState("");
  /**
   * 「访问被重定向到已停服的本地化站点」提示（非空即显示红条）。
   *
   * 背景：平台会按**出口 IP** 判定地区。LinkedIn 一旦判定为受限地区，
   * 会把请求 302 到 linkedin.cn（领英中国），而该站点早已停服并返回
   * HTTP 451 Unavailable For Legal Reasons —— WebView 里渲染出来就是一张纯白页，
   * 界面上没有任何线索，看起来像「程序坏了」。
   * Rust 侧在 on_navigation 里识别到这种重定向后抛出本事件，这里如实告知用户，
   * 并指向正确的解法（给该账号配境外出口代理）。
   */
  const [regionNotice, setRegionNotice] = useState("");
  /**
   * 「登录态失效，被踢到登录页」提示（非空即显示红条）。
   *
   * 这是 2026-10-20 真事故的产物：重启后代理没起来 → 直连中国 IP → 平台判定异常
   * → 页面被踢到 /signIn。监听脚本还在跑，但永远判不到可监听页面，
   * 表现是「软件看着正常，其实一条消息都收不到」，而且只有 debug 日志，没人能发现。
   * 现在由 Rust 侧在 on_navigation 里识别并抛事件，界面上直接告诉你。
   */
  const [loginNotice, setLoginNotice] = useState("");

  // ------------------------------------------------------------
  // 0. 监听「代理不可用」事件（Rust 侧在建窗口前预检失败时抛出）
  //
  // 必须注册在创建 WebView 的 effect 之前：两者在同一次 commit 中按声明顺序执行，
  // 创建流程只做到「发出 IPC」就让出主线程，所以这里的监听一定先于 Rust 的 emit 就绪。
  // ------------------------------------------------------------
  useEffect(() => {
    const unlisten = listen<{ webviewId?: string; proxyUrl?: string; reason?: string }>(
      "ProxyUnavailable",
      (event) => {
        const data = event.payload;
        if (!data || data.webviewId !== webviewId) return;
        setProxyNotice(
          `${data.proxyUrl ?? "绑定的代理"} 连不上（${data.reason ?? "未知原因"}）。` +
            `已阻止直连（中国 IP 会让平台作废登录态甚至风控封号），` +
            `请打开 Clash 等代理软件后重试`,
        );
      },
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [webviewId]);

  // ------------------------------------------------------------
  // 0b. 监听「被重定向到受限地区站点」事件（Rust 侧 on_navigation 抛出）
  // ------------------------------------------------------------
  useEffect(() => {
    const unlisten = listen<{ webviewId?: string; url?: string }>(
      "PlatformRegionBlocked",
      (event) => {
        const data = event.payload;
        if (!data || data.webviewId !== webviewId) return;
        setRegionNotice(
          `${config.name} 判定当前出口 IP 属于受限地区，请求已被重定向到已经停服的本地化站点` +
            `（HTTP 451），所以这一片是空白的。请给该平台账号配置一个境外出口 IP 的代理，` +
            `再点「刷新」重试。`,
        );
      },
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [webviewId, config.name]);

  // ------------------------------------------------------------
  // 0c. 监听「平台把页面踢到登录/验证页」（Rust 侧 on_navigation 抛出）
  // ------------------------------------------------------------
  useEffect(() => {
    const unlisten = listen<{ webviewId?: string; url?: string }>(
      "PlatformNeedRelogin",
      (event) => {
        const data = event.payload;
        // ⚠️ 诊断日志必须在 webviewId 过滤**之前**（2026-10-21）。
        // 之前放在过滤之后，结果业务员报「没提示」时根本没法判断
        // 是「Rust 没抛事件」还是「抛了但 webviewId 对不上被这里 return 了」。
        console.log(
          `[PlatformWebView] PlatformNeedRelogin 到达 载荷=${JSON.stringify(data)} 期望=${webviewId}`,
        );
        if (!data || data.webviewId !== webviewId) {
          console.log(
            `[PlatformWebView] 但 webviewId 不匹配，忽略（收到=${data?.webviewId ?? "空"} 期望=${webviewId}）`,
          );
          return;
        }
        setLoginNotice(
          `${config.name} 的登录态失效了（页面被跳到了登录/验证页），消息监听现在是停的。` +
            `请先确认代理已启动，再在下面这个网页里重新登录；登录成功后会自动恢复监听。`,
        );
      },
    );

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [webviewId, config.name]);

  // ------------------------------------------------------------
  // 0d. 页面恢复正常（登录成功 / 进到消息页）→ 把红条收起来
  //
  // 没有这个的话，业务员直接在网页里登录成功后，红条还挂着「监听已停止」，
  // 他会以为还是坏的。Rust 侧每次导航到非登录页时都会抛一次，这里幂等清空。
  // ------------------------------------------------------------
  useEffect(() => {
    const unlisten = listen<{ webviewId?: string }>("PlatformReloginResolved", (event) => {
      const data = event.payload;
      if (!data || data.webviewId !== webviewId) return;
      setLoginNotice("");
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [webviewId]);

  // ------------------------------------------------------------
  // 0e. 注入脚本报告「当前这个页面监听不了」→ 显示红条（2026-10-21）
  //
  // 这是最终兜底方案，也是最可靠的一条：
  // Rust 的 on_navigation 抓不到**跨域重定向**（实测 LinkedIn 登录失效会跳到
  // accounts.google.com/signIn 走 Google 登录），红条因此从来不出现；
  // 但注入脚本是主动轮询 URL/DOM 的，页面跑到哪儿它都知道。
  // payload.reason 为空串 = 页面恢复正常，据此把红条收起来。
  // ------------------------------------------------------------
  useEffect(() => {
    const handler = (msg: any) => {
      const p = msg?.payload;
      if (!p?.platform) return;
      // 注入脚本传的 platform 是 "Linkedin"（首字母大写），这里统一小写比较
      if (String(p.platform).toLowerCase() !== platform.toLowerCase()) return;
      // 用 mainLogger 而不是 console.log：主窗口的 console 不一定被日志收集，
      // 这条记录是「界面到底收没收到」的唯一确凿依据，必须可靠。
      mainLogger.info(
        `[watcherAlert] ${p.platform} 可监听=${!p.reason} 停在=${String(p.url ?? "").slice(0, 90)}`,
      );
      setLoginNotice(p.reason ?? "");
    };
    webviewChannel.emitter.on(EChannelMessageEventType.watcherAlert, handler);

    return () => {
      webviewChannel.emitter.off(EChannelMessageEventType.watcherAlert, handler);
    };
  }, [platform]);

  /** 组装 Rust 侧 WebviewOptions */
  const buildOptions = useCallback(
    (layout: { left: number; top: number; right: number; bottom: number }) => ({
      id: webviewId,
      url: config.url,
      layout,
      active: true,
      visible: true,
      acceptFirstMouse: true,
      dataStoreIdentifier: config.dataStoreIdentifier,
      // 代理 / UA 由该平台账号在数据库里的绑定决定（可为空）
      proxyUrl: proxyUrl || undefined,
      userAgent: userAgent || undefined,
      platformAccountId,
      // 必须传 platform：Rust 侧只有拿到它才会注入 preload 脚本
      // （webview.rs: `if let Some(_platform) = options.platform`）。
      // 注入后 gcEngine 会在平台网页里挂载，把监听到的客户消息
      // 通过 webviewChannel 抛回宿主，最终汇总进聚合消息栏。
      platform,
    }),
    [webviewId, platform, config.url, config.dataStoreIdentifier, proxyUrl, userAgent, platformAccountId],
  );

  // ------------------------------------------------------------
  // 1. 创建 / 显示 WebView
  // ------------------------------------------------------------
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    let raf = 0;
    // 容器尚未完成布局时的重试计数。
    // 没有上限的话，「测不到尺寸 → 下一帧重试」会变成每帧一次 getBoundingClientRect
    // 的死循环，一直烧 CPU（也会连带把内嵌网页拖慢）。
    let measureRetries = 0;
    const MAX_MEASURE_RETRIES = 60;

    const ensure = async () => {
      const layout = measureLayout(hostRef.current);
      if (!layout) {
        if (measureRetries++ >= MAX_MEASURE_RETRIES) {
          if (!cancelled) {
            setStatus("error");
            setErrorMsg("宿主区域尺寸为 0，无法定位内嵌网页（窗口是否被最小化？）");
          }
          return;
        }
        // 容器还没布局完成，下一帧再试
        raf = requestAnimationFrame(() => void ensure());
        return;
      }
      try {
        setStatus("loading");
        setErrorMsg("");
        // 每次（重新）创建前清掉上一次的代理降级提示，
        // 让新一次预检的结果重新决定是否展示。
        setProxyNotice("");
        setRegionNotice("");
        // open_webview：不存在则创建并显示，已存在则直接显示。
        // 这里不再额外调一次 show_webview —— Rust 侧 open_webview 内部已经 show 过，
        // 多一次 IPC 只会拉长「点平台 → 网页出现」的等待时间。
        await invoke("open_webview", { options: buildOptions(layout) });
        if (!cancelled) setStatus("ready");
      } catch (err) {
        console.error(`[${platform}] 创建内嵌 WebView 失败:`, err);
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(String(err));
        }
      }
    };

    // StrictMode 双挂载保护：延后一拍再创建。
    //
    // 开发模式下 React 会把 effect 执行两遍（挂载 → 卸载 → 再挂载）。
    // 若第一遍立刻 invoke("open_webview")，这两次调用会在 Rust 侧**并发**进入
    // 「app.get_webview() 查不到 → 走创建」的分支，同一个平台就被创建两遍；
    // 第二个会撞上 WebView label 冲突，并且第一个还没注册完就又被操作，
    // 结果是内嵌网页白屏 / 叠影 / 位置错乱。
    // 延迟到下一个宏任务再创建：若这一拍内组件被卸载（正是第一遍挂载），直接取消。
    const timer = window.setTimeout(() => void ensure(), 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isVisible, platform, buildOptions, webviewId]);

  // 说明：隐藏 WebView 的职责统一放在 Dashboard（按 activePlatform 隐藏其它平台）。
  // 不在这里按卸载隐藏，否则 React StrictMode 的「挂载→卸载→再挂载」会与
  // 创建流程抢时序，出现「网页创建成功却一直不显示」的问题。

  // ------------------------------------------------------------
  // 3. 监听 Rust 抛出的加载状态事件（WebviewChannel）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!isVisible) return;
    const unlisten = listen<{
      senderId?: string;
      type?: string;
      payload?: { status?: string };
    }>("WebviewChannel", (event) => {
      const data = event.payload;
      if (!data || data.senderId !== webviewId) return;

      if (data.type === "loadingProgress") {
        const st = data.payload?.status;
        if (st === "started" || st === "navigation") setStatus("loading");
        if (st === "finished") setStatus("ready");
      }
    });

    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [isVisible, webviewId]);

  // ------------------------------------------------------------
  // 4. DOM 布局变化时同步内嵌网页边界（侧栏收起/展开、平台切换、窗口缩放）
  //
  // 两处优化：
  // ① 记住上一次真正下发过的布局，值没变就直接跳过。
  //    窗口缩放时宿主容器的 left / top / right / bottom 其实不变
  //    （都随窗口等量变化），这类尺寸变化由 Rust 侧的全局监听器统一处理；
  //    不去重的话，同一件事会被「前端 ResizeObserver」与「Rust 窗口监听器」
  //    两套机制各做一遍，重复触发 WebView2 重排。
  // ② 用 requestAnimationFrame 合并同一帧内的多次触发。
  // ------------------------------------------------------------
  const lastLayoutKeyRef = useRef("");

  useEffect(() => {
    if (!isVisible) return;

    let raf = 0;
    const sync = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const layout = measureLayout(hostRef.current);
        if (!layout) return;
        const key = `${layout.left},${layout.top},${layout.right},${layout.bottom}`;
        if (key === lastLayoutKeyRef.current) return;
        lastLayoutKeyRef.current = key;
        invoke("set_webview_bounds", { webviewId, layout }).catch(() => {});
      });
    };

    window.addEventListener("resize", sync);
    const ro = new ResizeObserver(sync);
    if (hostRef.current) ro.observe(hostRef.current);

    return () => {
      window.removeEventListener("resize", sync);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isVisible, webviewId]);

  // ------------------------------------------------------------
  // 工具条动作
  // ------------------------------------------------------------
  const handleReload = useCallback(async () => {
    const layout = measureLayout(hostRef.current);
    if (!layout) return;
    try {
      setStatus("loading");
      await invoke("reload_webview", { options: buildOptions(layout) });
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setErrorMsg(String(err));
    }
  }, [buildOptions]);

  const handleToggleDevtools = useCallback(() => {
    invoke("toggle_devtools", { webviewId }).catch(() => {});
  }, [webviewId]);

  const statusText =
    status === "error"
      ? "加载失败"
      : status === "loading"
        ? "加载中..."
        : status === "ready"
          ? "已连接"
          : "待启动";
  const statusColor =
    status === "error" ? "#FF3B30" : status === "loading" ? "#FF9500" : "#25D366";

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* 平台彩色头部（DOM 渲染，WebView 只占下方区域） */}
      <div
        className="h-[52px] flex items-center px-4 gap-3 border-b border-[#E0DDD6] flex-shrink-0"
        style={{ background: config.color }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 text-white">
          {config.icon}
        </div>
        <span className="text-white font-medium text-[15px]">{config.name}</span>
        <span className="text-white/70 text-[12px] px-2 py-0.5 rounded bg-white/15">内嵌网页</span>
        {proxyNotice && (
          <span
            className="text-white text-[11px] px-2 py-0.5 rounded bg-black/25"
            title={proxyNotice}
          >
            直连（代理不可用）
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
          <span className="text-white/80 text-[12px]">{statusText}</span>

          <button
            onClick={handleReload}
            className="ml-2 h-7 px-3 rounded-md bg-white/15 hover:bg-white/25 text-white text-[12px] transition-colors"
            title="重新加载平台网页"
          >
            刷新
          </button>
          <button
            onClick={handleToggleDevtools}
            className="h-7 px-3 rounded-md bg-white/15 hover:bg-white/25 text-white text-[12px] transition-colors"
            title="打开/关闭开发者工具（仅开发模式）"
          >
            调试
          </button>
        </div>
      </div>

      {/* 登录态失效提示条（监听已停止，最严重，排最上面） */}
      {/* 同样必须落在 WebView 宿主区域**之外**，否则会被真实网页盖住、根本无法阅读。 */}
      {loginNotice && (
        <div className="flex-shrink-0 flex items-start gap-2 px-4 py-2 bg-[#FFF1F0] border-b border-[#FFCCC7]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#FF3B30] flex-shrink-0 mt-[7px]" />
          <span className="text-[12px] text-[#A8071A] leading-relaxed flex-1">
            <strong className="font-semibold">消息监听已停止：</strong>
            {loginNotice}
          </span>
          {/*
            「重新登录」按钮（2026-10-21 加）：
            原来这里只有「知道了」，业务员点完就关掉了，不知道下一步该干嘛。
            现在直接给他一个动作：点一下 = 清掉提示 + 重新加载平台页面，回到登录界面。
            登录成功后进到消息页，监听会自动恢复；如果又被踢，Rust 会再次抛事件、红条重新出现。
          */}
          <button
            onClick={() => {
              setLoginNotice("");
              handleReload();
            }}
            className="flex-shrink-0 h-7 px-3 rounded-md bg-[#FF3B30] hover:bg-[#D9363E] text-white text-[12px] transition-colors"
          >
            重新登录
          </button>
          <button
            onClick={() => setLoginNotice("")}
            className="flex-shrink-0 text-[12px] text-[#A8071A] underline hover:no-underline"
          >
            知道了
          </button>
        </div>
      )}

      {/* 地区受限提示条（比代理降级更严重，排在上面） */}
      {/* 同样必须落在 WebView 宿主区域**之外**，否则会被真实网页盖住、根本无法阅读。 */}
      {regionNotice && (
        <div className="flex-shrink-0 flex items-start gap-2 px-4 py-2 bg-[#FFF1F0] border-b border-[#FFCCC7]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#FF3B30] flex-shrink-0 mt-[7px]" />
          <span className="text-[12px] text-[#A8071A] leading-relaxed flex-1">{regionNotice}</span>
          <button
            onClick={() => setRegionNotice("")}
            className="flex-shrink-0 text-[12px] text-[#A8071A] underline hover:no-underline"
          >
            知道了
          </button>
        </div>
      )}

      {/* 代理降级提示条 */}
      {/* 位置很关键：必须落在 WebView 宿主区域**之外**（宿主区域会被真实网页覆盖）， */}
      {/* 所以贴在平台头部下方；宿主区域高度随之减小，measureLayout 会重新量取 top。 */}
      {proxyNotice && (
        <div className="h-[30px] flex-shrink-0 flex items-center gap-2 px-4 bg-[#FFF7E6] border-b border-[#FFE0A3]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#FF9500] flex-shrink-0" />
          <span className="text-[12px] text-[#8A5A00] truncate" title={proxyNotice}>
            {proxyNotice}
          </span>
          <button
            onClick={() => setProxyNotice("")}
            className="ml-auto flex-shrink-0 text-[12px] text-[#8A5A00] underline hover:no-underline"
          >
            知道了
          </button>
        </div>
      )}

      {/* WebView 宿主区域：真实网页由 Tauri 创建并覆盖在这一块上 */}
      <div ref={hostRef} className="flex-1 relative bg-white overflow-hidden">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EFEAE2]">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-[20px] mx-auto mb-5 flex items-center justify-center shadow-lg"
                style={{ background: config.color }}
              >
                <div className="text-white scale-150">{config.icon}</div>
              </div>
              <p className="text-[#444] text-[18px] font-semibold mb-2">{config.name} 网页版</p>
              <p className="text-[#AAA] text-[13px] leading-relaxed">正在加载 {config.url}</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#FFFBFA]">
            <div className="text-center max-w-[420px] px-6">
              <p className="text-[#FF3B30] text-[16px] font-semibold mb-2">
                内嵌 {config.name} 失败
              </p>
              <p className="text-[#888] text-[12px] break-all leading-relaxed">{errorMsg}</p>
              <button
                onClick={handleReload}
                className="mt-4 h-9 px-5 rounded-lg bg-[#0088CC] text-white text-[13px]"
              >
                重试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
