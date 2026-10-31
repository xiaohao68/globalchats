"use client"

import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { DEFAULT_THEME, type ThemeConfig } from "@/modules/theme/constants/theme-presets"

interface ThemeContextType {
  theme: ThemeConfig
  setTheme: (theme: ThemeConfig) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ActiveThemeProviderProps {
  children: ReactNode
  initialTheme?: ThemeConfig
}

export function ActiveThemeProvider({ children, initialTheme }: ActiveThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeConfig>(() => initialTheme ?? DEFAULT_THEME)

  useEffect(() => {
    const body = document.body

    if (theme.radius !== "default") {
      body.setAttribute("data-theme-radius", theme.radius)
    } else {
      body.removeAttribute("data-theme-radius")
    }

    if (theme.preset !== "default") {
      body.setAttribute("data-theme-preset", theme.preset)
    } else {
      body.removeAttribute("data-theme-preset")
    }

    body.setAttribute("data-theme-content-layout", theme.contentLayout)

    if (theme.scale !== "none") {
      body.setAttribute("data-theme-scale", theme.scale)
    } else {
      body.removeAttribute("data-theme-scale")
    }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useThemeConfig() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useThemeConfig must be used within an ActiveThemeProvider")
  }
  return context
}
