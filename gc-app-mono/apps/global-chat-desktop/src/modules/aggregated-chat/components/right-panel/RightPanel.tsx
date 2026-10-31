import { Users, Languages, PanelRightClose } from "lucide-react";
import { cn } from "@gc/ui/lib/utils";
import { useUIStore } from "../../store/uiStore";
import { CrmTab } from "./tabs/CrmTab";
import { TranslateTab } from "./tabs/TranslateTab";

export function RightPanel() {
  const {
    isRightPanelOpen,
    rightPanelActiveTab,
    setRightPanelOpen,
    setRightPanelActiveTab,
  } = useUIStore();

  if (!isRightPanelOpen) {
    return null;
  }

  return (
    <aside className="flex h-full w-[280px] flex-shrink-0 flex-col border-l border-[var(--color-divider)] bg-[var(--color-bg-sidebar)]">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] px-3 py-2">
        <div className="flex gap-1">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              rightPanelActiveTab === "crm"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            )}
            onClick={() => setRightPanelActiveTab("crm")}
          >
            <Users size={14} />
            <span>CRM</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              rightPanelActiveTab === "translate"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            )}
            onClick={() => setRightPanelActiveTab("translate")}
          >
            <Languages size={14} />
            <span>翻译</span>
          </button>
        </div>
        <button
          className="rounded-md p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          onClick={() => setRightPanelOpen(false)}
          title="折叠面板"
        >
          <PanelRightClose size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rightPanelActiveTab === "crm" ? <CrmTab /> : <TranslateTab />}
      </div>
    </aside>
  );
}
