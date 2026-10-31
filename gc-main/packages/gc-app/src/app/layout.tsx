import React, { Suspense } from "react"
import type { Metadata } from "next"
import NextTopLoader from "nextjs-toploader"

import "./globals.css"

import { ApolloAppProvider } from "@/modules/auth/components/apollo-provider"
import { AuthBootstrap } from "@/modules/auth/components/auth-bootstrap"
import { AuthLoading } from "@/modules/auth/components/auth-loading"
import { AuthProvider } from "@/modules/auth/components/auth-context"
import { cn, fontVariables, GoogleAnalyticsInit } from "@/modules/shared"
import { ActiveThemeProvider, DEFAULT_THEME } from "@/modules/theme"
import { ThemeProvider } from "@/shadcn-ui-kit/providers/theme-provider"
import { Toaster } from "@/shadcn-ui-kit/ui/sonner"

export const metadata: Metadata = {
  title: {
    template: "%s - Globalchats",
    default: "Globalchats"
  },
  description: "AI-native marketing site and console unified in a single Next.js app.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico"
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const bodyAttributes = {
    "data-theme-content-layout": DEFAULT_THEME.contentLayout
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn("bg-background group/layout font-sans", fontVariables)}
        {...bodyAttributes}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange>
          <ActiveThemeProvider initialTheme={DEFAULT_THEME}>
            <AuthProvider>
              <ApolloAppProvider>
                <Suspense fallback={null}>
                  <AuthBootstrap />
                </Suspense>
                <AuthLoading />
                {children}
              </ApolloAppProvider>
            </AuthProvider>
            <Toaster position="top-center" richColors />
            <NextTopLoader color="var(--primary)" showSpinner={false} height={2} shadow-sm="none" />
            {process.env.NODE_ENV === "production" ? <GoogleAnalyticsInit /> : null}
          </ActiveThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
