import { FC, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { cn } from "@gc/ui/lib/utils";
import { PLATFORMS, PLATFORM_KEYS, PlatformKey } from "@/components/PlatformWebView";
import { api, Conversation, Customer, PlatformAccount, UnreadSnapshot } from "@/services/api";
import { serverTimeMs } from "@/utils/datetime";

/** 数据库里的 platform 字符串 → 界面用的 PlatformKey（不认识的一律忽略） */
const toPlatformKey = (value: string): PlatformKey | null =>
  value in PLATFORMS ? (value as PlatformKey) : null;

interface AggregatedRow {
  /** 归并键：同一平台下「同一个客户名」只占一行 */
  nameKey: string;
  conversationId: number;
  /** 同组全部会话 id：点开时一次性把这些会话都标记为已读 / 已处理 */
  conversationIds: number[];
  customerId: number;
  platform: PlatformKey;
  customerName: string;
  content: string;
  /** 最新消息时间戳，只用于排序，界面上不显示时间（老板拍板） */
  sortAt: number;
  unread: number;
  /** 业务员手动标过「已处理」（落库为 conversation.status = 'handled'） */
  handled: boolean;
  initials: string;
}

/**
 * 一个平台的分组。
 *
 * 产品约定（老板确认）：
 *   · 聚合栏按**平台**归类，每个平台一条可展开/收起的消息栏，**默认全部收起**；
 *   · 平台栏上有红点 ⇔ 该平台下**任一**客户有未读；只有该平台下**所有**客户都读完，红点才灭；
 *   · 没有消息的平台也要显示成一条可展开的空分组；
 *   · **不显示时间**（老板拍板：这里只回答「有没有新消息」，不回答「几点来的」）；
 *   · 点开客户 → 红点灭但**行还在**；只有手动点「已处理」这行才消失。
 */
interface PlatformGroup {
  platform: PlatformKey;
  rows: AggregatedRow[];
  /** 组内未读合计（决定平台红点） */
  unread: number;
  /** 组内最新消息时间，用于分组排序（不显示） */
  latestAt: number;
}

/** 分组内排序：未读优先，其次按最新消息时间倒序 */
const sortRows = (list: AggregatedRow[]): AggregatedRow[] =>
  [...list].sort((a, b) => {
    if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
    return b.sortAt - a.sortAt;
  });

interface AggregatedViewProps {
  userId: number;
  /** 点击聚合条目 → 跳到对应平台（注意：无法直接打开会话，见 Dashboard 里的注释） */
  onOpenPlatform?: (platform: PlatformKey, customerId: number) => void;
  /**
   * 外部刷新开关：每监听到一条新消息，宿主会把它 +1。
   * 变化即重新拉取会话列表，让新消息顶到最前面。
   */
  refreshKey?: number;
  /**
   * 清掉未读之后，把**数据库带回来的最新未读快照**交给宿主覆盖红点。
   * 中栏 320px 客户列表被砍掉后，**聚合页是唯一会清未读的地方** ——
   * 不同步这个值，左栏平台图标上的角标会一直挂着不降。
   *
   * ⚠️ 以前这里是个无参回调，宿主收到后自己去 `getConversations` 重算，
   * 而那次查询和清未读的 UPDATE 是并发的（连接池 4 条），查早了就读到旧值
   * ⇒ 红点「时灭时不灭」。现在改成直接把快照传过去，不再二次查询。
   */
  onConversationsRead?: (snapshot?: UnreadSnapshot) => void;
  /**
   * 乐观扣减：点开卡片的一瞬间先按本地已知的未读数把角标减掉，
   * 让界面立刻响应（不用等数据库往返）。随后 onConversationsRead 会用
   * 数据库真实值再校准一次，所以这里减错了也会被纠正。
   */
  onUnreadOptimistic?: (platform: PlatformKey, decrement: number) => void;
}

const ChevronIcon: FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    aria-hidden="true"
    className={cn("transition-transform duration-150", open ? "rotate-90" : "rotate-0")}
  >
    <path
      d="M4 2.5 8 6l-4 3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AggregatedView: FC<AggregatedViewProps> = ({
  userId,
  onOpenPlatform,
  refreshKey = 0,
  onConversationsRead,
  onUnreadOptimistic,
}) => {
  const [rows, setRows] = useState<AggregatedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedId, setSelectedId] = useState<number | undefined>();
  /** 只有首次加载才展示「加载中…」；监听触发的刷新静默进行，免得列表闪一下 */
  const firstLoadRef = useRef(true);

  /** 展开状态：默认全部收起（老板确认） */
  const [expanded, setExpanded] = useState<Set<PlatformKey>>(() => new Set());
  /** 是否把「已处理」的会话也列出来（默认不列，标完即从待办里消掉） */
  const [showHandled, setShowHandled] = useState(false);
  /** 客户名搜索。中栏 320px 被砍掉后，搜索框搬到了这里 */
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();

  const togglePlatform = useCallback((platform: PlatformKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (firstLoadRef.current) setLoading(true);
      setErrorMsg("");
      try {
        const [accounts, conversations, customers] = await Promise.all([
          api.getPlatformAccounts(userId),
          api.getConversations(userId),
          api.getCustomers(userId),
        ]);

        const accountPlatform = new Map<number, string>(
          accounts.map((a: PlatformAccount) => [a.id, a.platform]),
        );
        const customerMap = new Map<number, Customer>(customers.map((c) => [c.id, c]));

        // 同一客户可能留下多条会话（历史版本用了不同的客户 external_id），
        // 这里按「平台 + 客户名」归并成一行，只保留最新那条消息 —— 对齐微信。
        const grouped = new Map<string, AggregatedRow>();

        conversations
          .filter((conv: Conversation) => conv.status !== "archived" && conv.status !== "closed")
          .forEach((conv) => {
            const rawPlatform = accountPlatform.get(conv.platform_account_id);
            if (!rawPlatform) return;
            const platform = toPlatformKey(rawPlatform);
            if (!platform) return;

            const customer = customerMap.get(conv.customer_id);
            const customerName = customer?.name?.trim() || `客户 #${conv.customer_id}`;
            const nameKey = `${platform}:${customerName.replace(/\s+/g, "").toLowerCase()}`;
            const sortAt = serverTimeMs(conv.last_message_at);
            const unread = conv.unread_count ?? 0;
            const content = conv.last_message_preview ?? "(暂无消息)";
            const handled = conv.status === "handled";

            const existing = grouped.get(nameKey);
            if (!existing) {
              grouped.set(nameKey, {
                nameKey,
                conversationId: conv.id,
                conversationIds: [conv.id],
                customerId: conv.customer_id,
                platform,
                customerName,
                content,
                sortAt,
                unread,
                handled,
                initials: customerName.trim().slice(0, 2).toUpperCase(),
              });
              return;
            }

            existing.conversationIds.push(conv.id);
            existing.unread += unread;
            // 只要还有一条没标「已处理」，整行就不算处理完
            existing.handled = existing.handled && handled;
            // 只把「最新」那条会话的预览留在行上，历史消息不上行
            if (sortAt >= existing.sortAt) {
              existing.sortAt = sortAt;
              existing.conversationId = conv.id;
              existing.customerId = conv.customer_id;
              existing.content = content;
              existing.initials = customerName.trim().slice(0, 2).toUpperCase();
            }
          });

        if (!cancelled) setRows([...grouped.values()]);
      } catch (err) {
        console.error("加载聚合消息失败:", err);
        if (!cancelled) {
          setRows([]);
          setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      } finally {
        firstLoadRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  /**
   * 按平台分组。
   * 排序：有消息的平台排前面（未读优先 → 最新消息时间倒序），
   * 没消息的平台按左侧栏顺序排在后面，展开后显示「暂无消息」。
   */
  const platformGroups = useMemo<PlatformGroup[]>(() => {
    const visible = rows
      .filter((r) => showHandled || !r.handled)
      // 搜索时按客户名过滤；搜索状态下命中的分组会被强制展开（见下方 isOpen）
      .filter((r) => !query || r.customerName.toLowerCase().includes(query));

    const byPlatform = new Map<PlatformKey, AggregatedRow[]>();
    visible.forEach((row) => {
      const list = byPlatform.get(row.platform) ?? [];
      list.push(row);
      byPlatform.set(row.platform, list);
    });

    const build = (platform: PlatformKey): PlatformGroup => {
      const list = byPlatform.get(platform) ?? [];
      return {
        platform,
        rows: sortRows(list),
        unread: list.reduce((sum, r) => sum + r.unread, 0),
        latestAt: list.reduce((max, r) => Math.max(max, r.sortAt), 0),
      };
    };

    const withRows = PLATFORM_KEYS.filter((k) => (byPlatform.get(k)?.length ?? 0) > 0)
      .map(build)
      .sort((a, b) => {
        if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
        return b.latestAt - a.latestAt;
      });
    // 搜索状态下不显示空分组（否则 6 条空栏很吵）
    const empty = query
      ? []
      : PLATFORM_KEYS.filter((k) => (byPlatform.get(k)?.length ?? 0) === 0).map(build);

    return [...withRows, ...empty];
  }, [rows, showHandled, query]);

  const totalUnread = useMemo(() => rows.filter((r) => r.unread > 0).length, [rows]);

  /** 点开客户卡片：清未读（红点灭，但行还在），并跳到该平台会话 */
  const handleClick = useCallback(
    (row: AggregatedRow) => {
      setSelectedId(row.conversationId);
      // 点开即视为已读。三步，顺序不能乱：
      if (row.unread > 0) {
        // ① 本地状态立刻清零（列表内的红点）
        setRows((prev) =>
          prev.map((item) => (item.nameKey === row.nameKey ? { ...item, unread: 0 } : item)),
        );

        // ② 乐观扣减左栏角标：界面马上响应，不等数据库往返。
        //    万一扣多了，下面第 ③ 步会用数据库真实值覆盖回来。
        onUnreadOptimistic?.(row.platform, row.unread);

        // ③ 落库，并把数据库返回的**最新未读快照**直接交给宿主覆盖红点。
        //    绝不能让宿主自己去再查一次列表 —— 那次查询和这里的 UPDATE 并发，
        //    查早了就是旧值，红点就灭不掉（2026-10-21 业务员反馈的「时灭时不灭」）。
        void Promise.all(
          row.conversationIds.map((id) =>
            api.markConversationRead(id).catch((err) => {
              console.warn("清未读失败:", err);
              return undefined;
            }),
          ),
        ).then((snapshots) => {
          // 同一个客户的多条会话各返回一份快照，取最后一份（最新）。
          const latest = [...snapshots].reverse().find((s) => s !== undefined);
          onConversationsRead?.(latest);
        });
      }
      onOpenPlatform?.(row.platform, row.customerId);
    },
    [onOpenPlatform, onConversationsRead, onUnreadOptimistic],
  );

  /**
   * 手动标「已处理」/「恢复」。
   *
   * 为什么要落库：只改前端 state 的话，刷新一下标记就没了。
   * handled 只影响聚合待办列表 —— 中栏客户列表仍然保留这条会话，
   * 业务员还能点进去翻历史；客户再发新消息时 Rust 侧会把 status 拉回 active，行自动回来。
   */
  const handleToggleHandled = useCallback((row: AggregatedRow) => {
    const next = !row.handled;
    setRows((prev) =>
      prev.map((item) => (item.nameKey === row.nameKey ? { ...item, handled: next } : item)),
    );
    void Promise.all(
      row.conversationIds.map((id) =>
        api.setConversationStatus(id, next ? "handled" : "active").catch((err) => {
          console.warn("改会话状态失败:", err);
        }),
      ),
    );
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {/* 头部 */}
      <div className="h-[52px] flex items-center px-4 gap-2 border-b border-[#E0DDD6] bg-[#25D366] flex-shrink-0">
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path fill="white" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
        <span className="text-white font-medium text-[15px]">聚合消息</span>
        <button
          type="button"
          onClick={() => setShowHandled((v) => !v)}
          className="ml-auto text-white/85 text-[12px] px-2 py-[3px] rounded transition-colors hover:bg-white/20"
          title="标为「已处理」的会话默认从待办里消掉，打开这里可以翻回来"
        >
          {showHandled ? "隐藏已处理" : "显示已处理"}
        </button>
        <span className="text-white text-[12px] flex-shrink-0">{totalUnread} 个待处理</span>
      </div>

      {/* 搜索栏：原中间 320px 客户列表里的搜索框搬到这里 */}
      <div className="p-[10px_14px] bg-[#F7F6F3] border-b border-[#E0DDD6] flex-shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索客户..."
          className="w-full h-[34px] border border-[#E0DDD6] rounded-lg bg-white px-3 text-[13px] outline-none focus:border-[#25D366]"
        />
      </div>

      {/* 按平台分组的消息列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[#999] text-[13px]">
            加载中...
          </div>
        ) : errorMsg ? (
          <div className="p-4 text-[12px] text-[#FF3B30] leading-relaxed break-all">
            读取数据库失败：{errorMsg}
          </div>
        ) : query && platformGroups.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#CCC] text-[14px]">
            没有匹配「{searchQuery.trim()}」的客户
          </div>
        ) : (
          platformGroups.map((group) => {
            const config = PLATFORMS[group.platform];
            // 搜索时强制展开命中的分组，不然搜到了还得再点一下展开
            const isOpen = query ? group.rows.length > 0 : expanded.has(group.platform);
            const unreadCustomers = group.rows.filter((r) => r.unread > 0).length;
            return (
              <div key={group.platform} className="border-b border-[#F0EEE9]">
                {/* 平台消息栏：点整行即可展开/收起该平台的客户 */}
                <button
                  type="button"
                  onClick={() => togglePlatform(group.platform)}
                  aria-expanded={isOpen}
                  className={cn(
                    "w-full flex items-center gap-[10px] px-[14px] py-[11px] text-left transition-colors",
                    isOpen ? "bg-[#F7F6F3]" : "bg-white hover:bg-[#FAFAF8]",
                  )}
                >
                  <div
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: config.color }}
                  >
                    <div className="scale-[0.55]">{config.icon}</div>
                  </div>

                  <span className="text-[14px] font-semibold text-[#1A1A1A]">{config.name}</span>
                  <span className="text-[11px] text-[#999] flex-shrink-0">
                    {group.rows.length} 个客户
                  </span>

                  {/* 平台红点：组内任一客户有未读就亮，全部读完才灭 */}
                  {group.unread > 0 && (
                    <span className="unread-dot" aria-label={`${config.name}有未读消息`} />
                  )}

                  <span className="ml-auto flex items-center gap-[6px] text-[#999] flex-shrink-0">
                    {unreadCustomers > 0 && (
                      <span className="text-[11px] text-[#E5484D]">
                        {unreadCustomers} 个待处理
                      </span>
                    )}
                    <ChevronIcon open={isOpen} />
                  </span>
                </button>

                {/* 展开后列出该平台下的客户 */}
                {isOpen &&
                  (group.rows.length === 0 ? (
                    <div className="px-[14px] py-[14px] text-[12px] text-[#BBB]">
                      该平台暂无监听到的消息
                    </div>
                  ) : (
                    group.rows.map((msg) => (
                      <div
                        key={msg.nameKey}
                        className={cn(
                          "group flex items-center gap-3 py-[10px] pr-[10px] pl-[22px] cursor-pointer transition-colors border-l-[3px]",
                          selectedId === msg.conversationId
                            ? "bg-[#E1F5EE] border-l-[#25D366]"
                            : "border-l-transparent hover:bg-[#F7F6F3]",
                          msg.handled && "opacity-55",
                        )}
                        onClick={() => handleClick(msg)}
                      >
                        {/* 客户头像 + 平台小角标 */}
                        <div className="relative flex-shrink-0">
                          <div className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[12px] font-medium bg-[#EFEAE2] text-[#555]">
                            {msg.initials}
                          </div>
                          <div
                            className="absolute -bottom-[2px] -right-[2px] w-[16px] h-[16px] rounded-full flex items-center justify-center text-white border-2 border-white"
                            style={{ background: config.color }}
                          >
                            <div className="scale-[0.32]">{config.icon}</div>
                          </div>
                        </div>

                        {/* 客户名 + 最后一条消息预览（不显示时间） */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[14px] truncate",
                                msg.unread > 0
                                  ? "font-semibold text-[#1A1A1A]"
                                  : "font-medium text-[#333]",
                              )}
                            >
                              {msg.customerName}
                            </span>
                            {msg.unread > 0 && <span className="unread-dot" aria-label="有新消息" />}
                          </div>
                          <div className="mt-[3px] flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[12px] overflow-hidden text-ellipsis whitespace-nowrap",
                                msg.unread > 0 ? "text-[#666]" : "text-[#888]",
                              )}
                            >
                              {msg.content}
                            </span>
                            {msg.handled && (
                              <span className="flex-shrink-0 text-[10px] px-[5px] py-[1px] rounded bg-[#EFEAE2] text-[#8A8A8A]">
                                已处理
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 手动「已处理」/「恢复」：点它不算点开会话，所以要阻止冒泡 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleHandled(msg);
                          }}
                          title={msg.handled ? "恢复到待办列表" : "标为已处理，从待办里消掉"}
                          className={cn(
                            "flex-shrink-0 flex items-center gap-1 rounded-md border px-2 py-[3px] text-[11px] transition-all",
                            msg.handled
                              ? "border-[#DDD8CE] text-[#8A8A8A] hover:border-[#25D366] hover:text-[#25D366] opacity-0 group-hover:opacity-100"
                              : "border-[#DDD8CE] text-[#999] hover:border-[#25D366] hover:text-[#25D366] opacity-0 group-hover:opacity-100",
                          )}
                        >
                          {msg.handled ? (
                            "恢复"
                          ) : (
                            <>
                              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                                <path
                                  d="M2 6.4 4.6 9 10 3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              已处理
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
