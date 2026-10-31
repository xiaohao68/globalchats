"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getMe } from "@/modules/auth/utils/auth-api";
import { AUTH_COOKIE_KEY } from "@/modules/auth/constants/auth-storage";
import { clearAuthState, getAccessToken, setAuthCookieFlag } from "@/modules/auth/utils/auth-storage";
import { resolveSafeNextPath, toLoginPathWithNext } from "@/modules/auth/utils/next-path";
import { useAuth } from "./auth-context";

function hasAuthCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((value) => value.startsWith(`${AUTH_COOKIE_KEY}=`));
}

export function AuthBootstrap() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setLoading } = useAuth();

  const isConsolePath = pathname === "/console" || pathname.startsWith("/console/")
  const isPublicPath =
    pathname === "/console/login" || pathname === "/console/register" || pathname.startsWith("/console/invite/");
  const currentPathWithQuery = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    if (!isConsolePath) {
      setLoading(false);
      return;
    }

    const token = getAccessToken();

    if (!token) {
      if (!isPublicPath && hasAuthCookie()) {
        clearAuthState();
        router.replace(toLoginPathWithNext(currentPathWithQuery));
      }
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function validateSession() {
      try {
        await getMe();
        if (!isMounted) return;
        setLoading(false);
        setAuthCookieFlag();
        if (pathname === "/console/login" || pathname === "/console/register") {
          router.replace(resolveSafeNextPath(searchParams.get("next")));
        }
      } catch {
        if (!isMounted) return;
        setLoading(false);
        clearAuthState();
        if (!isPublicPath) {
          router.replace(toLoginPathWithNext(currentPathWithQuery));
        }
      }
    }

    void validateSession();

    return () => {
      isMounted = false;
    };
  }, [currentPathWithQuery, isConsolePath, isPublicPath, pathname, router, searchParams, setLoading]);

  return null;
}
