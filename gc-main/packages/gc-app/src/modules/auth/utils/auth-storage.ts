import { ACCESS_TOKEN_KEY, AUTH_COOKIE_KEY, AUTH_COOKIE_MAX_AGE } from "@/modules/auth/constants/auth-storage"

function isSecureContext() {
  if (typeof window === "undefined") return false
  return window.location.protocol === "https:"
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, maxAge: number, httpOnly = false) {
  if (typeof document === "undefined") return
  const secure = isSecureContext() ? "; Secure" : ""
  const httpOnlyStr = httpOnly ? "; HttpOnly" : ""
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/console; max-age=${maxAge}; SameSite=Lax${secure}${httpOnlyStr}`
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return
  const secure = isSecureContext() ? "; Secure" : ""
  document.cookie = `${name}=; path=/console; max-age=0; SameSite=Lax${secure}`
}

export function getAccessToken() {
  // Read from cookie instead of localStorage
  return getCookie(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string) {
  // Store in cookie (non-httpOnly for client access)
  setCookie(ACCESS_TOKEN_KEY, token, AUTH_COOKIE_MAX_AGE, false)
}

export function clearAccessToken() {
  deleteCookie(ACCESS_TOKEN_KEY)
}

export function setAuthCookieFlag() {
  setCookie(AUTH_COOKIE_KEY, "1", AUTH_COOKIE_MAX_AGE, false)
}

export function clearAuthCookieFlag() {
  deleteCookie(AUTH_COOKIE_KEY)
}

export function clearAuthState() {
  clearAccessToken()
  clearAuthCookieFlag()
}
