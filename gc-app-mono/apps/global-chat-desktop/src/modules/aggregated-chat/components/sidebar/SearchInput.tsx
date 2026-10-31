import { useState, useCallback, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@gc/ui/components/input";
import { Button } from "@gc/ui/components/button";
import { cn } from "@gc/ui/lib/utils";
import { useChatStore } from "../../store/chatStore";

interface SearchInputProps {
  className?: string;
}

/**
 * 搜索输入框 - Apple 风格
 * 支持 300ms 防抖
 */
export function SearchInput({ className }: SearchInputProps) {
  const { searchQuery, setSearchQuery } = useChatStore();
  const [localValue, setLocalValue] = useState(searchQuery);

  // 防抖更新全局搜索状态
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, setSearchQuery]);

  // 同步外部变化
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  const handleClear = useCallback(() => {
    setLocalValue("");
    setSearchQuery("");
  }, [setSearchQuery]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
      <Input
        type="text"
        placeholder="搜索聊天..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className={cn(
          "search-input",
          "h-9 pr-9 pl-9",
          "text-[15px]",
          "bg-white/[0.04]",
          "border border-white/[0.06]",
          "rounded-lg",
          "placeholder:text-[var(--color-text-tertiary)]",
          "focus:bg-white/[0.06]",
          "focus:border-[var(--color-accent)]/30",
          "focus:ring-0",
          "transition-all duration-200",
        )}
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className={cn(
            "absolute top-1/2 right-1 -translate-y-1/2",
            "h-7 w-7 rounded-full",
            "hover:bg-[var(--color-bg-hover)]",
          )}
        >
          <X className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
          <span className="sr-only">清除搜索</span>
        </Button>
      )}
    </div>
  );
}
