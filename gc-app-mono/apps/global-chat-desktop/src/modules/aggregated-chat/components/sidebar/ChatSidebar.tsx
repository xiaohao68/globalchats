import { ChatSidebarHeader } from "./ChatSidebarHeader";
import { ChatSidebarList } from "./ChatSidebarList";
import { cn } from "@gc/ui/lib/utils";

interface ChatSidebarProps {
  className?: string;
}

export function ChatSidebar({ className }: ChatSidebarProps) {
  return (
    <aside
      className={cn(
        "chat-sidebar-canvas flex h-full w-full flex-col overflow-hidden",
        className,
      )}
    >
      <ChatSidebarHeader />
      <ChatSidebarList />
    </aside>
  );
}
