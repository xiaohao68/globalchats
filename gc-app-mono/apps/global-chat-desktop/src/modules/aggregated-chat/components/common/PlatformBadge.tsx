import { cn } from "@gc/ui/lib/utils";
import type { EPlatform } from "@gc/model";
import { platformColors, DEFAULT_PLATFORM_COLOR } from "../../constants";
import { PlatformIcon } from "./PlatformIcon";

interface PlatformBadgeProps {
  platform: EPlatform;
  size?: number;
  className?: string;
}

/**
 * 平台徽章组件
 * 用于在头像右下角显示平台标识
 */
export function PlatformBadge({
  platform,
  size = 16,
  className,
}: PlatformBadgeProps) {
  const bgColor = platformColors[platform] || DEFAULT_PLATFORM_COLOR;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full shadow-sm",
        "ring-2 ring-[var(--color-bg-primary)]",
        className,
      )}
      style={{
        width: size + 4,
        height: size + 4,
        backgroundColor: bgColor,
      }}
    >
      <PlatformIcon
        platform={platform}
        size={size - 2}
        className="text-white"
      />
    </div>
  );
}
