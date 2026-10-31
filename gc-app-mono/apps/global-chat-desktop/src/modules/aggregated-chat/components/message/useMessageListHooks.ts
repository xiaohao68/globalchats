import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "../../types";
import { isSameDay } from "../../utils";

export type Row =
  | { kind: "divider"; key: string; timestamp: number }
  | { kind: "unread"; key: string; count: number }
  | { kind: "message"; key: string; data: Message; showSender: boolean };

function isSameSender(msg1: Message | undefined, msg2: Message): boolean {
  if (!msg1) return false;
  const TIME_THRESHOLD = 5 * 60 * 1000;
  return (
    msg1.senderId === msg2.senderId &&
    msg2.timestamp - msg1.timestamp < TIME_THRESHOLD
  );
}

export function useMessageRows(
  messages: Message[],
  unreadCount: number,
  firstUnreadMessageId: string | null | undefined,
) {
  return useMemo(() => {
    const result: Row[] = [];

    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1];
      const needsDateDivider =
        !prevMessage || !isSameDay(prevMessage.timestamp, message.timestamp);

      if (needsDateDivider) {
        result.push({
          kind: "divider",
          key: `divider-${message.timestamp}`,
          timestamp: message.timestamp,
        });
      }

      if (unreadCount > 0 && firstUnreadMessageId === message.id) {
        result.push({
          kind: "unread",
          key: `unread-${message.id}`,
          count: unreadCount,
        });
      }

      result.push({
        kind: "message",
        key: `msg-${message.id}`,
        data: message,
        showSender: needsDateDivider || !isSameSender(prevMessage, message),
      });
    });

    return result;
  }, [messages, firstUnreadMessageId, unreadCount]);
}

export function useScrollPerformance() {
  const timerRef = useRef<number | null>(null);

  const bumpScrollPerfMode = useCallback(() => {
    const root = document.documentElement;
    root.classList.add("chat-is-scrolling");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      root.classList.remove("chat-is-scrolling");
      timerRef.current = null;
    }, 140);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      document.documentElement.classList.remove("chat-is-scrolling");
    };
  }, []);

  return bumpScrollPerfMode;
}

export function useLoadMore(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  conversationId: string,
  loadMoreMessages: (id: string) => Promise<boolean>,
) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setHasMore(true);
  }, [conversationId]);

  const handleLoadMore = useCallback(async () => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return;
    if (scrollRef.current.scrollTop >= 50) return;

    setIsLoadingMore(true);
    const previousHeight = scrollRef.current.scrollHeight;

    try {
      const moreAvailable = await loadMoreMessages(conversationId);
      setHasMore(moreAvailable);

      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const newHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = newHeight - previousHeight;
        }
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, isLoadingMore, hasMore, loadMoreMessages, scrollRef]);

  return { isLoadingMore, hasMore, handleLoadMore };
}

export function useNearBottom(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  messagesLength: number,
) {
  const [isNearBottom, setIsNearBottom] = useState(true);

  const updateNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setIsNearBottom(distance < 96);
  }, [scrollRef]);

  useEffect(() => {
    updateNearBottom();
  }, [messagesLength, updateNearBottom]);

  return { isNearBottom, updateNearBottom };
}
