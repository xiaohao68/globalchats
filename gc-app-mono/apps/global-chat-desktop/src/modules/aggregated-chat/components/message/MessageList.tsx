import {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type CSSProperties,
} from "react";
import { ArrowDown, CircleDot, TriangleAlert } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import { useChatStore } from "../../store/chatStore";
import { MessageItem } from "./MessageItem";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { NoMessages, ErrorState } from "../common/EmptyState";
import { getDateLabel } from "../../utils";
import type { Message } from "../../types";
import { cn } from "@gc/ui/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useMessageRows,
  useScrollPerformance,
  useLoadMore,
  useNearBottom,
} from "./useMessageListHooks";

interface MessageListProps {
  conversationId: string;
  isGroup?: boolean;
  unreadCount?: number;
  firstUnreadMessageId?: string | null;
  highlightQuery?: string;
  activeMatchId?: string | null;
  onResendFailed?: (message: Message) => void;
  onScrollContainer?: (el: HTMLDivElement | null) => void;
  onScrollToMessageId?: (fn: ((messageId: string) => void) | null) => void;
}

function DateDivider({ timestamp }: { timestamp: number }) {
  return (
    <div className="my-4 flex items-center justify-center">
      <span className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-tertiary)] shadow-sm">
        {getDateLabel(timestamp)}
      </span>
    </div>
  );
}

function UnreadDivider({ count }: { count: number }) {
  return (
    <div className="my-4 flex items-center justify-center">
      <span className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] shadow-sm ring-1 ring-[var(--color-border)]/50">
        未读消息 · <span className="tabular-nums">{count}</span>
      </span>
    </div>
  );
}

export function MessageList({
  conversationId,
  isGroup = false,
  unreadCount = 0,
  firstUnreadMessageId,
  highlightQuery,
  activeMatchId,
  onResendFailed,
  onScrollContainer,
  onScrollToMessageId,
}: MessageListProps) {
  const {
    messages,
    loadMessages,
    loadMoreMessages,
    messagesStateByConversationId,
    messagesErrorByConversationId,
  } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationMessages = messages[conversationId] || [];
  const messagesState = messagesStateByConversationId[conversationId] ?? "idle";
  const messagesError = messagesErrorByConversationId[conversationId] ?? null;
  const isInitialLoading = messagesState === "loading";

  const bumpScrollPerfMode = useScrollPerformance();
  const rows = useMessageRows(
    conversationMessages,
    unreadCount,
    firstUnreadMessageId,
  );
  const { isLoadingMore, handleLoadMore } = useLoadMore(
    scrollRef,
    conversationId,
    loadMoreMessages,
  );
  const { isNearBottom, updateNearBottom } = useNearBottom(
    scrollRef,
    conversationMessages.length,
  );

  const shouldScrollToBottom = useRef(true);

  useEffect(() => {
    shouldScrollToBottom.current = true;
    void loadMessages(conversationId);
  }, [conversationId, loadMessages]);

  useEffect(() => {
    onScrollContainer?.(scrollRef.current);
    return () => onScrollContainer?.(null);
  }, [onScrollContainer]);

  const indexByMessageId = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, idx) => {
      if (row.kind === "message") map.set(row.data.id, idx);
    });
    return map;
  }, [rows]);

  const unreadRowIndex = useMemo(() => {
    if (!firstUnreadMessageId) return null;
    return rows.findIndex(
      (r) => r.kind === "unread" && r.key === `unread-${firstUnreadMessageId}`,
    );
  }, [firstUnreadMessageId, rows]);

  const shouldVirtualize = rows.length >= 180;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (idx) => {
      const row = rows[idx];
      if (!row) return 96;
      if (row.kind === "divider" || row.kind === "unread") return 34;
      return 96;
    },
    overscan: 12,
    enabled: shouldVirtualize,
    getItemKey: (index) => rows[index]?.key ?? index,
  });

  const scrollToRowIndex = useCallback(
    (index: number, opts?: { align?: "auto" | "start" | "center" | "end" }) => {
      if (index < 0 || !scrollRef.current) return;

      if (shouldVirtualize) {
        rowVirtualizer.scrollToIndex(index, { align: opts?.align ?? "center" });
        window.setTimeout(() => {
          scrollRef.current
            ?.querySelector<HTMLElement>(`[data-row-key="${rows[index]?.key}"]`)
            ?.focus({ preventScroll: true });
        }, 0);
        return;
      }

      const messageRow = rows[index];
      if (messageRow?.kind === "message") {
        const el = scrollRef.current.querySelector<HTMLElement>(
          `[data-message-id="${messageRow.data.id}"]`,
        );
        el?.scrollIntoView({ block: (opts?.align ?? "center") as ScrollLogicalPosition, behavior: "smooth" });
        el?.focus({ preventScroll: true });
      }
    },
    [rowVirtualizer, rows, shouldVirtualize],
  );

  const scrollToMessageId = useCallback(
    (messageId: string) => {
      const idx = indexByMessageId.get(messageId);
      if (idx !== undefined) scrollToRowIndex(idx, { align: "center" });
    },
    [indexByMessageId, scrollToRowIndex],
  );

  useEffect(() => {
    onScrollToMessageId?.(scrollToMessageId);
    return () => onScrollToMessageId?.(null);
  }, [onScrollToMessageId, scrollToMessageId]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (shouldVirtualize) {
      rowVirtualizer.scrollToIndex(rows.length - 1, { align: "end" });
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  };

  const scrollToFirstUnread = () => {
    if (!firstUnreadMessageId) return;
    if (shouldVirtualize && unreadRowIndex !== null && unreadRowIndex >= 0) {
      scrollToRowIndex(unreadRowIndex, { align: "center" });
    } else {
      scrollToMessageId(firstUnreadMessageId);
    }
  };

  useEffect(() => {
    if (
      scrollRef.current &&
      conversationMessages.length > 0 &&
      shouldScrollToBottom.current &&
      !isLoadingMore
    ) {
      if (shouldVirtualize) {
        rowVirtualizer.scrollToIndex(rows.length - 1, { align: "end" });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      shouldScrollToBottom.current = false;
    }
  }, [
    conversationMessages.length,
    isLoadingMore,
    rowVirtualizer,
    rows.length,
    shouldVirtualize,
  ]);

  const renderRow = (row: (typeof rows)[number], style?: CSSProperties) => {
    if (row.kind === "divider") {
      return <DateDivider key={row.key} timestamp={row.timestamp} />;
    }
    if (row.kind === "unread") {
      return <UnreadDivider key={row.key} count={row.count} />;
    }
    return (
      <div
        key={row.key}
        id={`msg-${row.data.id}`}
        data-message-id={row.data.id}
        tabIndex={-1}
        style={style}
        className={cn(
          "scroll-mt-24 outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        )}
      >
        <MessageItem
          message={row.data}
          isGroup={isGroup}
          showSender={row.showSender}
          showTail={row.showSender}
          highlightQuery={highlightQuery}
          isActiveMatch={activeMatchId === row.data.id}
          onResendFailed={onResendFailed}
        />
      </div>
    );
  };

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="custom-scrollbar smooth-scroll h-full overflow-y-auto bg-transparent"
        onScroll={() => {
          bumpScrollPerfMode();
          updateNearBottom();
          void handleLoadMore();
        }}
      >
        <div
          className={cn(
            "px-4 py-2",
            conversationMessages.length === 0 && "flex min-h-full",
          )}
        >
          {isInitialLoading && conversationMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center bg-transparent">
              <LoadingSpinner size="lg" />
            </div>
          ) : messagesState === "error" && conversationMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center bg-transparent px-6">
              <ErrorState
                error={messagesError}
                onRetry={() => void loadMessages(conversationId)}
              />
            </div>
          ) : !isInitialLoading && conversationMessages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center bg-transparent">
              <NoMessages />
            </div>
          ) : (
            <>
              {messagesError && conversationMessages.length > 0 && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)]/40 bg-[var(--gc-glass-bg)] px-3 py-2 text-xs backdrop-blur-xl">
                  <div className="flex min-w-0 items-center gap-2 text-[var(--color-text-secondary)]">
                    <TriangleAlert className="h-4 w-4 flex-shrink-0 opacity-70" />
                    <span className="truncate">{messagesError || "同步失败"}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadMessages(conversationId)}
                    className="h-7 rounded-full px-2 text-[11px]"
                  >
                    重试
                  </Button>
                </div>
              )}

              {isLoadingMore && (
                <div className="flex justify-center py-3">
                  <LoadingSpinner size="sm" />
                </div>
              )}

              {shouldVirtualize ? (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;
                    const style: CSSProperties = {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    };

                    if (row.kind === "divider" || row.kind === "unread") {
                      return (
                        <div
                          key={row.key}
                          ref={rowVirtualizer.measureElement}
                          data-row-key={row.key}
                          style={style}
                        >
                          {row.kind === "divider" ? (
                            <DateDivider timestamp={row.timestamp} />
                          ) : (
                            <UnreadDivider count={row.count} />
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={row.key}
                        ref={rowVirtualizer.measureElement}
                        data-row-key={row.key}
                        id={`msg-${row.data.id}`}
                        data-message-id={row.data.id}
                        tabIndex={-1}
                        style={style}
                        className={cn(
                          "scroll-mt-24 outline-none",
                          "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/35",
                          "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                        )}
                      >
                        <MessageItem
                          message={row.data}
                          isGroup={isGroup}
                          showSender={row.showSender}
                          showTail={row.showSender}
                          highlightQuery={highlightQuery}
                          isActiveMatch={activeMatchId === row.data.id}
                          onResendFailed={onResendFailed}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                rows.map((row) => renderRow(row))
              )}
            </>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 bottom-4 flex flex-col items-end gap-2">
        {conversationMessages.length > 0 &&
          unreadCount > 0 &&
          firstUnreadMessageId && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={cn(
                "pointer-events-auto rounded-full border border-[var(--gc-glass-border)] bg-[var(--gc-glass-bg)] backdrop-blur-xl",
                "shadow-sm",
                "animate-in fade-in-0 zoom-in-95 duration-150",
              )}
              onClick={scrollToFirstUnread}
              aria-label="跳转到未读消息"
            >
              <CircleDot className="h-4 w-4" />
              <span className="ml-1 tabular-nums">{unreadCount}</span>
            </Button>
          )}

        {conversationMessages.length > 0 && !isNearBottom && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className={cn(
              "pointer-events-auto h-10 w-10 rounded-full border border-[var(--gc-glass-border)] bg-[var(--gc-glass-bg)] backdrop-blur-xl",
              "shadow-sm",
              "animate-in fade-in-0 slide-in-from-bottom-2 duration-150",
            )}
            onClick={scrollToBottom}
            aria-label="跳转到最新消息"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
