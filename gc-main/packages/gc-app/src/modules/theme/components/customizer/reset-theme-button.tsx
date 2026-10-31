"use client"

import { useThemeConfig } from "@/modules/theme/components/active-theme-provider"
import { Button } from "@/shadcn-ui-kit/ui/button"
import { DEFAULT_THEME } from "@/modules/theme/constants/theme-presets"

export function ResetThemeButton() {
  const { setTheme } = useThemeConfig()

  function handleResetTheme() {
    setTheme(DEFAULT_THEME)
  }

  return (
    <Button className="mt-4 w-full" onClick={handleResetTheme}>
      Reset to Default
    </Button>
  )
}
