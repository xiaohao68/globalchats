import React from "react"

import { SidebarInset, SidebarProvider } from "@/shadcn-ui-kit/ui/sidebar"
import { AppSidebar, SiteHeader } from "@/modules/layout"
import { MemberPreferencesBootstrap } from "@/modules/settings/components/member-preferences-bootstrap"

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
          "--content-padding": "calc(var(--spacing) * 4)",
          "--content-margin": "calc(var(--spacing) * 1.5)",
          "--content-full-height":
            "calc(100vh - var(--header-height) - (var(--content-padding) * 2) - (var(--content-margin) * 2))"
        } as React.CSSProperties
      }>
      <MemberPreferencesBootstrap />
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="bg-muted/40 flex flex-1 flex-col">
          <div className="@container/main p-(--content-padding) xl:group-data-[theme-content-layout=centered]/layout:container xl:group-data-[theme-content-layout=centered]/layout:mx-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
