"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card";
import { Input } from "@/shadcn-ui-kit/ui/input";
import { Label } from "@/shadcn-ui-kit/ui/label";
import { resolveSafeNextPath } from "@/modules/auth/utils/next-path";
import { WorkspaceSelectModal, type WorkspaceWithToken } from "@/modules/workspace/components/workspace-select-modal";
import { CreateWorkspaceDialog } from "@/modules/workspace/components/create-workspace-dialog";
import { useThemeConfig } from "@/modules/theme";

const DISABLED_LINK_CLASS =
  "ml-auto inline-block cursor-not-allowed text-sm opacity-50 underline pointer-events-none select-none";

const ACCESS_TOKEN_COOKIE_KEY = "gc_console_access_token";
const AUTH_COOKIE_KEY = "gc_console_auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function LoginForm() {
  const { setTheme } = useThemeConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const inviteCodeFromNext = getInviteCodeFromNext(nextParam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showWorkspaceSelect, setShowWorkspaceSelect] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithToken[]>([]);
  const [showCreateWorkspaceDialog, setShowCreateWorkspaceDialog] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [createWorkspaceError, setCreateWorkspaceError] = useState("");

  useEffect(() => {
    setTheme({
      preset: "lavender-dream",
      radius: "default",
      scale: "none",
      contentLayout: "centered"
    });
  }, [setTheme]);

  async function handleWorkspaceSelect(workspace: WorkspaceWithToken) {
    // 保存选中的工作区的 token 到 cookie
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

    document.cookie = `${ACCESS_TOKEN_COOKIE_KEY}=${workspace.accessToken}; path=/console; max-age=${AUTH_COOKIE_MAX_AGE}; ${isSecure ? "secure;" : ""} sameSite=lax`;
    document.cookie = `${AUTH_COOKIE_KEY}=1; path=/console; max-age=${AUTH_COOKIE_MAX_AGE}; ${isSecure ? "secure;" : ""} sameSite=lax`;

    setShowWorkspaceSelect(false);
    const nextPath = resolveSafeNextPath(searchParams.get("next"));
    router.replace(nextPath);
  }

  async function handleCreateWorkspace(displayName: string) {
    setCreateWorkspaceError("");
    setIsCreatingWorkspace(true);

    try {
      const response = await fetch("/console/api/workspace/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Create workspace failed");
      }

      setShowCreateWorkspaceDialog(false);
      const nextPath = resolveSafeNextPath(searchParams.get("next"));
      router.replace(nextPath);
    } catch (error) {
      if (error instanceof Error) {
        setCreateWorkspaceError(error.message);
      } else {
        setCreateWorkspaceError("Create workspace failed");
      }
    } finally {
      setIsCreatingWorkspace(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/console/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // 检查是否需要选择工作区
      if (data.workspaces?.length === 0) {
        setShowCreateWorkspaceDialog(true);
        return;
      }

      if (data.requiresSelection && data.workspaces?.length > 1) {
        setWorkspaces(data.workspaces);
        setShowWorkspaceSelect(true);
        return;
      }

      const nextPath = resolveSafeNextPath(searchParams.get("next"));
      router.replace(nextPath);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Login failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-4 lg:h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@globalchats.org"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/console/dashboard/forgot-password"
                  aria-disabled
                  tabIndex={-1}
                  className={DISABLED_LINK_CLASS}>
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {errorMessage ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>

            <div className="my-4">
              <div className="flex items-center gap-3">
                <div className="w-full border-t" />
                <span className="text-muted-foreground shrink-0 text-sm">or continue with</span>
                <div className="w-full border-t" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="w-full" disabled>
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google (Coming Soon)
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href={resolveRegisterPath(nextParam, inviteCodeFromNext)}
              className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>

      <WorkspaceSelectModal
        open={showWorkspaceSelect}
        workspaces={workspaces}
        onSelect={handleWorkspaceSelect}
      />

      <CreateWorkspaceDialog
        open={showCreateWorkspaceDialog}
        isSubmitting={isCreatingWorkspace}
        errorMessage={createWorkspaceError}
        onSubmit={handleCreateWorkspace}
      />
    </div>
  );
}

function getInviteCodeFromNext(nextParam: string | null): string | null {
  if (!nextParam || !nextParam.startsWith("/console/invite/")) {
    return null;
  }
  const pathSegments = nextParam.split("?")[0].split("/").filter(Boolean);
  if (pathSegments.length < 2) {
    return null;
  }
  return pathSegments[1] || null;
}

function resolveRegisterPath(nextParam: string | null, inviteCode: string | null): string {
  if (inviteCode) {
    return `/console/register?invite=${encodeURIComponent(inviteCode)}`;
  }
  if (nextParam) {
    return `/console/register?next=${encodeURIComponent(nextParam)}`;
  }
  return "/console/register";
}
