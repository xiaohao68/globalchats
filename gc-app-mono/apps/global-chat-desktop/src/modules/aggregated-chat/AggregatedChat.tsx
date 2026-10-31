// apps/global-chat-desktop/src/modules/aggregated-chat/AggregatedChat.tsx
import { useEffect, ReactNode } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { useSyncStore } from "./store/syncStore";
import { cn } from "@gc/ui/lib/utils";
import { useGlobalStore } from "@gc/store";
import { notificationService } from "./services/notificationService";

interface AggregatedChatProps {
  /** @deprecated 不再需要传递 currentUserKey */
  currentUserKey?: string;
  onConversationSelect?: (id: string) => void;
  rightSidebarContent?: ReactNode;
  className?: string;
}

function ChatApp() {
  const isSignedIn = useGlobalStore((s) => !!s.currentSignInUserId);

  useEffect(() => {
    if (!isSignedIn) return;

    const init = async () => {
      await notificationService.init();
      await useSyncStore.getState().initialLoad();
      notificationService.markInitialLoadComplete();
      useSyncStore.getState().startPolling();
    };

    init();

    return () => {
      useSyncStore.getState().stopPolling();
      notificationService.destroy();
    };
  }, [isSignedIn]);

  if (!isSignedIn) return null;

  return <MainLayout />;
}

export function AggregatedChat({
  className,
}: AggregatedChatProps) {
  return (
    <div className={cn("h-full w-full", className)}>
      <ChatApp />
    </div>
  );
}

export default AggregatedChat;
