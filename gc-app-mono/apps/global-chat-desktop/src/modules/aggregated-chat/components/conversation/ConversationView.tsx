import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatStore } from "../../store/chatStore";
import { useUIStore } from "../../store/uiStore";
import { MessageList } from "../message/MessageList";
import { MessageInput } from "../message/MessageInput";
import { ConversationHeader } from "./ConversationHeader";
import { ConversationPlaceholder } from "./ConversationPlaceholder";
import { ConversationSearch } from "./ConversationSearch";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export function ConversationView() {
  const { selectedConversationId: conversationId } = useUIStore();
  const { conversations, sendMessage, getAccountById, messages } =
    useChatStore();
  const { isOnline } = useNetworkStatus();

  const conversation = conversations.find((c) => c.id === conversationId);
  const account = conversation
    ? getAccountById(conversation.accountId)
    : undefined;
  const isGroup = conversation?.contact.isGroup ?? false;

  const conversationMessages = conversationId
    ? (messages[conversationId] ?? [])
    : [];

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollToMessageIdRef = useRef<((messageId: string) => void) | null>(
    null,
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  const normalizedQuery = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery],
  );

  const matchIds = useMemo(() => {
    if (!normalizedQuery) return [];
    return conversationMessages
      .filter((m) => m.content.toLowerCase().includes(normalizedQuery))
      .map((m) => m.id);
  }, [conversationMessages, normalizedQuery]);

  useEffect(() => {
    if (matchIds.length === 0) {
      setActiveMatchIndex(-1);
      return;
    }
    setActiveMatchIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= matchIds.length) return matchIds.length - 1;
      return prev;
    });
  }, [matchIds.length]);

  const activeMatchId =
    activeMatchIndex >= 0 ? (matchIds[activeMatchIndex] ?? null) : null;

  const firstUnreadMessageId = useMemo(() => {
    if (!conversation) return null;
    if (conversation.unreadCount <= 0) return null;
    if (conversationMessages.length === 0) return null;

    let remaining = conversation.unreadCount;
    for (let i = conversationMessages.length - 1; i >= 0; i -= 1) {
      const m = conversationMessages[i];
      if (!m || m.direction !== "incoming") continue;
      remaining -= 1;
      if (remaining === 0) return m.id;
    }

    return conversationMessages[0]?.id ?? null;
  }, [conversation, conversationMessages]);

  const scrollToMessageId = useCallback((messageId: string) => {
    if (scrollToMessageIdRef.current) {
      scrollToMessageIdRef.current(messageId);
      return;
    }
    const container = scrollContainerRef.current;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!activeMatchId) return;
    scrollToMessageId(activeMatchId);
  }, [activeMatchId, scrollToMessageId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "f") return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      e.preventDefault();
      setSearchOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;
      await sendMessage(conversationId, content);
    },
    [conversationId, sendMessage],
  );

  const handleResendFailed = useCallback(
    async (message: { content: string }) => {
      if (!conversationId) return;
      await sendMessage(conversationId, message.content);
    },
    [conversationId, sendMessage],
  );

  if (!conversationId || !conversation) {
    return <ConversationPlaceholder />;
  }

  return (
    <div className="chat-canvas flex h-full flex-col">
      <ConversationHeader
        conversation={conversation}
        account={account}
        actions={
          <ConversationSearch
            open={searchOpen}
            onOpenChange={setSearchOpen}
            query={searchQuery}
            onQueryChange={(q) => {
              setSearchQuery(q);
              setActiveMatchIndex(q.trim() ? 0 : -1);
            }}
            matchCount={matchIds.length}
            activeIndex={activeMatchIndex}
            onPrev={() => {
              if (matchIds.length === 0) return;
              setActiveMatchIndex((i) =>
                i <= 0 ? matchIds.length - 1 : i - 1,
              );
            }}
            onNext={() => {
              if (matchIds.length === 0) return;
              setActiveMatchIndex((i) =>
                i < 0 || i >= matchIds.length - 1 ? 0 : i + 1,
              );
            }}
          />
        }
      />
      <div className="flex-1 overflow-hidden">
        <MessageList
          conversationId={conversationId}
          isGroup={isGroup}
          unreadCount={conversation.unreadCount}
          firstUnreadMessageId={firstUnreadMessageId}
          highlightQuery={normalizedQuery}
          activeMatchId={activeMatchId}
          onResendFailed={(m) => void handleResendFailed(m)}
          onScrollContainer={(el) => {
            scrollContainerRef.current = el;
          }}
          onScrollToMessageId={(fn) => {
            scrollToMessageIdRef.current = fn;
          }}
        />
      </div>
      <MessageInput
        onSend={handleSendMessage}
        sendDisabled={!isOnline}
        placeholder={isOnline ? "输入消息..." : "离线 — 仍可编辑"}
      />
    </div>
  );
}
