import { AccountFilterButton } from "../filter";
import { SearchInput } from "./SearchInput";
import { GcSurface } from "@gc/ui/custorm-components/GcSurface.tsx";
import { useMemo } from "react";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@gc/ui/components/badge";
import { Button } from "@gc/ui/components/button";
import { cn } from "@gc/ui/lib/utils";
import { useChatStore } from "../../store/chatStore";
import { useUIStore } from "../../store/uiStore";
import { useSyncStore } from "../../store/syncStore";
import { syncEngine } from "../../services";

export function ChatSidebarHeader() {
  const { getFilteredConversations, getAccountById, searchQuery } =
    useChatStore();
  const { accountFilter, clearFilters } = useUIStore();
  const { isPolling, error } = useSyncStore();

  const visibleConversations = useMemo(() => {
    return getFilteredConversations({
      accountIds: accountFilter,
    });
  }, [accountFilter, getFilteredConversations]);

  const unreadTotal = useMemo(
    () =>
      visibleConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [visibleConversations],
  );

  const activeAccount = useMemo(() => {
    if (accountFilter.length !== 1) return;
    const accountId = accountFilter[0];
    if (!accountId) return;
    return getAccountById(accountId);
  }, [accountFilter, getAccountById]);

  const hasActiveFilters = accountFilter.length > 0;
  const hasSearch = Boolean(searchQuery.trim());
  const showInfoRow = hasActiveFilters || hasSearch;

  return (
    <GcSurface
      asChild
      variant="glass"
      className="sticky top-0 z-20 rounded-none border-x-0 border-t-0 border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-xl"
    >
      <header className="px-4 py-3">
        <div className="flex items-center gap-2">
          <SearchInput className="min-w-0 flex-1" />
          <AccountFilterButton />
        </div>

        {/* 同步状态指示器 */}
        <div className="flex items-center gap-2 mt-2">
          {error ? (
            <button
              onClick={() => syncEngine.startPolling()}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm transition-colors"
              title={error}
            >
              <AlertCircle className="w-4 h-4" />
              <span>同步失败</span>
            </button>
          ) : isPolling ? (
            <div className="flex items-center gap-1 text-emerald-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>同步中</span>
            </div>
          ) : null}
        </div>

        {showInfoRow && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Badge
                variant="secondary"
                className="bg-white/[0.06] text-[var(--color-text-secondary)] border border-white/[0.06] h-6 rounded-full px-2 text-xs"
              >
                <span className="tabular-nums">
                  {visibleConversations.length}
                </span>
                <span className="mx-1 opacity-50">·</span>
                <span className="tabular-nums">{unreadTotal}</span>
                <span className="ml-1 opacity-80">未读</span>
              </Badge>

              {activeAccount && (
                <Badge
                  variant="secondary"
                  className="bg-white/[0.06] text-[var(--color-text-secondary)] border border-white/[0.06] h-6 max-w-[180px] rounded-full px-2"
                >
                  <span className="truncate">{activeAccount.name}</span>
                </Badge>
              )}

              {accountFilter.length > 1 && (
                <Badge
                  variant="secondary"
                  className="bg-white/[0.06] text-[var(--color-text-secondary)] border border-white/[0.06] h-6 rounded-full px-2"
                >
                  <span className="opacity-80">账号</span>
                  <span className="mx-1 opacity-50">·</span>
                  <span className="tabular-nums">{accountFilter.length}</span>
                </Badge>
              )}

              {hasSearch && (
                <Badge
                  variant="secondary"
                  className="bg-white/[0.06] text-[var(--color-text-secondary)] border border-white/[0.06] h-6 max-w-[220px] rounded-full px-2"
                >
                  <span className="truncate">"{searchQuery.trim()}"</span>
                </Badge>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={clearFilters}
                className={cn(
                  "h-7 w-7 rounded-full",
                  "text-[var(--color-text-tertiary)] hover:bg-white/[0.08] hover:text-[var(--color-text-secondary)]",
                )}
                aria-label="清除筛选"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </header>
    </GcSurface>
  );
}
