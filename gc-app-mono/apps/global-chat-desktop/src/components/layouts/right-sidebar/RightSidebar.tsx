import { FC } from "react";
import { cn } from "@gc/lib/utils.ts";
import { ERightSidebarPanel } from "@gc/model";
import { useAppStore } from "@gc/store";
import { CRMPanel } from "./CRMPanel";
import { TranslatePanel } from "./TranslatePanel";
import { Users, Languages, X } from "lucide-react";

export const RightSidebar: FC = () => {
  const rightSidebarPanel = useAppStore((s) => s.rightSidebarPanel);
  const setRightSidebarPanel = useAppStore((s) => s.setRightSidebarPanel);

  if (!rightSidebarPanel) {
    return null;
  }

  return (
    <aside className="flex h-full w-[320px] flex-col border-l border-[var(--color-divider)] bg-[var(--color-bg-sidebar)]">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] px-4 py-3">
        <div className="flex gap-1">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              rightSidebarPanel === ERightSidebarPanel.CRM
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
            )}
            onClick={() => setRightSidebarPanel(ERightSidebarPanel.CRM)}
          >
            <Users size={14} />
            <span>CRM</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              rightSidebarPanel === ERightSidebarPanel.Translate
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
            )}
            onClick={() => setRightSidebarPanel(ERightSidebarPanel.Translate)}
          >
            <Languages size={14} />
            <span>翻译</span>
          </button>
        </div>
        <button
          className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          onClick={() => setRightSidebarPanel(null)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rightSidebarPanel === ERightSidebarPanel.CRM ? (
          <CRMPanel />
        ) : (
          <TranslatePanel />
        )}
      </div>
    </aside>
  );
};
