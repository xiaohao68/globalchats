"use client"

import Pusher from "pusher-js"
import { getAccessToken } from "@/modules/auth/utils/auth-storage"

function resolveHost() {
  if (typeof window === "undefined") return "127.0.0.1"
  return window.location.hostname || "127.0.0.1"
}

function resolveBoolean(value?: string) {
  return value === "true"
}

function isRealtimeEnabled() {
  return resolveBoolean(process.env.NEXT_PUBLIC_IM_DELIVERY_ENABLED)
}

export function createImRealtimeClient() {
  if (!isRealtimeEnabled()) return null

  const accessToken = getAccessToken()
  if (!accessToken) return null

  const forceTLS = resolveBoolean(process.env.NEXT_PUBLIC_IM_DELIVERY_PUSHER_USE_TLS)
  const port = Number(process.env.NEXT_PUBLIC_IM_DELIVERY_PUSHER_PORT || "6001")
  const cluster = process.env.NEXT_PUBLIC_IM_DELIVERY_PUSHER_CLUSTER || "mt1"

  const options: any = {
    wsHost: process.env.NEXT_PUBLIC_IM_DELIVERY_PUSHER_HOST || resolveHost(),
    wsPort: port,
    wssPort: port,
    forceTLS,
    enabledTransports: forceTLS ? ["wss"] : ["ws", "wss"],
    authEndpoint: "/pusher/channels/auth",
    auth: {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  }

  options.cluster = cluster

  return new Pusher(process.env.NEXT_PUBLIC_IM_DELIVERY_PUSHER_KEY || "gc-local-key", options)
}
