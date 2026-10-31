"use client"

import { Label } from "@/shadcn-ui-kit/ui/label"
import { useThemeConfig } from "@/modules/theme/components/active-theme-provider"
import { ToggleGroup, ToggleGroupItem } from "@/shadcn-ui-kit/ui/toggle-group"
import { type ThemeContentLayout } from "@/modules/theme/constants/theme-presets"

export function ContentLayoutSelector() {
  const { theme, setTheme } = useThemeConfig()

  function handleContentLayout(value: string) {
    if (!value) return
    setTheme({ ...theme, contentLayout: value as ThemeContentLayout })
  }

  return (
    <div className="hidden flex-col gap-4 lg:flex">
      <Label>Content layout</Label>
      <ToggleGroup
        value={theme.contentLayout}
        type="single"
        onValueChange={handleContentLayout}
        className="*:border-input w-full gap-4 *:rounded-md *:border">
        <ToggleGroupItem variant="outline" value="full">
          Full
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="centered"
          className="data-[variant=outline]:border-l-1">
          Centered
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
