"use client"

import { PanelLeftIcon } from "lucide-react"

import { Separator } from "@/shadcn-ui-kit/ui/separator"
import Notifications from "./notifications"
import Search from "./search"
import UserMenu from "./user-menu"
import { Button } from "@/shadcn-ui-kit/ui/button"
import { useSidebar } from "@/shadcn-ui-kit/ui/sidebar"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()

  return (
    <header className="bg-background/40 sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) md:rounded-tl-xl md:rounded-tr-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2">
        <Button onClick={toggleSidebar} size="icon" variant="ghost">
          <PanelLeftIcon />
        </Button>
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <Search />

        <div className="ml-auto flex items-center gap-2">
          <Notifications />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
