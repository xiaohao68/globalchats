"use client"

import { Label } from "@/shadcn-ui-kit/ui/label"
import { useThemeConfig } from "@/modules/theme/components/active-theme-provider"
import { ToggleGroup, ToggleGroupItem } from "@/shadcn-ui-kit/ui/toggle-group"
import { BanIcon } from "lucide-react"
import { type ThemeRadius } from "@/modules/theme/constants/theme-presets"

export function ThemeRadiusSelector() {
  const { theme, setTheme } = useThemeConfig()

  function handleThemeRadius(value: string) {
    if (!value) return
    setTheme({ ...theme, radius: value as ThemeRadius })
  }

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor="roundedCorner">Radius:</Label>
      <ToggleGroup
        value={theme.radius}
        type="single"
        onValueChange={handleThemeRadius}
        className="*:border-input w-full gap-3 *:rounded-md *:border">
        <ToggleGroupItem variant="outline" value="none">
          <BanIcon />
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="sm"
          className="text-xs data-[variant=outline]:border-l-1">
          SM
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="md"
          className="text-xs data-[variant=outline]:border-l-1">
          MD
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="lg"
          className="text-xs data-[variant=outline]:border-l-1">
          LG
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="xl"
          className="text-xs data-[variant=outline]:border-l-1">
          XL
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
