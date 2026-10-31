import { MessageSquare } from "lucide-react";
import { GcSurface } from "@gc/ui/custorm-components/GcSurface.tsx";

export function ConversationPlaceholder() {
  return (
    <div className="chat-canvas flex h-full items-center justify-center">
      <GcSurface
        variant="glass"
        padding="lg"
        className="w-[520px] max-w-[92vw] border-[var(--gc-glass-border)] text-center"
      >
        <MessageSquare className="text-muted-foreground mx-auto mb-5 h-16 w-16 stroke-[1.5]" />
        <p className="text-title mb-2 text-[var(--color-text-primary)]">
          选择一个对话
        </p>
        <p className="text-meta mx-auto max-w-sm">
          从左侧列表中选择一个聊天开始对话
        </p>
      </GcSurface>
    </div>
  );
}
