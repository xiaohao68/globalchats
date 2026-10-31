import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gc/ui/components/tooltip";
import { cn } from "@gc/ui/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@gc/ui/components/avatar";
import { formatMessageTime } from "../../utils";
import type { Message } from "../../types";
import { MessageDirection, MessageStatus } from "../../types";
import { renderMessageContent } from "./MessageContentRenderer";

interface MessageItemProps {
  message: Message;
  isGroup?: boolean;
  showSender?: boolean;
  showTail?: boolean;
  highlightQuery?: string;
  isActiveMatch?: boolean;
  onResendFailed?: (message: Message) => void;
}

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  const baseClass = "w-3.5 h-3.5";

  switch (status) {
    case MessageStatus.Sending:
      return (
        <svg
          className={cn(baseClass, "animate-pulse text-white/60")}
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case MessageStatus.Sent:
      return (
        <svg
          className={cn(baseClass, "text-white/60")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case MessageStatus.Delivered:
      return (
        <svg
          className={cn(baseClass, "text-white/70")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="18 6 7 17 2 12" />
          <polyline points="22 6 11 17" />
        </svg>
      );
    case MessageStatus.Read:
      return (
        <svg
          className={cn(baseClass, "text-white")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="18 6 7 17 2 12" />
          <polyline points="22 6 11 17" />
        </svg>
      );
    case MessageStatus.Failed:
      return (
        <svg
          className={cn(baseClass, "text-red-400")}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="10" />
          <line
            x1="12"
            y1="8"
            x2="12"
            y2="13"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16" r="1" fill="white" />
        </svg>
      );
    default:
      return null;
  }
}

export function MessageItem({
  message,
  isGroup = false,
  showSender = true,
  showTail = true,
  highlightQuery,
  isActiveMatch = false,
  onResendFailed,
}: MessageItemProps) {
  const isOutgoing = message.direction === MessageDirection.Outgoing;
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const messageBodyRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setExpanded(false);
    setCanCollapse(false);
  }, [message.id]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch {
      const el = document.createElement("textarea");
      el.value = message.content;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
  };

  const collapseCandidate = (() => {
    const withoutCode = message.content.replace(/```[\s\S]*?```/g, "");
    const lineCount = withoutCode.split("\n").length;
    return withoutCode.length >= 520 || lineCount >= 14;
  })();

  useEffect(() => {
    const el = messageBodyRef.current;
    if (!el || !collapseCandidate || expanded) {
      if (!collapseCandidate) setCanCollapse(false);
      return;
    }

    const check = () => setCanCollapse(el.scrollHeight - el.clientHeight > 6);
    const raf = window.requestAnimationFrame(check);

    if (typeof ResizeObserver === "undefined") {
      return () => window.cancelAnimationFrame(raf);
    }

    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [collapseCandidate, expanded, message.id]);

  return (
    <div
      className={cn(
        "mb-2 flex w-full",
        isOutgoing ? "justify-end" : "justify-start",
      )}
    >
      {isGroup && !isOutgoing && showSender && (
        <Avatar className="mr-2 h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          <AvatarFallback className="bg-[var(--color-bg-secondary)] text-xs">
            {message.senderName?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
      )}

      {isGroup && !isOutgoing && !showSender && (
        <div className="mr-2 w-8 flex-shrink-0" />
      )}

      <div
        className={cn(
          "max-w-[min(72%,680px)]",
          isGroup && !isOutgoing && "flex flex-col",
        )}
      >
        {isGroup && !isOutgoing && showSender && message.senderName && (
          <span className="text-caption mb-1 ml-1 text-[var(--color-accent)] opacity-90">
            {message.senderName}
          </span>
        )}

        <div
          className={cn(
            "message-bubble",
            "group/message relative",
            "px-4 py-2.5",
            "transition-all duration-[var(--transition-fast)]",
            isOutgoing ? "gc-message-sent" : "gc-message-received",
            showTail && isOutgoing && "rounded-br-md",
            showTail && !isOutgoing && "rounded-bl-md",
            isActiveMatch &&
              "shadow-[0_0_0_3px_var(--gc-accent-glow)] ring-[var(--color-accent)]/60",
          )}
        >
          <div
            ref={messageBodyRef}
            className={cn(
              "space-y-2",
              collapseCandidate && !expanded && "chat-message-clamp",
              collapseCandidate && !expanded && canCollapse && "chat-message-fade",
            )}
          >
            {renderMessageContent(message.content, { isOutgoing, highlightQuery })}
          </div>

          {collapseCandidate && canCollapse && (
            <div
              className={cn(
                "mt-2 flex",
                isOutgoing ? "justify-end" : "justify-start",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                className={cn(
                  "h-7 rounded-full px-2.5",
                  isOutgoing
                    ? "text-white/80 hover:bg-white/12 hover:text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
                )}
                aria-expanded={expanded}
              >
                {expanded ? "收起" : "展开"}
              </Button>
            </div>
          )}

          <div
            className={cn(
              "mt-1 flex items-center gap-1",
              isOutgoing ? "justify-end" : "justify-start",
            )}
          >
            <span
              className={cn(
                "message-timestamp",
                "text-[11px]",
                isOutgoing
                  ? "text-white/70"
                  : "text-[var(--color-text-tertiary)]",
              )}
            >
              {formatMessageTime(message.timestamp)}
            </span>
            {isOutgoing && <MessageStatusIcon status={message.status} />}
            {isOutgoing &&
              message.status === MessageStatus.Failed &&
              onResendFailed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onResendFailed(message)}
                  className={cn(
                    "ml-1 h-7 rounded-full px-2",
                    "text-red-200 hover:bg-white/12 hover:text-white",
                  )}
                  aria-label="重新发送这条消息"
                >
                  重试
                </Button>
              )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={copyMessage}
                  className={cn(
                    "ml-1 h-7 w-7 rounded-full",
                    "opacity-0 transition-opacity duration-150",
                    "group-focus-within/message:opacity-100 group-hover/message:opacity-100 focus:opacity-100",
                    isOutgoing
                      ? "text-white/85 hover:bg-white/12 hover:text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
                  )}
                  aria-label="复制消息内容"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>
                {copied ? "已复制" : "复制"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
