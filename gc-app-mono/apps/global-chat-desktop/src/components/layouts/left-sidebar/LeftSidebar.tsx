import { FC } from "react";
import { EAppMode } from "@gc/model";
import { MultiProxySidebar } from "@/components/layouts/left-sidebar/MultiProxySidebar.tsx";
import { AggregatedChatSidebar } from "@/components/layouts/left-sidebar/AggregatedChatSidebar.tsx";
import { useAppStore } from "@gc/store";
import { cn } from "@gc/ui/lib/utils";

export const LeftSidebar: FC = () => {
  const appMode = useAppStore((s) => s.appMode);

  return (
    <aside
      className={cn(
        "w-[72px] h-full flex flex-col items-center",
        "bg-white border-r border-[#E0DDD6]",
        "pt-12 pb-4 gap-2",
      )}
    >
      {appMode === EAppMode.MultiProxy ? (
        <MultiProxySidebar />
      ) : (
        <AggregatedChatSidebar />
      )}
    </aside>
  );
};
