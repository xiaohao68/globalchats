import { NextRequest, NextResponse } from "next/server"
import { ACCESS_TOKEN_KEY, AUTH_COOKIE_KEY } from "@/modules/auth/constants/auth-storage"

const STATIC_FILE_PATTERN = /\.(?:png|jpg|jpeg|svg|webp|gif|css|js|map|txt|xml)$/i
const CONSOLE_BASE_PATH = "/console"
const CONSOLE_LOGIN_PATH = `${CONSOLE_BASE_PATH}/login`
const CONSOLE_REGISTER_PATH = `${CONSOLE_BASE_PATH}/register`

function isPublicPath(pathname: string) {
  if (!pathname.startsWith(CONSOLE_BASE_PATH)) return true
  if (pathname === CONSOLE_BASE_PATH) return true
  if (pathname === CONSOLE_LOGIN_PATH) return true
  if (pathname === CONSOLE_REGISTER_PATH) return true
  if (pathname === "/graphql") return true
  if (pathname.startsWith(`${CONSOLE_BASE_PATH}/invite/`)) return true
  if (pathname.startsWith("/_next/")) return true
  if (pathname === "/favicon.ico" || pathname === "/icon.svg") return true
  return STATIC_FILE_PATTERN.test(pathname)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAuthCookie = request.cookies.get(AUTH_COOKIE_KEY)?.value === "1"
  const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_KEY)?.value)
  const hasConsoleSession = hasAuthCookie && hasAccessToken

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (!hasConsoleSession) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = CONSOLE_LOGIN_PATH
    loginUrl.search = ""
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/console/:path*"]
}
