"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apolloClient } from "@/modules/auth/utils/apollo-client"
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth"
import { Spinner } from "@/shadcn-ui-kit/ui/spinner"

interface MeAdminQueryResponse {
  me: {
    isAdmin: boolean
  } | null
}

interface AdminRouteGuardProps {
  children: React.ReactNode
}

export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter()
  const [isAllowed, setIsAllowed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    async function checkAdminAccess() {
      try {
        const { data } = await apolloClient.query<MeAdminQueryResponse>({
          query: ME_QUERY,
          fetchPolicy: "network-only"
        })

        const hasAdminAccess = data?.me?.isAdmin === true
        if (!mounted) return
        if (!hasAdminAccess) {
          router.replace("/console/dashboard")
          return
        }

        setIsAllowed(true)
      } catch {
        if (!mounted) return
        router.replace("/console/dashboard")
      } finally {
        if (!mounted) return
        setIsChecking(false)
      }
    }

    void checkAdminAccess()

    return () => {
      mounted = false
    }
  }, [router])

  if (isChecking)
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Spinner className="size-5" />
      </div>
    )

  if (!isAllowed) return null
  return <>{children}</>
}
