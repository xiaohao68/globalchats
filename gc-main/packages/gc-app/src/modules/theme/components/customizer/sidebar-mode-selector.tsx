"use client";

import { Label } from "@/shadcn-ui-kit/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/shadcn-ui-kit/ui/toggle-group";
import { useSidebar } from "@/shadcn-ui-kit/ui/sidebar";

export function SidebarModeSelector() {
  const { open, setOpen } = useSidebar();

  function handleSidebarModeChange(value: string) {
    if (!value) return;
    setOpen(value === "default");
  }

  return (
    <div className="hidden flex-col gap-4 lg:flex">
      <Label>Sidebar mode:</Label>
      <ToggleGroup
        value={open ? "default" : "icon"}
        type="single"
        onValueChange={handleSidebarModeChange}
        className="*:border-input w-full gap-4 *:rounded-md *:border">
        <ToggleGroupItem variant="outline" value="default">
          Default
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="icon"
          className="data-[variant=outline]:border-l-1">
          Icon
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
