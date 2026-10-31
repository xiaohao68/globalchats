import { FC, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PlatformSidebar } from "@/components/layouts/left-sidebar/PlatformSidebar";
import { PlatformWebView, PlatformKey, PLATFORM_KEYS, PLATFORMS } from "@/components/PlatformWebView";
import { AggregatedView } from "@/modules/aggregated-chat/AggregatedView";
import { api, PlatformAccount, ProxyConfig, UnreadSnapshot } from "@/services/api";
import { EChannelMessageEventType, webviewChannel, type IIncomingMessage } from "@gc/webview";

type ActiveView = PlatformKey | "aggregate";
type LoginStatus = "logged_in" | "logged_out" | "unknown";

/** 从登录时写入的 localStorage 里取当前业务员 id */
const readUserId = (): number => {
  try {
    const raw = localStorage.getItem("gc_user");
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: number } | null;
      if (parsed && typeof parsed.id === "number") return parsed.id;
    }
  } catch {
    // ignore
  }
  // 兜底：本机固定账号。正常由 main.tsx 启动时写入，走到这里说明写入失败
  return 1;
};

/** 取当前业务员的用户名（只用于给自动登记的账号起个能认出来的名字） */
const readUsername = (): string => {
  try {
    const raw = localStorage.getItem("gc_user");
    if (raw) {
      const parsed = JSON.parse(raw) as { username?: string } | null;
      if (parsed?.username) return parsed.username;
    }
  } catch {
    // ignore
  }
  return "";
};

/** 自动登记时给这条账号记录起的默认名字，如 `lisi 的 Facebook` */
const autoAccountName = (platform: string): string => {
  const label = PLATFORMS[platform as PlatformKey]?.name ?? platform;
  const who = readUsername();
  return who ? `${who} 的 ${label}` : `自动登记 · ${label}`;
};

/** 把 proxy_config 一行拼成 WebView 能用的代理地址 */
export const buildProxyUrl = (p: ProxyConfig): string => {
  const scheme = p.proxy_type === "socks5" ? "socks5" : "http";
  const auth = p.username
    ? `${encodeURIComponent(p.username)}:${encodeURIComponent(p.password ?? "")}@`
    : "";
  return `${scheme}://${auth}${p.host}:${p.port}`;
};

/** 每个平台账号的代理 / UA（决定内嵌 WebView 的出口 IP 与浏览器身份） */
type AccountMeta = { proxyUrl?: string; userAgent?: string };

type AccountBuckets = {
  idsByPlatform: Record<string, number[]>;
  unreadByPlatform: Record<string, number>;
  loginByPlatform: Record<string, LoginStatus>;
  metaByPlatform: Record<string, AccountMeta>;
  totalUnread: number;
};

const EMPTY_BUCKETS: AccountBuckets = {
  idsByPlatform: {},
  unreadByPlatform: {},
  loginByPlatform: {},
  metaByPlatform: {},
  totalUnread: 0,
};

/**
 * 同时保持「常驻」的平台网页数量，其余平台切走即回收。
 *
 * 背景（实测数据）：每个平台网页都是一个完整的浏览器实例，WebView2 会为它
 * 拉起多个进程。原先只 hide 不 close，点过 6 个平台后累计 69 个进程、5.3 GB 内存，
 * CPU 与内存被后台网页瓜分，表现为「点平台要等几秒、点网页里的按钮也延迟」。
 * 隐藏（hide）只是把窗口藏起来，进程与 JS 仍在运行，所以必须真正 close。
 *
 * 保留最近使用的 N 个：当前平台 + 上一个用过的平台，切这两个是秒切；
 * 其余平台 close 后登录态仍留在各自的磁盘分区目录（Partitions/<uuid>/），
 * 点回来重新加载即可，不需要重新扫码登录。
 */
const KEEP_ALIVE = 2;

/**
 * 「永不回收」的平台 —— 消息监听所在的平台必须常驻。
 *
 * 为什么：客户来信监听是**注入在平台网页里的脚本**在跑（preload → gcEngine）。
 * 一旦 WebView 被 close，进程和脚本一起消失，切到别的平台期间客户发来的消息
 * 就全部漏掉，切回来也补不回来（DOM 里已经不是「新消息」了）。
 *
 * 所以这些平台即使被挤出「最近使用」窗口，也只 hide 不 close：
 * 窗口看不见，但进程、WebSocket、注入脚本都在后台继续工作。
 * 代价是常驻一个浏览器实例的内存 —— 换来的是「切走了也照样收到消息」。
 */
const PINNED_PLATFORMS: PlatformKey[] = ["linkedin", "facebook"];

/**
 * 「释放常驻平台网页」的延迟任务句柄。
 *
 * 为什么不立即释放：React 在开发模式（StrictMode）下会把组件按
 * 「挂载 → 卸载 → 再挂载」执行两遍。如果卸载时立刻 close，开发环境每次启动都会
 * 白白创建一轮内嵌网页、马上销毁、再重新创建一遍
 * （实测日志里表现为 close_webview 紧跟两条 open_webview），既拖慢首屏也污染日志。
 * 这里把释放延后 400ms，组件若很快重新挂载就取消 —— 只有真正离开主界面才执行。
 * 放在模块级而不是 useRef，是为了让「新挂载的实例」能取消「上一个实例」排队的任务。
 */
let platformReleaseTimer: number | null = null;

export const Dashboard: FC = () => {
  const [userId] = useState<number>(readUserId);
  // 默认落在 LinkedIn 而不是 Telegram：
  // Telegram Web 首屏就是手机号登录页，业务员一打开会以为「软件要登录」；
  // 而且 Telegram 是我们唯一不支持监听的平台。LinkedIn 才是外贸主战场。
  const [activeView, setActiveView] = useState<ActiveView>("linkedin");
  const [buckets, setBuckets] = useState<AccountBuckets>(EMPTY_BUCKETS);
  // 账号 / 代理信息就绪后再创建内嵌 WebView。
  // 原因：代理与 User-Agent 只能在创建 WebView 时一次性传入，若先建后改，
  // 已有的 open_webview 只会把旧窗口显示出来，代理不会生效。
  const [bucketsReady, setBucketsReady] = useState(false);
  /**
   * 未读计数刷新开关：客户卡片被点开（该客户未读已清零）后 +1，
   * 让下面那段「账号 / 会话」加载重算各平台未读，
   * 左侧平台栏与收起后窄轨上的红点才会跟着灭掉。
   */
  const [bucketsRefreshKey, setBucketsRefreshKey] = useState(0);

  /**
   * 聚合消息栏的刷新开关。
   *
   * 每监听到一条「新」消息就 +1，作为 prop 传给 AggregatedView 触发它重新拉库。
   * 用递增数字而不是布尔，是为了让「连续两条新消息」也能各触发一次刷新。
   */
  const [aggregateRefreshKey, setAggregateRefreshKey] = useState(0);
  const refreshAggregate = useCallback(() => setAggregateRefreshKey((n) => n + 1), []);

  // ---------------------------------------------------------------
  // 加载该业务员的平台账号 + 会话，算出各平台未读角标 / 登录状态
  // ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [accounts, conversations, proxies] = await Promise.all([
          api.getPlatformAccounts(userId),
          api.getConversations(userId),
          // 代理配置：平台账号通过 proxy_id 关联，用来给内嵌 WebView 指定出口 IP
          api.getProxyConfigs(userId).catch(() => [] as ProxyConfig[]),
        ]);

        const idsByPlatform: Record<string, number[]> = {};
        const loginByPlatform: Record<string, LoginStatus> = {};
        const metaByPlatform: Record<string, AccountMeta> = {};
        const proxyById = new Map<number, ProxyConfig>(
          proxies.map((p: ProxyConfig) => [p.id, p]),
        );

        accounts.forEach((acc: PlatformAccount) => {
          const list = idsByPlatform[acc.platform] ?? [];
          list.push(acc.id);
          idsByPlatform[acc.platform] = list;

          const current = loginByPlatform[acc.platform];
          if (acc.login_status === "logged_in") {
            loginByPlatform[acc.platform] = "logged_in";
          } else if (current !== "logged_in") {
            loginByPlatform[acc.platform] = "logged_out";
          }

          // 同一平台的第一个账号决定该平台内嵌 WebView 的代理 / UA
          if (!metaByPlatform[acc.platform]) {
            const meta: AccountMeta = {};
            if (acc.proxy_id != null) {
              const proxy = proxyById.get(acc.proxy_id);
              if (proxy) meta.proxyUrl = buildProxyUrl(proxy);
            }
            if (acc.user_agent) meta.userAgent = acc.user_agent;
            metaByPlatform[acc.platform] = meta;
          }
        });

        const accountPlatform = new Map<number, string>(
          accounts.map((a: PlatformAccount) => [a.id, a.platform]),
        );

        const unreadByPlatform: Record<string, number> = {};
        let totalUnread = 0;

        conversations
          .filter((conv) => conv.status !== "archived" && conv.status !== "closed")
          .forEach((conv) => {
            const platform = accountPlatform.get(conv.platform_account_id);
            if (!platform) return;
            const unread = conv.unread_count ?? 0;
            unreadByPlatform[platform] = (unreadByPlatform[platform] ?? 0) + unread;
            totalUnread += unread;
          });

        if (!cancelled) {
          setBuckets({
            idsByPlatform,
            unreadByPlatform,
            loginByPlatform,
            metaByPlatform,
            totalUnread,
          });
          setBucketsReady(true);
        }
      } catch (err) {
        console.error("加载平台账号/会话失败:", err);
        if (!cancelled) {
          setBuckets(EMPTY_BUCKETS);
          // 加载失败也要放行，否则内嵌网页永远不会出现
          setBucketsReady(true);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, bucketsRefreshKey]);

  // ---------------------------------------------------------------
  // 实时监听落库
  //
  // 链路：平台 WebView 的注入脚本监听到客户新消息
  //       → webviewChannel（senderId = "platform-linkedin"）
  //       → 这里补全「业务员 id + 平台账号 id」
  //       → invoke record_incoming_message_cmd 落库
  //       → 聚合消息栏重新拉取
  //
  // 为什么「补全」放在宿主：注入脚本跑在平台网页里，它只知道自己在哪个平台，
  // 拿不到数据库侧的 userId / platform_account_id；
  // 而宿主这边有 buckets 现成的「平台 → 账号 id」映射。
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!bucketsReady) return;

    const handleIncoming = async (message: unknown) => {
      const { senderId, payload } = message as {
        senderId: string;
        payload: IIncomingMessage;
      };
      if (!payload?.conversationExternalId || !payload?.messageExternalId) return;

      // 平台 WebView 的 label 形如 platform-linkedin
      const platform = payload.platform || senderId.replace(/^platform-/, "");

      // 兜底自动登记：正常流程下用户一打开平台就已经登记好了（见下面那个 effect），
      // 这里只处理「漏网」的情况 —— 比如消息在登记完成之前就到了。
      // 绝不能再像以前那样直接丢弃：丢一条就少一条客户来信，而且补不回来。
      let platformAccountId = buckets.idsByPlatform[platform]?.[0];
      if (!platformAccountId) {
        try {
          platformAccountId = await api.ensurePlatformAccount(
            userId,
            platform,
            autoAccountName(platform),
          );
          console.log(`[监听] 平台 ${platform} 没有账号记录，已自动登记 id=${platformAccountId}`);
          // 让 buckets 重新加载，后续消息就能直接从映射里取到
          setBucketsRefreshKey((n) => n + 1);
        } catch (err) {
          console.error(`[监听] 平台 ${platform} 自动登记失败，这条消息只能丢弃:`, err);
          return;
        }
      }

      try {
        const result = await api.recordIncomingMessage({
          userId,
          platformAccountId,
          platform,
          conversationExternalId: payload.conversationExternalId,
          customerExternalId: payload.customerExternalId,
          customerName: payload.customerName,
          customerAvatar: payload.customerAvatar,
          isGroup: payload.isGroup,
          messageExternalId: payload.messageExternalId,
          content: payload.content,
          contentType: payload.contentType,
          senderType: payload.senderType,
          senderName: payload.senderName,
          sentAt: payload.sentAt,
        });
        // isNew === false 是幂等命中（同一条消息被观察器抓到多次），不刷新，避免无谓重排
        if (result.isNew) {
          console.log(
            `[监听] 新消息已入库 平台=${platform} 会话=${result.conversationId} 客户=${result.customerId}`,
          );
          refreshAggregate();
          // ⚠️ 这里必须一并重算「未读角标」。
          // 左侧平台栏和底部聚合按钮的红点读的是 buckets（来自 getConversations 的
          // unread_count），以前只 refreshAggregate() 刷新了聚合列表，buckets 一直是旧的
          // —— 表现就是「聚合页里明明有新消息，左边聚合按钮却不亮」（2026-10-20 老板报的 bug）。
          setBucketsRefreshKey((n) => n + 1);
        }
      } catch (err) {
        console.error("[监听] 消息落库失败:", err);
      }
    };

    webviewChannel.emitter.on(EChannelMessageEventType.incomingMessage, handleIncoming);
    return () => {
      webviewChannel.emitter.off(EChannelMessageEventType.incomingMessage, handleIncoming);
    };
  }, [bucketsReady, buckets, userId, refreshAggregate]);

  // ---------------------------------------------------------------
  // 自动登记：业务员一打开某个平台，就确保他在这个平台有「户口」。
  //
  // 为什么放在「打开平台」而不是「收到消息」时：监听脚本挂在 WebView 里，
  // 页面一加载就开始跑，第一条客户来信可能比登记还早到。提前登记掉这个时序问题。
  //
  // 只在「该平台账号列表为空」时才调用，且用 ref 挡住重复请求：
  // 登记成功后会 setBucketsRefreshKey 触发 buckets 重载，届时 ids 非空，effect 自然停下。
  // ---------------------------------------------------------------
  const isAggregate = activeView === "aggregate";
  const activePlatform = isAggregate ? null : (activeView as PlatformKey);

  const ensuringRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!bucketsReady || !activePlatform) return;
    if ((buckets.idsByPlatform[activePlatform] ?? []).length > 0) return;
    if (ensuringRef.current.has(activePlatform)) return;

    ensuringRef.current.add(activePlatform);
    void api
      .ensurePlatformAccount(userId, activePlatform, autoAccountName(activePlatform))
      .then((id) => {
        console.log(`[自动登记] 平台 ${activePlatform} 已登记账号 id=${id}`);
        setBucketsRefreshKey((n) => n + 1);
      })
      .catch((err) => {
        console.error(`[自动登记] 平台 ${activePlatform} 登记失败:`, err);
      })
      .finally(() => {
        ensuringRef.current.delete(activePlatform);
      });
  }, [bucketsReady, activePlatform, buckets, userId]);

  // ---------------------------------------------------------------
  // 平台 WebView 的生命周期管理：按「最近使用」保留，超出的一律销毁
  //
  // 这是本轮性能优化的核心。原先的写法是「切换平台时把其它 5 个平台全部 hide」，
  // 但 hide 只是把窗口藏起来，进程、JS、WebSocket 都还在跑，内存也不会释放。
  // 实测点过 6 个平台后：69 个浏览器进程 / 5.3 GB 内存 —— 整机被拖慢。
  // 现在改为：
  //   · 保留最近使用的 KEEP_ALIVE 个（当前 + 上一个），互相切换是秒切；
  //   · 其余调用 close_webview 真正销毁，释放进程与内存；
  //   · close 不清数据，登录态仍在磁盘分区目录里，点回来无需重新登录。
  // ---------------------------------------------------------------
  const recentPlatformsRef = useRef<PlatformKey[]>([]);

  useEffect(() => {
    // 聚合页：不销毁任何常驻平台（用户随时可能切回去），只是先藏起来
    if (!activePlatform) {
      recentPlatformsRef.current.forEach((key) => {
        invoke("hide_webview", { webviewId: `platform-${key}` }).catch(() => {});
      });
      return;
    }

    // 更新「最近使用」顺序：当前平台置顶并去重
    const ordered = [
      activePlatform,
      ...recentPlatformsRef.current.filter((key) => key !== activePlatform),
    ];
    const keep = ordered.slice(0, KEEP_ALIVE);
    const release = ordered.slice(KEEP_ALIVE);
    recentPlatformsRef.current = keep;

    // 超出保留范围的平台：真正销毁，回收内存与进程。
    // 例外：监听到消息的平台（PINNED）只 hide 不 close —— 销毁它等于关掉监听。
    release.forEach((key) => {
      if (PINNED_PLATFORMS.includes(key)) {
        invoke("hide_webview", { webviewId: `platform-${key}` }).catch(() => {});
        return;
      }
      invoke("close_webview", { webviewId: `platform-${key}` }).catch(() => {});
    });

    // 保留范围内、但当前不显示的：隐藏即可（不销毁，切回来秒开）
    keep.forEach((key) => {
      if (key === activePlatform) return;
      invoke("hide_webview", { webviewId: `platform-${key}` }).catch(() => {});
    });
  }, [activePlatform]);

  // 离开主界面（退出登录 / 关闭窗口）时释放全部常驻平台网页。
  // 释放动作延后一拍，避开 StrictMode 在开发模式下的「卸载 → 再挂载」抖动，
  // 详见 platformReleaseTimer 的注释。
  useEffect(() => {
    if (platformReleaseTimer !== null) {
      window.clearTimeout(platformReleaseTimer);
      platformReleaseTimer = null;
    }
    return () => {
      platformReleaseTimer = window.setTimeout(() => {
        platformReleaseTimer = null;
        // 常驻平台（PINNED）不在 recentPlatformsRef 里，但它们同样占着进程，
        // 所以退出主界面时要显式一起关掉（此时不再需要监听）。
        [...recentPlatformsRef.current, ...PINNED_PLATFORMS].forEach((key) => {
          invoke("close_webview", { webviewId: `platform-${key}` }).catch(() => {});
        });
      }, 400);
    };
  }, []);

  const unreadCounts = useMemo(() => {
    const result: Partial<Record<PlatformKey | "aggregate", number>> = {
      aggregate: buckets.totalUnread,
    };
    PLATFORM_KEYS.forEach((key) => {
      result[key] = buckets.unreadByPlatform[key] ?? 0;
    });
    return result;
  }, [buckets]);

  /**
   * 用数据库返回的未读快照**直接覆盖**角标，不再二次查询。
   *
   * 为什么不重算：清未读的 UPDATE 与「重新拉列表」的 SELECT 并发跑在连接池的
   * 不同连接上（max_connections=4），查早了就读到旧 unread_count，
   * 红点就灭不掉。业务员看到的现象正是「点进去已读，红点时灭时不灭」。
   * 现在由 mark_conversation_read_cmd 把最新值一起带回来，时序问题从根上消失。
   */
  const applyUnreadSnapshot = useCallback((snapshot?: UnreadSnapshot) => {
    // total < 0 = 后端说「这条会话查不到，别动角标」（见 unread_snapshot_of_conversation_owner）
    if (!snapshot || typeof snapshot.total !== "number" || snapshot.total < 0) return;
    // 平台名统一过一遍 PLATFORMS，防止库里存的大小写/命名不一致导致对不上角标
    const byPlatform: Record<string, number> = {};
    Object.entries(snapshot.byPlatform ?? {}).forEach(([key, n]) => {
      const normalized = key in PLATFORMS ? key : key.toLowerCase();
      byPlatform[normalized] = (byPlatform[normalized] ?? 0) + (n ?? 0);
    });
    setBuckets((prev) => ({
      ...prev,
      unreadByPlatform: byPlatform,
      totalUnread: snapshot.total ?? 0,
    }));
  }, []);

  /**
   * 乐观扣减：点开客户卡片的一瞬间先把该平台角标减掉，界面立刻响应。
   * 随后 applyUnreadSnapshot 会用数据库真实值校准，所以这里算错也会被纠正。
   */
  const decrementUnread = useCallback((platform: PlatformKey, decrement: number) => {
    if (decrement <= 0) return;
    setBuckets((prev) => {
      const current = prev.unreadByPlatform[platform] ?? 0;
      const actual = Math.min(current, decrement);
      return {
        ...prev,
        unreadByPlatform: {
          ...prev.unreadByPlatform,
          [platform]: current - actual,
        },
        totalUnread: Math.max(0, prev.totalUnread - actual),
      };
    });
  }, []);

  /**
   * 记住最近一个「非聚合」视图。
   *
   * 聚合按钮是 **toggle**：再点一次要能收起聚合视图、回到这里。
   * 否则点了聚合之后只能靠「点别的平台」才关得掉（老板反馈的 bug）。
   */
  const lastPlatformRef = useRef<PlatformKey>("telegram");

  // 点平台（含重复点当前平台）→ 中间栏自动展开
  const handlePlatformChange = useCallback(
    (view: ActiveView) => {
      if (view === "aggregate" && activeView === "aggregate") {
        // 再点一次聚合按钮 → 收起聚合视图，回到上次看的平台
        setActiveView(lastPlatformRef.current);
      } else {
        if (view !== "aggregate") lastPlatformRef.current = view;
        setActiveView(view);
      }
    },
    [activeView],
  );

  /**
   * 从聚合页点某个客户 → 切到该平台。
   *
   * ⚠️ 注意：这里**只能切平台，不能真的打开那个会话**。
   * 内嵌网页是一个真实浏览器，要跳到某个会话必须有该平台的会话 URL，
   * 而我们库里的 `external_conversation_id` 是「名字派生」的（`linkedin:1v1:<名>`），
   * 不是平台侧的 thread id。**要真跳会话，得先把真实 thread id 存下来** —— 属于后续项。
   */
  const handleOpenFromAggregate = useCallback((platform: PlatformKey) => {
    lastPlatformRef.current = platform;
    setActiveView(platform);
  }, []);

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* 左侧平台栏 72px */}
      <PlatformSidebar
        activePlatform={activeView}
        onPlatformChange={handlePlatformChange}
        onExpandPlatform={(platform) => handlePlatformChange(platform)}
        unreadCounts={unreadCounts}
      />

      {/*
        主区域：平台内嵌页 / 聚合页。

        2026-10-16 老板拍板**去掉中间 320px 客户列表栏**：
        聚合页已经承担了「哪个平台、哪个客户有新消息」的职责，中栏是重复的；
        砍掉后这 320px 全部让给内嵌网页，平台页面本身大一圈（尤其 LinkedIn/FB 的消息区）。
        客户列表只在聚合模式下出现（点左栏底部的聚合按钮）。
      */}
      {activePlatform ? (
        bucketsReady ? (
          <PlatformWebView
            key={activePlatform}
            platform={activePlatform}
            isVisible={true}
            proxyUrl={buckets.metaByPlatform[activePlatform]?.proxyUrl}
            userAgent={buckets.metaByPlatform[activePlatform]?.userAgent}
            platformAccountId={buckets.idsByPlatform[activePlatform]?.[0]}
          />
        ) : (
          // 代理 / UA 只能在创建 WebView 时一次性传入，所以先等账号信息就绪。
          // 否则会先建成一个「无代理」的窗口，而 open_webview 对已存在的窗口
          // 只会显示、不会重建，代理就永远不生效了。
          <div className="flex flex-1 items-center justify-center bg-white text-[13px] text-[#888]">
            正在准备 {PLATFORMS[activePlatform].name} 内嵌窗口…
          </div>
        )
      ) : (
        <AggregatedView
          userId={userId}
          onOpenPlatform={handleOpenFromAggregate}
          refreshKey={aggregateRefreshKey}
          // 中栏被砍掉后，聚合页是**唯一**会清未读的地方。
          // 这里直接接住数据库返回的未读快照覆盖角标 —— 不再触发二次查询，
          // 否则查询与清未读并发，会读到旧值导致红点不灭（2026-10-21 业务员反馈）。
          onConversationsRead={applyUnreadSnapshot}
          onUnreadOptimistic={decrementUnread}
        />
      )}
    </div>
  );
};
