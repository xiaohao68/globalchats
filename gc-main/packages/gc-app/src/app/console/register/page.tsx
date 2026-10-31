import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { RegisterForm } from "@/modules/auth/components/register-form";
import { resolveSafeNextPath } from "@/modules/auth/utils/next-path";

export const metadata: Metadata = {
  title: "Register",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; invite?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = Array.isArray(resolvedSearchParams.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams.next;
  const inviteCode = Array.isArray(resolvedSearchParams.invite)
    ? resolvedSearchParams.invite[0]
    : resolvedSearchParams.invite;

  if (typeof nextPath === "string") {
    const safeNextPath = resolveSafeNextPath(nextPath);
    if (safeNextPath !== nextPath) {
      const normalizedSearchParams = new URLSearchParams();
      normalizedSearchParams.set("next", safeNextPath);
      if (typeof inviteCode === "string" && inviteCode) {
        normalizedSearchParams.set("invite", inviteCode);
      }
      redirect(`/console/register?${normalizedSearchParams.toString()}`);
    }
  }

  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
