import { cn } from "@gc/ui/lib/utils";
import { ChatAvatar } from "../common/ChatAvatar";
import { UnreadBadge } from "../common/UnreadBadge";
import { formatChatTime, truncateText } from "../../utils";
import type { Conversation, Account } from "../../types";
import { Button } from "@gc/ui/components/button";
import { Pin, PinOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gc/ui/components/tooltip";

interface ChatListItemProps {
  conversation: Conversation;
  account?: Account;
  isSelected: boolean;
  onClick: () => void;
  isPinned?: boolean;
  onTogglePinned?: (conversationId: string) => void;
}

/**
 * 聊天列表项 - Apple 风格（增强版）
 * 布局: 头像(带平台徽章) | 名称+时间 | 预览+未读数
 */
export function ChatListItem({
  conversation,
  account,
  isSelected,
  onClick,
  isPinned = false,
  onTogglePinned,
}: ChatListItemProps) {
  const { contact, lastMessage, lastActivityAt, unreadCount } = conversation;
  const isUnread = unreadCount > 0;

  return (
    <div
      className={cn(
        "chat-list-item group/chat-item",
        "mb-0.5 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5",
        "transition-all duration-200 ease-out",
        "hover:bg-white/[0.06] active:scale-[0.99]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 focus-visible:ring-offset-0",
        "border border-transparent",
        isSelected &&
          "selected bg-[var(--color-accent)]/15 border-[var(--color-accent)]/20 shadow-[0_0_0_1px_rgba(0,122,255,0.1)]",
        isUnread &&
          !isSelected &&
          "bg-white/[0.03]",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`打开对话：${contact.name}`}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* 头像 + 平台徽章 */}
      <ChatAvatar
        contact={contact}
        platform={account?.platform}
        size="md"
        showStatus={true}
      />

      {/* 内容区域 */}
      <div className="min-w-0 flex-1">
        {/* 第一行：名称 + 时间 */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-semibold",
              "text-[var(--font-size-body)]",
              "tracking-[var(--letter-spacing-body)]",
              "text-[var(--color-text-primary)]",
            )}
          >
            {contact.name}
          </span>
          <div className="flex flex-shrink-0 items-center gap-1">
            <span
              className={cn(
                "text-meta flex-shrink-0 tabular-nums",
                isUnread && "text-[var(--color-text-secondary)]",
              )}
            >
              {formatChatTime(lastActivityAt)}
            </span>

            {onTogglePinned && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "h-7 w-7 rounded-full",
                      "opacity-0 transition-opacity duration-150",
                      "group-focus-within/chat-item:opacity-100 group-hover/chat-item:opacity-100",
                      isPinned && "opacity-100",
                      "hover:bg-[var(--color-bg-hover)]",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTogglePinned(conversation.id);
                    }}
                    aria-label={isPinned ? "取消置顶" : "置顶对话"}
                  >
                    {isPinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={8}>
                  {isPinned ? "取消置顶" : "置顶"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 第二行：预览 + 未读数 */}
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[var(--color-text-secondary)] text-[var(--font-size-meta)]",
              isUnread && "font-medium text-[var(--color-text-primary)]/80",
            )}
          >
            {lastMessage ? truncateText(lastMessage, 35) : "暂无消息"}
          </span>
          <UnreadBadge count={unreadCount} className="flex-shrink-0 mr-0.5" />
        </div>
      </div>
    </div>
  );
}
