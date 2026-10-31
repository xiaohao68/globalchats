"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemesProviderProps } from "next-themes";

type ThemeProviderProps = React.PropsWithChildren<NextThemesProviderProps>;

const TypedNextThemesProvider =
  NextThemesProvider as React.ComponentType<React.PropsWithChildren<NextThemesProviderProps>>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <TypedNextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="theme"
      {...props}>
      {children}
    </TypedNextThemesProvider>
  );
}
