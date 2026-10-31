import { useEffect } from "react";
import { ChatSidebar } from "../sidebar/ChatSidebar";
import { useUIStore } from "../../store/uiStore";
import { useChatStore } from "../../store/chatStore";
import { useSyncStore } from "../../store/syncStore";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { TopNoticeBar } from "../common/TopNoticeBar";
import { ConversationView } from "../conversation/ConversationView";
import { ConversationPlaceholder } from "../conversation/ConversationPlaceholder";
import { RightPanel, RightPanelToggle } from "../right-panel";
import { cn } from "@gc/ui/lib/utils";

export function MainLayout() {
  const { selectedConversationId } = useUIStore();
  const { status: networkStatus, justReconnected } = useNetworkStatus();
  const {
    accountsState,
    conversationsState,
    accountsError,
    conversationsError,
    refreshAll,
  } = useChatStore();
  const { error: syncError, poll, isPolling } = useSyncStore();

  const isSyncing =
    accountsState === "loading" ||
    conversationsState === "loading" ||
    isPolling;
  const combinedError = syncError || accountsError || conversationsError;

  useEffect(() => {
    if (!justReconnected) return;
    void refreshAll({ conversationId: selectedConversationId });
  }, [justReconnected, refreshAll, selectedConversationId]);

  const handleRetrySync = () => {
    if (syncError) {
      void poll();
    } else {
      void refreshAll({ conversationId: null });
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <TopNoticeBar
        networkStatus={networkStatus}
        isSyncing={isSyncing}
        syncError={combinedError}
        onRetrySync={handleRetrySync}
      />
      <div className="flex min-h-0 flex-1">
        {/* 左侧对话列表 */}
        <aside
          className={cn(
            "w-[280px] flex-shrink-0",
            "bg-[var(--gc-bg-secondary)]/60 backdrop-blur-md",
            "border-r border-[var(--gc-border-1)]"
          )}
        >
          <ChatSidebar />
        </aside>

        {/* 中央消息区域 */}
        <main
          className={cn(
            "flex-1 overflow-hidden",
            "bg-[var(--gc-bg-primary)]/40"
          )}
        >
          {selectedConversationId ? (
            <ConversationView />
          ) : (
            <ConversationPlaceholder />
          )}
        </main>

        {/* 右侧面板 */}
        <aside
          className={cn(
            "w-[320px] flex-shrink-0",
            "bg-[var(--gc-bg-secondary)]/60 backdrop-blur-md",
            "border-l border-[var(--gc-border-1)]"
          )}
        >
          <RightPanel />
        </aside>
      </div>
      <RightPanelToggle />
    </div>
  );
}
