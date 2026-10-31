import { FC, useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@gc/ui/lib/utils";
import { PlatformKey, PLATFORMS } from "@/components/PlatformWebView";
import { api, Conversation, Customer } from "@/services/api";
import { parseServerTime, serverTimeMs } from "@/utils/datetime";

/** 把后端时间格式化成列表里显示的短时间（今天显示时:分，昨天显示"昨天"，更早显示月日） */
const formatListTime = (iso: string | null): string => {
  const date = parseServerTime(iso);
  if (!date) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  if (date >= startOfToday) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  if (date >= startOfYesterday) {
    return "昨天";
  }
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const initialsOf = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.charAt(0) ?? "";
    const second = parts[1]?.charAt(0) ?? "";
    return (first + second).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

interface CustomerListItem {
  /**
   * 归并键：**同一个客户名只占一张卡片**。
   * LinkedIn 那边客户外部 id 就是「名字派生」的，历史遗留数据里同一个人
   * 可能因为不同 external_id 拆成了多条客户/会话记录，这里统一按名字收敛。
   */
  nameKey: string;
  /** 代表客户 id（取同组里最新那条会话的客户） */
  customerId: number;
  /** 同组全部会话 id：点开卡片时一次性把这些会话都标记为已读 */
  conversationIds: number[];
  name: string;
  preview: string;
  time: string;
  /** 组内未读合计：只用来判断「要不要亮红点」，不再显示数字 */
  unread: number;
  online: boolean;
  initials: string;
  avatarColor: string;
  avatarTextColor: string;
  /** 最新一条消息的时间戳，用于排序 */
  sortAt: number;
}

const AVATAR_PALETTE = [
  { bg: "#DDF0FF", fg: "#0088CC" },
  { bg: "#FFF4E6", fg: "#BA7517" },
  { bg: "#FBEAF0", fg: "#D4537E" },
  { bg: "#E6F1FB", fg: "#185FA5" },
  { bg: "#E1F5EE", fg: "#0F6E56" },
  { bg: "#FAECE7", fg: "#D85A30" },
];

const avatarOf = (seed: number) => AVATAR_PALETTE[seed % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]!;

interface CustomerListPanelProps {
  platform: PlatformKey;
  /** 当前平台对应的所有 platform_account.id（一人多号时为多个） */
  platformAccountIds: number[];
  /** 该平台账号是否已登录（来自 platform_account.login_status），未知时不显示状态点 */
  loginStatus?: "logged_in" | "logged_out" | "unknown";
  userId: number;
  onSelectCustomer: (customerId: number) => void;
  selectedCustomerId?: number;
  /** 点击头部「收起」按钮：把中间栏收成一条窄轨，给内嵌网页腾出宽度 */
  onCollapse?: () => void;
  /**
   * 外部刷新信号：宿主每落库一条新消息就 +1，这里跟着重新拉一次列表。
   * 没有它的话，客户来信已经进库了，中间栏还停在「暂无客户消息」。
   */
  refreshKey?: number;
  /**
   * 点开某张客户卡片、把该客户名下会话标记为已读之后通知宿主。
   * 宿主据此重算各平台未读计数（左侧平台栏 / 窄轨红点）。
   */
  onConversationsRead?: () => void;
}

export const CustomerListPanel: FC<CustomerListPanelProps> = ({
  platform,
  platformAccountIds,
  loginStatus = "unknown",
  userId,
  onSelectCustomer,
  selectedCustomerId,
  onCollapse,
  refreshKey = 0,
  onConversationsRead,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const config = PLATFORMS[platform];

  // 用 "id1,id2" 这种稳定字符串做依赖，避免数组引用每次变化导致重复请求
  const accountKey = platformAccountIds.join(",");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const [conversations, customers] = await Promise.all([
          api.getConversations(userId),
          api.getCustomers(userId),
        ]);

        const accountIdSet = new Set(
          accountKey
            .split(",")
            .filter((v) => v.length > 0)
            .map((v) => Number(v)),
        );
        const customerMap = new Map<number, Customer>(customers.map((c) => [c.id, c]));

        // 同一客户可能留下多条会话（历史版本用了不同的客户 external_id），
        // 这里统一按「客户名」归并成一张卡片，只保留最新那条消息作为预览 —— 对齐微信。
        const grouped = new Map<string, CustomerListItem>();

        conversations
          .filter((conv: Conversation) => accountIdSet.has(conv.platform_account_id))
          .filter((conv) => conv.status !== "archived" && conv.status !== "closed")
          .forEach((conv) => {
            const customer = customerMap.get(conv.customer_id);
            const name = customer?.name?.trim() || `客户 #${conv.customer_id}`;
            const nameKey = name.replace(/\s+/g, "").toLowerCase();
            const sortAt = serverTimeMs(conv.last_message_at);
            const unread = conv.unread_count ?? 0;
            const online = customer?.is_online ?? false;
            const preview = conv.last_message_preview ?? "(暂无消息)";
            const time = formatListTime(conv.last_message_at);

            const existing = grouped.get(nameKey);
            if (!existing) {
              const palette = avatarOf(conv.customer_id);
              grouped.set(nameKey, {
                nameKey,
                customerId: conv.customer_id,
                conversationIds: [conv.id],
                name,
                preview,
                time,
                unread,
                online,
                initials: initialsOf(name),
                avatarColor: palette.bg,
                avatarTextColor: palette.fg,
                sortAt,
              });
              return;
            }

            existing.conversationIds.push(conv.id);
            existing.unread += unread;
            existing.online = existing.online || online;
            // 只把「最新」那条会话的预览与时间留在卡片上，历史消息不上卡片
            if (sortAt >= existing.sortAt) {
              existing.sortAt = sortAt;
              existing.customerId = conv.customer_id;
              existing.preview = preview;
              existing.time = time;
            }
          });

        // 有红点的排前面，其次按最新消息时间倒序（与聚合栏排序规则保持一致）
        const listItems: CustomerListItem[] = [...grouped.values()].sort((a, b) => {
          if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
          return b.sortAt - a.sortAt;
        });

        if (!cancelled) setItems(listItems);
      } catch (err) {
        console.error("加载客户会话失败:", err);
        if (!cancelled) {
          setItems([]);
          setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [userId, accountKey, refreshKey]);

  const filteredItems = useMemo(
    () => items.filter((c) => c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [items, searchQuery],
  );

  /**
   * 点开客户卡片：
   *   1) 交给宿主选中该客户（右侧切到对应会话）
   *   2) 本地立刻把红点去掉（不等落库往返，界面即时响应）
   *   3) 把该客户名下**所有**会话标记为已读 —— 归并后一张卡片可能对应多条会话，
   *      只清一条的话，下次刷新红点会又冒出来
   */
  const handleSelect = useCallback(
    (item: CustomerListItem) => {
      onSelectCustomer(item.customerId);
      if (item.unread <= 0) return;

      setItems((prev) =>
        prev.map((row) => (row.nameKey === item.nameKey ? { ...row, unread: 0 } : row)),
      );
      onConversationsRead?.();

      void Promise.all(
        item.conversationIds.map((id) => api.markConversationRead(id).catch(() => {})),
      );
    },
    [onSelectCustomer, onConversationsRead],
  );

  const statusText =
    loginStatus === "logged_in" ? "已登录" : loginStatus === "logged_out" ? "未登录" : "待登录";
  const statusColor =
    loginStatus === "logged_in" ? "#25D366" : loginStatus === "logged_out" ? "#FF9500" : "#FFD8A8";

  return (
    <div className="w-[320px] h-full flex flex-col bg-white border-r border-[#E0DDD6] flex-shrink-0">
      {/* 平台头部 */}
      <div
        className="h-[52px] flex items-center px-4 gap-2 flex-shrink-0"
        style={{ background: config.color }}
      >
        <span className="text-white font-medium text-[15px]">{config.name}</span>
        <span className="text-white/70 text-[11px]">({platformAccountIds.length} 个账号)</span>
        <span className="text-white/80 text-[12px] ml-auto">{statusText}</span>
        <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />

        {/* 收起按钮：把中间栏收起，内嵌网页随之铺满 */}
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title="收起消息列表"
            aria-label="收起消息列表"
            className="ml-1 flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-md text-white transition-colors hover:bg-white/25 active:bg-white/35"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M6.2 2.2 2.4 6l3.8 3.8M10.2 2.2 6.4 6l3.8 3.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 搜索栏 */}
      <div className="p-[10px_14px] bg-[#F7F6F3] flex-shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索客户..."
          className="w-full h-[34px] border border-[#E0DDD6] rounded-lg bg-white px-3 text-[13px] outline-none focus:border-[#0088CC]"
        />
      </div>

      {/* 客户列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[#999] text-[13px]">
            加载中...
          </div>
        ) : errorMsg ? (
          <div className="p-4 text-[12px] text-[#FF3B30] leading-relaxed break-all">
            读取数据库失败：{errorMsg}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#CCC] text-[14px] gap-2">
            <span>暂无客户消息</span>
            <span className="text-[11px] text-[#DDD]">
              在右侧 {config.name} 网页里登录后，消息会同步到这里
            </span>
          </div>
        ) : (
          filteredItems.map((customer) => (
            <div
              key={customer.nameKey}
              className={cn(
                "flex items-center gap-3 p-[12px_14px] cursor-pointer transition-colors border-l-[3px]",
                selectedCustomerId === customer.customerId
                  ? "bg-[#E1F0FA] border-l-[#0088CC]"
                  : "border-l-transparent hover:bg-[#F7F6F3]",
              )}
              onClick={() => handleSelect(customer)}
            >
              {/* 头像 */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center font-medium text-[14px]"
                  style={{ background: customer.avatarColor, color: customer.avatarTextColor }}
                >
                  {customer.initials}
                </div>
                {customer.online && <div className="online-dot" />}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span
                    className={cn(
                      "text-[#1A1A1A] text-[14px] truncate",
                      customer.unread === 0 ? "font-medium" : "font-semibold",
                    )}
                  >
                    {customer.name}
                  </span>
                  <span className="text-[#999] text-[11px] flex-shrink-0 ml-2">{customer.time}</span>
                </div>
                <div className="flex justify-between items-center mt-[3px]">
                  <span
                    className={cn(
                      "text-[12px] overflow-hidden text-ellipsis whitespace-nowrap flex-1",
                      customer.unread === 0 ? "text-[#888]" : "text-[#666]",
                    )}
                  >
                    {customer.preview}
                  </span>
                  {customer.unread > 0 && <span className="unread-dot" aria-label="有新消息" />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
