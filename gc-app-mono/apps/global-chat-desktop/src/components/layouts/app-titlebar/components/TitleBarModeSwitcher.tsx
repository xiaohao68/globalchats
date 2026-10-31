import { FC } from "react";
import { cn } from "@gc/lib/utils.ts";
import { EAppMode } from "@gc/model";
import { useAppStore } from "@gc/store";
import { webviewManger } from "@gc/webview";
import { Layers, MessagesSquare } from "lucide-react";

export const TitleBarModeSwitcher: FC = () => {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  const handleSwitchToMultiProxy = async () => {
    setAppMode(EAppMode.MultiProxy);
    await webviewManger.showLastActiveWebview();
  };

  const handleSwitchToAggregatedChat = async () => {
    await webviewManger.hideAllMultiProxyWebviews();
    setAppMode(EAppMode.AggregatedChat);
  };

  return (
    <div className="flex gap-0.5 rounded-md bg-black/5 p-0.5">
      <button
        className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
          appMode === EAppMode.MultiProxy
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={handleSwitchToMultiProxy}
      >
        <Layers size={12} />
        <span>多开代理</span>
      </button>
      <button
        className={cn(
          "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors",
          appMode === EAppMode.AggregatedChat
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={handleSwitchToAggregatedChat}
      >
        <MessagesSquare size={12} />
        <span>聚合聊天</span>
      </button>
    </div>
  );
};
