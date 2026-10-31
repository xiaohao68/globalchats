"use client"

import { useEffect } from "react"
import ReactGA from "react-ga4"

export default function GoogleAnalyticsInit() {
  useEffect(() => {
    const googleAnalyticsKey = process.env.GOOGLE_ANALYTICS_KEY

    if (!googleAnalyticsKey) {
      console.error("Google Analytics key not provided.")
      return
    }

    ReactGA.initialize(googleAnalyticsKey)
    ReactGA.send("pageview")
  }, [])

  return null
}
