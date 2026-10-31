import { PanelRightOpen } from "lucide-react";
import { useUIStore } from "../../store/uiStore";

export function RightPanelToggle() {
  const { isRightPanelOpen, toggleRightPanel } = useUIStore();

  if (isRightPanelOpen) {
    return null;
  }

  return (
    <button
      onClick={toggleRightPanel}
      className="fixed right-4 top-12 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-lg transition-transform hover:scale-105"
      title="展开面板"
    >
      <PanelRightOpen size={20} />
    </button>
  );
}
