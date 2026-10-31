import { cn } from "@gc/ui/lib/utils";

interface UnreadBadgeProps {
  count: number;
  className?: string;
  /** 最大显示数量，超过显示 99+ */
  max?: number;
}

/**
 * 未读消息计数角标（增强版）
 * Apple 风格设计 + 动画效果
 */
export function UnreadBadge({ count, className, max = 99 }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();
  const isLarge = count > max || count >= 10;

  return (
    <span
      className={cn(
        "unread-badge",
        "inline-flex items-center justify-center",
        "bg-destructive text-destructive-foreground font-semibold",
        "rounded-full shadow-sm ring-1 ring-black/10",
        "h-[18px] min-w-[18px]",
        "transition-all duration-200",
        "hover:scale-110",
        isLarge ? "px-1.5 text-[10px]" : "text-[11px]",
        className,
      )}
    >
      {displayCount}
    </span>
  );
}
