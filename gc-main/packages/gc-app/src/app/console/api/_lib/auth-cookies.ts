import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_KEY, AUTH_COOKIE_KEY, AUTH_COOKIE_MAX_AGE } from "@/modules/auth/constants/auth-storage";

export async function setConsoleAuthCookies(request: NextRequest, accessToken: string): Promise<void> {
  const cookieStore = await cookies();
  const isSecure =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.url.startsWith("https://");

  cookieStore.set(ACCESS_TOKEN_KEY, accessToken, {
    httpOnly: false,
    secure: isSecure,
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/console",
  });

  cookieStore.set(AUTH_COOKIE_KEY, "1", {
    httpOnly: false,
    secure: isSecure,
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/console",
  });
}
