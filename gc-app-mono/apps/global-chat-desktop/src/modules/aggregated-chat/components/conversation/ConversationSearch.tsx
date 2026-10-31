import { useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import { Input } from "@gc/ui/components/input";
import { Kbd, KbdGroup } from "@gc/ui/components/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gc/ui/components/popover";
import { cn } from "@gc/ui/lib/utils";

export interface ConversationSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  matchCount: number;
  activeIndex: number; // 0-based, -1 when none
  onPrev: () => void;
  onNext: () => void;
}

export function ConversationSearch({
  open,
  onOpenChange,
  query,
  onQueryChange,
  matchCount,
  activeIndex,
  onPrev,
  onNext,
}: ConversationSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const label = useMemo(() => {
    if (!query.trim()) return "搜索";
    if (matchCount === 0) return "无结果";
    return `${activeIndex + 1}/${matchCount}`;
  }, [activeIndex, matchCount, query]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          aria-label="在对话中搜索（⌘/Ctrl + F）"
        >
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] rounded-xl border border-[var(--gc-glass-border)] bg-[var(--gc-glass-bg)] p-3 backdrop-blur-xl"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="在对话中搜索…"
                className={cn(
                  "h-9 rounded-full pr-10 pl-9",
                  "bg-background/70",
                  "border-border/60",
                  "focus-visible:ring-ring/30",
                )}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onOpenChange(false);
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) onPrev();
                    else onNext();
                  }
                }}
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-full"
                  onClick={() => onQueryChange("")}
                  aria-label="清除搜索"
                >
                  <X className="text-muted-foreground h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="mt-2 flex items-center justify-between px-1">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>F</Kbd>
                </KbdGroup>
                <span className="opacity-60">·</span>
                <span className="tabular-nums">{label}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onPrev}
                  disabled={matchCount <= 0}
                  aria-label="上一个匹配"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onNext}
                  disabled={matchCount <= 0}
                  aria-label="下一个匹配"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-1 rounded-full"
            onClick={() => onOpenChange(false)}
            aria-label="关闭搜索"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
