import { Loader2, WifiOff, TriangleAlert, Wifi } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import { cn } from "@gc/ui/lib/utils";
import type { NetworkStatus } from "../../hooks/useNetworkStatus";

type NoticeTone = "default" | "danger" | "warning";

function toneClasses(tone: NoticeTone) {
  switch (tone) {
    case "danger":
      return {
        wrap: "bg-[rgba(255,59,48,0.10)] border-[rgba(255,59,48,0.22)] text-[rgba(255,59,48,0.95)]",
        subtle: "text-[rgba(255,59,48,0.75)]",
        button: "text-[rgba(255,59,48,0.95)] hover:bg-[rgba(255,59,48,0.12)]",
      } as const;
    case "warning":
      return {
        wrap: "bg-[rgba(255,159,10,0.12)] border-[rgba(255,159,10,0.24)] text-[rgba(255,159,10,0.95)]",
        subtle: "text-[rgba(255,159,10,0.8)]",
        button: "text-[rgba(255,159,10,0.95)] hover:bg-[rgba(255,159,10,0.14)]",
      } as const;
    default:
      return {
        wrap: "bg-[var(--gc-glass-bg)] border-[var(--gc-glass-border)] text-[var(--color-text-secondary)]",
        subtle: "text-[var(--color-text-tertiary)]",
        button:
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
      } as const;
  }
}

interface TopNoticeBarProps {
  networkStatus: NetworkStatus;
  isSyncing?: boolean;
  syncError?: string | null;
  onRetrySync?: () => void;
  className?: string;
}

export function TopNoticeBar({
  networkStatus,
  isSyncing = false,
  syncError,
  onRetrySync,
  className,
}: TopNoticeBarProps) {
  const hasError = Boolean(syncError);
  const show = networkStatus !== "online" || isSyncing || hasError;
  if (!show) return null;

  const tone: NoticeTone =
    networkStatus === "offline" ? "danger" : hasError ? "warning" : "default";
  const toneC = toneClasses(tone);

  const leftIcon =
    networkStatus === "offline" ? (
      <WifiOff className="h-3.5 w-3.5" />
    ) : networkStatus === "reconnecting" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : hasError ? (
      <TriangleAlert className="h-3.5 w-3.5" />
    ) : (
      <Wifi className="h-3.5 w-3.5" />
    );

  const title =
    networkStatus === "offline"
      ? "离线"
      : networkStatus === "reconnecting"
        ? "正在恢复连接…"
        : hasError
          ? "同步失败"
          : isSyncing
            ? "同步中…"
            : null;

  const subtitle =
    networkStatus === "offline"
      ? "发送不受影响，恢复网络后可重试"
      : hasError
        ? syncError
        : null;

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex h-7 items-center justify-between gap-3 px-3",
          "border-b backdrop-blur-xl",
          toneC.wrap,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("flex-shrink-0", toneC.subtle)}>{leftIcon}</span>
          <span className="truncate text-xs font-semibold">{title}</span>
          {subtitle && (
            <span
              className={cn("hidden truncate text-xs md:inline", toneC.subtle)}
            >
              {subtitle}
            </span>
          )}
        </div>

        {onRetrySync && (hasError || networkStatus === "offline") && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRetrySync}
            disabled={networkStatus === "offline"}
            className={cn("h-6 rounded-full px-2 text-[11px]", toneC.button)}
          >
            重试
          </Button>
        )}
      </div>
    </div>
  );
}
