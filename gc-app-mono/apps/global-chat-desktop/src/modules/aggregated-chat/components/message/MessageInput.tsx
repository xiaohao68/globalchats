import { useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import { cn } from "@gc/ui/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  sendDisabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  sendDisabled = false,
  placeholder = "输入消息...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isTextDisabled = disabled;
  const isSendDisabled = disabled || isSending || sendDisabled;
  const trimmedContent = useMemo(() => content.trim(), [content]);
  const canSend = trimmedContent.length > 0 && !isSendDisabled;

  const handleSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    setSendError(null);

    try {
      await onSend(trimmedContent);
      setContent("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch {
      setSendError("发送失败，请检查网络后重试。");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (sendError) setSendError(null);
    setContent(e.target.value);

    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="px-4 py-3">
      {sendError && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{sendError}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
          >
            重试
          </Button>
        </div>
      )}

      <div
        className={cn(
          "flex items-center gap-3 p-3",
          "gc-glass-l3 rounded-2xl",
        )}
      >
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isTextDisabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl px-4 py-2",
              "text-[var(--color-text-primary)] text-[var(--font-size-body)]",
              "bg-white/50",
              "border border-transparent",
              "placeholder:text-[var(--color-text-tertiary)]",
              "focus:border-[var(--color-accent)] focus:outline-none focus:ring-0 focus:shadow-none",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "transition-all duration-[var(--transition-fast)]",
              "max-h-[120px] min-h-[36px]",
            )}
          />
        </div>

        <Button
          size="icon"
          onClick={() => void handleSend()}
          disabled={!canSend}
          className={cn(
            "h-9 w-9 flex-shrink-0 rounded-full",
            "transition-all duration-[var(--transition-fast)]",
            canSend
              ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
              : "bg-white/50 text-[var(--color-text-tertiary)]",
          )}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
          <span className="sr-only">{isSending ? "发送中" : "发送"}</span>
        </Button>
      </div>
    </div>
  );
}
