"use client"

import { useAuth } from "./auth-context"
import { Spinner } from "@/shadcn-ui-kit/ui/spinner"

export function AuthLoading() {
  const { isLoading } = useAuth()

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background">
      <Spinner className="size-8" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  )
}
