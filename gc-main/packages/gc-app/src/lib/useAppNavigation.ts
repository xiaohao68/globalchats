"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAppUrl } from "./links";

export function useAppNavigation() {
  const router = useRouter();

  const navigate = useCallback(
    (path: string = "/dashboard") => {
      router.push(getAppUrl(path));
    },
    [router],
  );

  return { navigate, getAppUrl };
}
