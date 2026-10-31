import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/modules/auth/components/login-form";
import { resolveSafeNextPath } from "@/modules/auth/utils/next-path";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login"
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const nextPath = Array.isArray(next) ? next[0] : next;

  if (typeof nextPath === "string") {
    const safeNextPath = resolveSafeNextPath(nextPath);
    if (safeNextPath !== nextPath) {
      redirect(`/console/login?next=${encodeURIComponent(safeNextPath)}`);
    }
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
