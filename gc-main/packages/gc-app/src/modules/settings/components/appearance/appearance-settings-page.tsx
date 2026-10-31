"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

import { ME_QUERY } from "@/modules/auth/graphql/operations/auth"
import { apolloClient } from "@/modules/auth/utils/apollo-client"
import {
  areMemberPreferencesEqual,
  DEFAULT_MEMBER_PREFERENCES,
  mapPreferencesToThemeConfig,
  resolveMemberPreferences,
  type MemberLanguage,
  type MemberPreferences
} from "@/modules/settings/constants/member-preferences"
import { resolveCurrentWorkspaceMember } from "@/modules/settings/utils/current-workspace-member"
import {
  useThemeConfig
} from "@/modules/theme"
import { ColorModeSelector } from "@/modules/theme/components/customizer/color-mode-selector"
import { ContentLayoutSelector } from "@/modules/theme/components/customizer/content-layout-selector"
import { ResetThemeButton } from "@/modules/theme/components/customizer/reset-theme-button"
import { SidebarModeSelector } from "@/modules/theme/components/customizer/sidebar-mode-selector"
import { ThemePresetSelector } from "@/modules/theme/components/customizer/theme-preset-selector"
import { ThemeRadiusSelector } from "@/modules/theme/components/customizer/theme-radius-selector"
import { ThemeScaleSelector } from "@/modules/theme/components/customizer/theme-scale-selector"
import {
  UPDATE_WORKSPACE_MEMBER_PREFERENCES_MUTATION,
  WORKSPACE_MEMBERS_QUERY
} from "@/modules/workspace/graphql/operations/workspace-member"
import { Card, CardContent } from "@/shadcn-ui-kit/ui/card"
import { Separator } from "@/shadcn-ui-kit/ui/separator"
import { useSidebar } from "@/shadcn-ui-kit/ui/sidebar"
import { LanguageSelector } from "./language-selector"

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

interface UpdateWorkspaceMemberPreferencesMutationResponse {
  workspace: {
    updateMemberPreferences: WorkspaceMemberItem | null
  } | null
}

export function AppearanceSettingsPage() {
  const { theme, setTheme } = useThemeConfig()
  const { theme: colorModeTheme, setTheme: setColorMode } = useTheme()
  const { open, setOpen } = useSidebar()

  const [language, setLanguage] = useState<MemberLanguage>(
    DEFAULT_MEMBER_PREFERENCES.language
  )
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentWorkspaceMemberId, setCurrentWorkspaceMemberId] = useState<string | null>(null)
  const [isReadyToSync, setIsReadyToSync] = useState(false)

  const latestPersistedPreferencesRef = useRef<MemberPreferences | null>(null)
  const pendingPreferencesRef = useRef<MemberPreferences | null>(null)
  const isSavingRef = useRef(false)

  const currentPreferences = useMemo<MemberPreferences>(
    () => ({
      themePreset: theme.preset,
      themeRadius: theme.radius,
      themeScale: theme.scale,
      themeContentLayout: theme.contentLayout,
      themeMode: colorModeTheme === "dark" ? "dark" : "light",
      sidebarMode: open ? "default" : "icon",
      language
    }),
    [colorModeTheme, language, open, theme.contentLayout, theme.preset, theme.radius, theme.scale]
  )

  const persistPreferences = useCallback(
    async (preferences: MemberPreferences) => {
      if (!currentWorkspaceMemberId) return

      try {
        const { data } =
          await apolloClient.mutate<UpdateWorkspaceMemberPreferencesMutationResponse>({
            mutation: UPDATE_WORKSPACE_MEMBER_PREFERENCES_MUTATION,
            variables: {
              input: {
                workspaceMemberId: currentWorkspaceMemberId,
                themePreset: preferences.themePreset,
                themeRadius: preferences.themeRadius,
                themeScale: preferences.themeScale,
                themeContentLayout: preferences.themeContentLayout,
                themeMode: preferences.themeMode,
                sidebarMode: preferences.sidebarMode,
                language: preferences.language
              }
            }
          })

        const saved = data?.workspace?.updateMemberPreferences
        latestPersistedPreferencesRef.current = resolveMemberPreferences(saved || preferences)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save appearance settings")
      }
    },
    [currentWorkspaceMemberId]
  )

  useEffect(() => {
    let mounted = true
    setIsReadyToSync(false)

    async function loadMemberPreferences() {
      setIsLoadingPreferences(true)
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
        if (!currentMember?.id) throw new Error("Current workspace member not found")

        const preferences = resolveMemberPreferences(currentMember)
        if (!mounted) return

        setCurrentWorkspaceMemberId(currentMember.id)
        setTheme(mapPreferencesToThemeConfig(preferences))
        setColorMode(preferences.themeMode)
        setOpen(preferences.sidebarMode === "default")
        setLanguage(preferences.language)
        latestPersistedPreferencesRef.current = preferences
        setLoadError(null)
        setIsReadyToSync(true)
      } catch (error) {
        if (!mounted) return
        setCurrentWorkspaceMemberId(null)
        setLoadError(error instanceof Error ? error.message : "Failed to load appearance settings")
      } finally {
        if (!mounted) return
        setIsLoadingPreferences(false)
      }
    }

    void loadMemberPreferences()

    return () => {
      mounted = false
    }
  }, [setColorMode, setOpen, setTheme])

  useEffect(() => {
    if (!isReadyToSync || !currentWorkspaceMemberId) return

    const latestPersistedPreferences = latestPersistedPreferencesRef.current
    if (
      latestPersistedPreferences &&
      areMemberPreferencesEqual(latestPersistedPreferences, currentPreferences)
    ) {
      return
    }

    pendingPreferencesRef.current = currentPreferences
    if (isSavingRef.current) return

    async function flushPendingPreferences() {
      isSavingRef.current = true
      while (pendingPreferencesRef.current) {
        const nextPreferences = pendingPreferencesRef.current
        pendingPreferencesRef.current = null
        await persistPreferences(nextPreferences)
      }
      isSavingRef.current = false
    }

    void flushPendingPreferences()
  }, [currentPreferences, currentWorkspaceMemberId, isReadyToSync, persistPreferences])

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <Card>
        <CardContent className="space-y-6">
          {loadError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {loadError}
            </div>
          ) : null}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Appearance</h2>
            <p className="text-muted-foreground text-sm">
              Changes are saved automatically for this workspace member.
            </p>
            <div className="grid gap-4">
              <ThemePresetSelector />
              <ThemeScaleSelector />
              <ThemeRadiusSelector />
              <ColorModeSelector />
              <ContentLayoutSelector />
              <SidebarModeSelector />
            </div>
            <ResetThemeButton />
          </div>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Language</h2>
            <LanguageSelector
              value={language}
              onChange={setLanguage}
              disabled={isLoadingPreferences || !currentWorkspaceMemberId}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
