import { FC } from "react";
import { PLATFORMS, PlatformKey, PlatformIcon } from "@/components/PlatformWebView";
import { cn } from "@gc/ui/lib/utils";

interface PlatformSidebarProps {
  activePlatform: PlatformKey | "aggregate";
  onPlatformChange: (platform: PlatformKey | "aggregate") => void;
  onExpandPlatform?: (platform: PlatformKey) => void;
  unreadCounts?: Partial<Record<PlatformKey | "aggregate", number>>;
}

export const PlatformSidebar: FC<PlatformSidebarProps> = ({
  activePlatform,
  onPlatformChange,
  onExpandPlatform,
  unreadCounts = {},
}) => {
  const platformKeys = Object.keys(PLATFORMS) as PlatformKey[];

  return (
    <aside className="w-[72px] h-full flex flex-col items-center bg-white border-r border-[#E0DDD6] pt-12 pb-4 gap-2">
      {/* 平台图标 */}
      {platformKeys.map((key) => (
        <PlatformIcon
          key={key}
          platform={key}
          isActive={activePlatform === key}
          unreadCount={unreadCounts[key] || 0}
          onClick={() => onPlatformChange(key)}
          onExpand={onExpandPlatform ? () => onExpandPlatform(key) : undefined}
        />
      ))}

      {/* 间隔 */}
      <div className="flex-1" />

      {/* 聚合按钮 */}
      <div
        className={cn(
          "relative w-[48px] h-[48px] rounded-[12px] flex items-center justify-center cursor-pointer transition-all duration-200",
          activePlatform === "aggregate"
            ? "bg-[#25D366] shadow-lg"
            : "bg-[#E1F5EE] border border-[#9FE1CB] hover:bg-[#C5EAD8] hover:scale-[1.08]",
        )}
        style={{
          boxShadow: activePlatform === "aggregate" ? "0 2px 12px rgba(37,211,102,0.4)" : undefined,
        }}
        onClick={() => onPlatformChange("aggregate")}
        title="聚合消息"
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path
            fill={activePlatform === "aggregate" ? "white" : "#0F6E56"}
            d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
          />
        </svg>
        {/* 未读提示：红点，不显示条数。
            为什么不是数字角标：产品只需要回答「有没有新消息」，
            业务员看到「3」还得自己去数，反而多一层认知负担；对齐微信的做法。 */}
        {(unreadCounts.aggregate || 0) > 0 && (
          <span
            className="absolute -top-[2px] -right-[2px] w-[11px] h-[11px] rounded-full bg-[#FF3B30] border-2 border-white z-10"
            aria-label="有未读消息"
          />
        )}
      </div>
    </aside>
  );
};
