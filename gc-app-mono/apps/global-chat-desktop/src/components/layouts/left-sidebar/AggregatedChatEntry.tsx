import { FC } from "react";
import { cn } from "@gc/lib/utils.ts";
import { defaultTransition } from "@gc/utils";
import { webviewManger } from "@gc/webview";
import { MessagesSquare } from "lucide-react";

export const AggregatedChatEntry: FC = () => {
  const handleClick = async () => {
    await webviewManger.openAggregatedChat();
  };

  return (
    <div className="h-[44px] pl-[24px]">
      <div
        className={cn("group flex h-full w-full cursor-pointer items-center")}
        onClick={handleClick}
      >
        <div
          className={cn(
            "flex h-full w-full rounded-xl",
            "bg-cover bg-no-repeat text-sm",
            defaultTransition,
            "group-hover:bg-primary/10 group-hover:text-primary",
            "group-active:bg-[url('/src/assets/icons/nav_bg_active.svg')] group-active:text-white",
          )}
        >
          <div className="flex flex-1 items-center gap-[10px] pl-[20px]">
            <MessagesSquare size={20} />
            <span className="w-[84px] capitalize">聚合聊天</span>
          </div>
        </div>
      </div>
    </div>
  );
};
