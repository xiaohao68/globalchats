import { FC } from "react";
import { Outlet } from "react-router";
import { EAppMode } from "@gc/model";
import { useAppStore, useGlobalStore } from "@gc/store";
import { AggregatedChat } from "@/modules/aggregated-chat";
import { cn } from "@gc/ui/lib/utils";

export const Main: FC = () => {
  const appMode = useAppStore((s) => s.appMode);
  const currentUser = useGlobalStore((state) => {
    const userId = state.currentSignInUserId;
    if (!userId) return null;
    return state.userConfigList[userId]?.userInfo;
  });

  const isAggregatedChat = appMode === EAppMode.AggregatedChat;

  return (
    <main
      className={cn(
        "overflow-hidden bg-white",
        isAggregatedChat
          ? "m-0 flex-1 rounded-none border-0"
          : "m-3 rounded-xl border border-[#E0DDD6]",
      )}
    >
      {isAggregatedChat ? (
        <AggregatedChat currentUserKey={currentUser?.uin} />
      ) : (
        <Outlet />
      )}
    </main>
  );
};
