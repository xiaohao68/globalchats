import { useMemo } from "react";
import { ChatListItem } from "../chat/ChatListItem";
import {
  ErrorState,
  NoConversations,
  NoSearchResults,
} from "../common/EmptyState";
import { useChatStore } from "../../store/chatStore";
import { useUIStore } from "../../store/uiStore";
import { cn } from "@gc/ui/lib/utils";
import { Button } from "@gc/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@gc/ui/components/collapsible";
import { ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import { LoadingSpinner } from "../common/LoadingSpinner";

export function ChatSidebarList() {
  const {
    conversations,
    getFilteredConversations,
    getAccountById,
    searchQuery,
    conversationsState,
    conversationsError,
    loadConversations,
  } = useChatStore();
  const {
    selectedConversationId,
    selectConversation,
    accountFilter,
    pinnedConversationIds,
    collapsedSections,
    setSectionCollapsed,
    toggleConversationPinned,
  } = useUIStore();

  // 获取过滤后的对话列表
  const filteredConversations = useMemo(() => {
    const result = getFilteredConversations({
      accountIds: accountFilter,
    });

    return [...result].sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  }, [conversations, getFilteredConversations, accountFilter, searchQuery]);

  const [pinnedConversations, recentConversations] = useMemo(() => {
    const pinnedIdSet = new Set(pinnedConversationIds);

    const pinnedById = new Map(
      filteredConversations
        .filter((c) => pinnedIdSet.has(c.id))
        .map((c) => [c.id, c] as const),
    );
    const pinned = pinnedConversationIds
      .map((id) => pinnedById.get(id))
      .filter(
        (c): c is (typeof filteredConversations)[number] => c !== undefined,
      );

    const recent: typeof filteredConversations = [];
    for (const conv of filteredConversations) {
      if (pinnedIdSet.has(conv.id)) continue;
      recent.push(conv);
    }

    return [pinned, recent];
  }, [filteredConversations, pinnedConversationIds]);

  const SectionHeader = ({
    title,
    count,
    collapsed,
    className,
  }: {
    title: string;
    count: number;
    collapsed: boolean;
    className?: string;
  }) => (
    <CollapsibleTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-full justify-between rounded-md px-2",
          "text-[11px] font-medium tracking-wide text-[var(--color-text-tertiary)]",
          "hover:bg-white/[0.05] hover:text-[var(--color-text-secondary)]",
          "transition-colors duration-150",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate">{title}</span>
          <span className="tabular-nums text-[var(--color-text-muted)]">{count}</span>
        </div>
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        )}
      </Button>
    </CollapsibleTrigger>
  );

  if (
    (conversationsState === "idle" || conversationsState === "loading") &&
    conversations.length === 0
  ) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (conversationsState === "error" && conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <ErrorState
          error={conversationsError}
          onRetry={() => void loadConversations()}
        />
      </div>
    );
  }

  // 搜索无结果
  if (searchQuery && filteredConversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <NoSearchResults />
      </div>
    );
  }

  // 无对话
  if (filteredConversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <NoConversations />
      </div>
    );
  }

  return (
    <div className="smooth-scroll h-full w-full flex-1 overflow-y-scroll">
      <div className="px-2 py-2">
        {conversationsError && conversations.length > 0 && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-xs backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2 text-[var(--color-text-secondary)]">
              <TriangleAlert className="h-4 w-4 flex-shrink-0 opacity-70" />
              <span className="truncate">{conversationsError}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadConversations()}
              className="h-7 rounded-full px-2 text-[11px]"
            >
              重试
            </Button>
          </div>
        )}

        {pinnedConversations.length > 0 && (
          <Collapsible
            open={!collapsedSections.pinned}
            onOpenChange={(open) => setSectionCollapsed("pinned", !open)}
          >
            <SectionHeader
              title="置顶"
              count={pinnedConversations.length}
              collapsed={collapsedSections.pinned}
              className="mt-1"
            />
            <CollapsibleContent>
              {pinnedConversations.map((conversation) => {
                const account = getAccountById(conversation.accountId);
                return (
                  <ChatListItem
                    key={conversation.id}
                    conversation={conversation}
                    account={account}
                    isSelected={selectedConversationId === conversation.id}
                    isPinned={true}
                    onTogglePinned={toggleConversationPinned}
                    onClick={() => selectConversation(conversation.id)}
                  />
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {recentConversations.length > 0 && (
          <Collapsible
            open={!collapsedSections.recent}
            onOpenChange={(open) => setSectionCollapsed("recent", !open)}
          >
            <SectionHeader
              title="最近"
              count={recentConversations.length}
              collapsed={collapsedSections.recent}
              className={cn("mt-1", pinnedConversations.length > 0 && "mt-2")}
            />
            <CollapsibleContent>
              {recentConversations.map((conversation) => {
                const account = getAccountById(conversation.accountId);
                return (
                  <ChatListItem
                    key={conversation.id}
                    conversation={conversation}
                    account={account}
                    isSelected={selectedConversationId === conversation.id}
                    isPinned={false}
                    onTogglePinned={toggleConversationPinned}
                    onClick={() => selectConversation(conversation.id)}
                  />
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
