import { useMemo } from "react";
import { Filter, Check } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gc/ui/components/dropdown-menu";
import { cn } from "@gc/ui/lib/utils";
import { ChatAvatar } from "../common/ChatAvatar";
import { useChatStore } from "../../store/chatStore";
import { useUIStore } from "../../store/uiStore";

export function AccountFilterButton() {
  const { accounts } = useChatStore();
  const {
    accountFilter,
    toggleAccountFilter,
    clearFilters,
  } = useUIStore();

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.isActive),
    [accounts],
  );

  const hasFilter = accountFilter.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 flex-shrink-0 rounded-lg",
            "hover:bg-white/[0.08]",
            "transition-colors duration-150",
            hasFilter &&
              "bg-[var(--color-accent)]/15 text-[var(--color-accent)]",
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="sr-only">筛选</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-60 border-[var(--color-border)] bg-[var(--color-bg-primary)]"
      >
        {/* 全部 */}
        <DropdownMenuItem
          onClick={clearFilters}
          className={cn(
            "flex items-center justify-between gap-2 py-2.5",
            "hover:bg-[var(--color-bg-hover)]",
            !hasFilter && "bg-[var(--color-bg-selected)]",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-xs font-medium text-[var(--color-text-secondary)]">
              全
            </span>
            <span className="text-[var(--color-text-primary)]">全部</span>
          </div>
          {!hasFilter && (
            <Check className="h-4 w-4 text-[var(--color-accent)]" />
          )}
        </DropdownMenuItem>

        {/* 账号过滤 */}
        {activeAccounts.length > 1 && (
          <>
            <DropdownMenuSeparator className="bg-[var(--color-divider)]" />
            <DropdownMenuLabel className="text-caption font-normal text-[var(--color-text-tertiary)]">
              按账号筛选（可多选）
            </DropdownMenuLabel>
            {activeAccounts.map((account) => (
              <DropdownMenuItem
                key={account.id}
                onSelect={(e) => {
                  e.preventDefault();
                  toggleAccountFilter(account.id);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 py-2",
                  "hover:bg-[var(--color-bg-hover)]",
                  accountFilter.includes(account.id) &&
                    "bg-[var(--color-bg-selected)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <ChatAvatar
                    src={account.avatar}
                    fallback={account.name}
                    platform={account.platform}
                    size="sm"
                    showStatus={false}
                  />
                  <span className="truncate text-[var(--color-text-primary)]">
                    {account.name}
                  </span>
                </div>
                {accountFilter.includes(account.id) && (
                  <Check className="h-4 w-4 text-[var(--color-accent)]" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
