"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

import { apolloClient } from "@/modules/auth/utils/apollo-client"
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth"
import { useThemeConfig } from "@/modules/theme"
import { WORKSPACE_MEMBERS_QUERY } from "@/modules/workspace/graphql/operations/workspace-member"
import {
  mapPreferencesToThemeConfig,
  resolveMemberPreferences
} from "@/modules/settings/constants/member-preferences"
import { resolveCurrentWorkspaceMember } from "@/modules/settings/utils/current-workspace-member"
import { useSidebar } from "@/shadcn-ui-kit/ui/sidebar"

interface MeQueryResponse {
  me: {
    id: string
  } | null
}

interface WorkspaceMemberItem {
  id: string
  userId: string | null
  themePreset?: string | null
  themeRadius?: string | null
  themeScale?: string | null
  themeContentLayout?: string | null
  themeMode?: string | null
  sidebarMode?: string | null
  language?: string | null
}

interface WorkspaceMembersQueryResponse {
  workspace: {
    members: WorkspaceMemberItem[]
  } | null
}

export function MemberPreferencesBootstrap() {
  const { setTheme } = useThemeConfig()
  const { setTheme: setColorMode } = useTheme()
  const { setOpen } = useSidebar()

  useEffect(() => {
    let mounted = true

    async function bootstrapMemberPreferences() {
      try {
        const [{ data: meData }, { data: workspaceData }] = await Promise.all([
          apolloClient.query<MeQueryResponse>({
            query: ME_QUERY,
            fetchPolicy: "network-only"
          }),
          apolloClient.query<WorkspaceMembersQueryResponse>({
            query: WORKSPACE_MEMBERS_QUERY,
            fetchPolicy: "network-only"
          })
        ])

        const members = workspaceData?.workspace?.members || []
        const currentMember = resolveCurrentWorkspaceMember(members, meData?.me?.id)
        if (!mounted || !currentMember) return

        const preferences = resolveMemberPreferences(currentMember)
        setTheme(mapPreferencesToThemeConfig(preferences))
        setColorMode(preferences.themeMode)
        setOpen(preferences.sidebarMode === "default")
      } catch (error) {
        console.error("Failed to bootstrap member preferences:", error)
      }
    }

    void bootstrapMemberPreferences()

    return () => {
      mounted = false
    }
  }, [setColorMode, setOpen, setTheme])

  return null
}
