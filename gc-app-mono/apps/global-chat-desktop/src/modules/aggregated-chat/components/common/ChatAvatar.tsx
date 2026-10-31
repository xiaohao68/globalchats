import { Avatar, AvatarFallback, AvatarImage } from "@gc/ui/components/avatar";
import { cn } from "@gc/ui/lib/utils";
import type { EPlatform } from "@gc/model";
import type { UserStatus, Contact } from "../../types";
import { PlatformBadge } from "./PlatformBadge";

type AvatarSize = "sm" | "md" | "lg";

interface ChatAvatarProps {
  /** 联系人对象（优先使用） */
  contact?: Contact;
  /** 头像 URL（备用） */
  src?: string;
  /** 显示名称（备用，用于 fallback） */
  fallback?: string;
  /** 平台类型（用于显示平台徽章） */
  platform?: EPlatform;
  /** 尺寸 */
  size?: AvatarSize;
  /** 是否显示在线状态点 */
  showStatus?: boolean;
  /** 自定义类名 */
  className?: string;
}

const sizeConfig: Record<
  AvatarSize,
  { container: string; avatar: string; badge: number; status: string }
> = {
  sm: {
    container: "w-8 h-8",
    avatar: "w-8 h-8 text-xs",
    badge: 12,
    status: "w-2 h-2 border",
  },
  md: {
    container: "w-12 h-12",
    avatar: "w-12 h-12 text-sm",
    badge: 16,
    status: "w-3 h-3 border-2",
  },
  lg: {
    container: "w-14 h-14",
    avatar: "w-14 h-14 text-base",
    badge: 18,
    status: "w-3.5 h-3.5 border-2",
  },
};

const statusColors: Record<UserStatus, string> = {
  online: "bg-[var(--color-status-online)]",
  offline: "bg-[var(--color-status-offline)]",
  idle: "bg-[var(--color-status-idle)]",
  dnd: "bg-[var(--color-status-dnd)]",
};

export function ChatAvatar({
  contact,
  src,
  fallback,
  platform,
  size = "md",
  showStatus = true,
  className,
}: ChatAvatarProps) {
  const config = sizeConfig[size];

  // 从 contact 提取数据
  const avatarSrc = contact?.avatar ?? src;
  const displayName = contact?.name ?? fallback ?? "?";
  const status = contact?.status;
  const isGroup = contact?.isGroup ?? false;

  // 获取 fallback 首字母
  const initials =
    displayName
      .split(" ")
      .map((n) => n?.[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <div className={cn("relative flex-shrink-0", config.container, className)}>
      <Avatar
        className={cn("ring-1 ring-[var(--color-border)]", config.avatar)}
      >
        <AvatarImage
          src={avatarSrc}
          alt={displayName}
          className="object-cover"
        />
        <AvatarFallback className="bg-[var(--color-bg-secondary)] font-medium text-[var(--color-text-secondary)]">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* 平台徽章 - 右下角（优先显示） */}
      {platform && (
        <PlatformBadge
          platform={platform}
          size={config.badge}
          className="absolute -right-0.5 -bottom-0.5"
        />
      )}

      {/* 在线状态点 - 仅在无平台徽章且是单聊时显示 */}
      {showStatus && status && !isGroup && !platform && (
        <span
          className={cn(
            "absolute right-0 bottom-0 rounded-full border-[var(--color-bg-primary)]",
            config.status,
            statusColors[status],
          )}
          title={status}
        />
      )}
    </div>
  );
}
