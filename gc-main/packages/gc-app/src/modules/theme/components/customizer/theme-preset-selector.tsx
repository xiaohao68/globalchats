"use client"

import { DEFAULT_THEME, THEMES, type ThemePreset } from "@/modules/theme/constants/theme-presets"
import { useThemeConfig } from "@/modules/theme/components/active-theme-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/shadcn-ui-kit/ui/select"
import { Label } from "@/shadcn-ui-kit/ui/label"

export function ThemePresetSelector() {
  const { theme, setTheme } = useThemeConfig()

  function handlePreset(value: string) {
    if (!value) return
    setTheme({ ...theme, ...DEFAULT_THEME, preset: value as ThemePreset })
  }

  return (
    <div className="flex flex-col gap-4">
      <Label>Theme preset:</Label>
      <Select value={theme.preset} onValueChange={handlePreset}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a theme" />
        </SelectTrigger>
        <SelectContent align="end">
          {THEMES.map((themePreset) => (
            <SelectItem key={themePreset.name} value={themePreset.value}>
              <div className="flex shrink-0 gap-1">
                {themePreset.colors.map((color, key) => (
                  <span
                    key={key}
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}></span>
                ))}
              </div>
              {themePreset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
