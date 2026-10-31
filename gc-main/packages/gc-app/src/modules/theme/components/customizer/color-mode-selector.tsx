"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { Label } from "@/shadcn-ui-kit/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/shadcn-ui-kit/ui/toggle-group"

export function ColorModeSelector() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleColorMode(value: string) {
    if (!value) return
    setTheme(value as "light" | "dark")
  }

  return (
    <div className="flex flex-col gap-4">
      <Label htmlFor="roundedCorner">Color mode:</Label>
      <ToggleGroup
        value={mounted ? theme : undefined}
        type="single"
        onValueChange={handleColorMode}
        className="*:border-input w-full gap-4 *:rounded-md *:border">
        <ToggleGroupItem variant="outline" value="light">
          Light
        </ToggleGroupItem>
        <ToggleGroupItem
          variant="outline"
          value="dark"
          className="data-[variant=outline]:border-l-1">
          Dark
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
