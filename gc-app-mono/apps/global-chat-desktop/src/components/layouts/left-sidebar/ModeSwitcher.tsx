import { FC } from "react";
import { cn } from "@gc/lib/utils.ts";
import { EAppMode } from "@gc/model";
import { useAppStore } from "@gc/store";
import { webviewManger } from "@gc/webview";
import { Layers, MessagesSquare } from "lucide-react";

export const ModeSwitcher: FC = () => {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  const handleModeSwitch = async (newMode: EAppMode) => {
    if (newMode === appMode) return;

    if (newMode === EAppMode.AggregatedChat) {
      // 切换到聚合聊天：隐藏所有多开代理 WebView
      await webviewManger.hideAllMultiProxyWebviews();
    } else {
      // 切换到多开代理：恢复之前的 WebView
      await webviewManger.showLastActiveWebview();
    }

    setAppMode(newMode);
  };

  return (
    <div className="mb-4 flex gap-1 rounded-lg bg-white/20 p-1">
      <button
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors",
          appMode === EAppMode.MultiProxy
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => handleModeSwitch(EAppMode.MultiProxy)}
      >
        <Layers size={14} />
        <span>多开代理</span>
      </button>
      <button
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors",
          appMode === EAppMode.AggregatedChat
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => handleModeSwitch(EAppMode.AggregatedChat)}
      >
        <MessagesSquare size={14} />
        <span>聚合聊天</span>
      </button>
    </div>
  );
};
