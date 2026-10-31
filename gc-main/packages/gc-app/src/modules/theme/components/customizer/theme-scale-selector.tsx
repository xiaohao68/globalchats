"use client"

import { Label } from "@/shadcn-ui-kit/ui/label"
import { useThemeConfig } from "@/modules/theme/components/active-theme-provider"
import { ToggleGroup, ToggleGroupItem } from "@/shadcn-ui-kit/ui/toggle-group"
import { BanIcon } from "lucide-react"
import { type ThemeScale } from "@/modules/theme/constants/theme-presets"

export function ThemeScaleSelector() {
  const { theme, setTheme } = useThemeConfig()

  function handleThemeScale(value: string) {
    if (!value) return
    setTheme({ ...theme, scale: value as ThemeScale })
  }

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor="roundedCorner">Scale:</Label>
      <div>
        <ToggleGroup
          value={theme.scale}
          type="single"
          onValueChange={handleThemeScale}
          className="*:border-input w-full gap-3 *:rounded-md *:border">
          <ToggleGroupItem variant="outline" value="none">
            <BanIcon />
          </ToggleGroupItem>
          <ToggleGroupItem
            variant="outline"
            value="sm"
            className="text-xs data-[variant=outline]:border-l-1">
            XS
          </ToggleGroupItem>
          <ToggleGroupItem
            variant="outline"
            value="lg"
            className="text-xs data-[variant=outline]:border-l-1">
            LG
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
