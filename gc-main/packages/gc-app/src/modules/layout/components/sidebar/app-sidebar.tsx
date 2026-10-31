"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { ChevronsUpDown, PlusIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/shadcn-ui-kit/ui/sidebar"
import { NavMain } from "./nav-main"
import { ScrollArea } from "@/shadcn-ui-kit/ui/scroll-area"
import Logo from "../logo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/shadcn-ui-kit/ui/dropdown-menu"
import { Button } from "@/shadcn-ui-kit/ui/button"
import { Input } from "@/shadcn-ui-kit/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/shadcn-ui-kit/ui/dialog"
import { apolloClient } from "@/modules/auth/utils/apollo-client"
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth"
import { setAccessToken } from "@/modules/auth/utils/auth-storage"
import { ADMIN_TABLES_QUERY } from "@/modules/admin/graphql/operations/admin"
import { buildNavItems } from "@/modules/layout/constants/nav-items"
import type { AdminTablesQueryResponse } from "@/modules/admin/types/admin-graphql"

interface Workspace {
  id: string
  displayName: string
  logo?: string
  role: string
  isCurrent: boolean
  accessToken?: string
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpenMobile, isMobile } = useSidebar()
  const [workspaceName, setWorkspaceName] = useState<string>("Select Workspace")
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminTableNames, setAdminTableNames] = useState<string[]>([])

  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, pathname, setOpenMobile])

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const { data } = await apolloClient.query<{
          me: {
            isAdmin: boolean
            currentWorkspace: { displayName: string } | null
            workspaces: Workspace[]
          }
        }>({
          query: ME_QUERY,
          fetchPolicy: "network-only",
        })

        const currentWs = data?.me?.currentWorkspace
        if (currentWs?.displayName) {
          setWorkspaceName(currentWs.displayName)
        }

        const wsList = data?.me?.workspaces || []
        setWorkspaces(wsList)
        const hasAdminRole = data?.me?.isAdmin === true
        setIsAdmin(hasAdminRole)

        if (hasAdminRole) {
          const { data: tableData } = await apolloClient.query<AdminTablesQueryResponse>({
            query: ADMIN_TABLES_QUERY,
            fetchPolicy: "network-only"
          })
          const names = (tableData?.adminTables ?? []).map((table) => table.name)
          setAdminTableNames(names)
        } else {
          setAdminTableNames([])
        }
      } catch (error) {
        console.error("Failed to fetch workspaces:", error)
      }
    }
    fetchWorkspaces()
  }, [])

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch("/console/api/workspace/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: newWorkspaceName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || "Failed to create workspace")
        return
      }

      // Add new workspace to list
      const newWorkspace: Workspace = {
        id: data.workspace.id,
        displayName: data.workspace.displayName,
        logo: data.workspace.logo,
        role: data.workspace.role,
        accessToken: data.workspace.accessToken,
        isCurrent: true,
      }
      setWorkspaces((prev) => [...prev, newWorkspace])
      setNewWorkspaceName("")
      setIsDialogOpen(false)

      // Update current workspace name
      setWorkspaceName(newWorkspace.displayName)

      // Refresh the page to apply the new workspace token
      router.refresh()
    } catch (error) {
      console.error("Failed to create workspace:", error)
      alert("Failed to create workspace")
    } finally {
      setIsCreating(false)
    }
  }

  const handleSwitchWorkspace = (workspace: Workspace) => {
    if (workspace.isCurrent || !workspace.accessToken) return

    // Set new access token
    setAccessToken(workspace.accessToken)

    // Refresh browser to apply the new workspace token
    window.location.reload()
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0! hover:bg-[var(--primary)]/5">
                  <Logo />
                  <span className="text-foreground font-semibold">{workspaceName}</span>
                  <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="mt-4 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}>
                <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map((workspace) => (
                  <DropdownMenuItem
                    key={workspace.id}
                    className="flex items-center gap-3"
                    onClick={() => handleSwitchWorkspace(workspace)}
                  >
                    <div className="flex size-8 items-center justify-center rounded-md border">
                      {workspace.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={workspace.logo}
                          alt={workspace.displayName}
                          className="size-4 object-contain"
                        />
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">
                          {workspace.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{workspace.displayName}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {workspace.isCurrent ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          workspace.role
                        )}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="ghost">
                      <PlusIcon />
                      New Workspace
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Workspace</DialogTitle>
                      <DialogDescription>
                        Enter a name for your new workspace.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        placeholder="Workspace name"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCreateWorkspace()
                          }
                        }}
                        maxLength={50}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        disabled={isCreating}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateWorkspace}
                        disabled={!newWorkspaceName.trim() || isCreating}
                      >
                        {isCreating ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <NavMain navItems={buildNavItems({ isAdmin, adminTableNames })} />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>

      </SidebarFooter>
    </Sidebar>
  )
}
