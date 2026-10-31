"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card";
import { Input } from "@/shadcn-ui-kit/ui/input";
import { Label } from "@/shadcn-ui-kit/ui/label";
import { resolveSafeNextPath } from "@/modules/auth/utils/next-path";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth";
import { WorkspaceSelectModal, type WorkspaceWithToken } from "@/modules/workspace/components/workspace-select-modal";
import { CreateWorkspaceDialog } from "@/modules/workspace/components/create-workspace-dialog";
import { InitializeMemberDialog } from "@/modules/workspace/components/initialize-member-dialog";
import {
  UPDATE_WORKSPACE_MEMBER_MUTATION,
  WORKSPACE_MEMBERS_QUERY,
} from "@/modules/workspace/graphql/operations/workspace-member";

const ACCESS_TOKEN_COOKIE_KEY = "gc_console_access_token";
const AUTH_COOKIE_KEY = "gc_console_auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

interface MeQueryResponse {
  me: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
}

interface WorkspaceMembersQueryResponse {
  workspace: {
    members: {
      id: string;
      userId: string | null;
      email: string;
      name?: string | null;
    }[];
  } | null;
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const inviteCode = getInviteCode(searchParams);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showWorkspaceSelect, setShowWorkspaceSelect] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceWithToken[]>([]);
  const [showCreateWorkspaceDialog, setShowCreateWorkspaceDialog] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [createWorkspaceError, setCreateWorkspaceError] = useState("");
  const [showInitializeMemberDialog, setShowInitializeMemberDialog] = useState(false);
  const [isInitializingMember, setIsInitializingMember] = useState(false);
  const [initializeMemberError, setInitializeMemberError] = useState("");
  const [currentWorkspaceMemberId, setCurrentWorkspaceMemberId] = useState<string | null>(null);
  const [initialMemberName, setInitialMemberName] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredUsername, setRegisteredUsername] = useState("");

  async function handleWorkspaceSelect(workspace: WorkspaceWithToken) {
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
      await openInitializeMemberDialog();
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

  async function openInitializeMemberDialog() {
    setInitializeMemberError("");

    try {
      const [{ data: meData }, { data: workspaceData }] = await Promise.all([
        apolloClient.query<MeQueryResponse>({
          query: ME_QUERY,
          fetchPolicy: "network-only",
        }),
        apolloClient.query<WorkspaceMembersQueryResponse>({
          query: WORKSPACE_MEMBERS_QUERY,
          fetchPolicy: "network-only",
        }),
      ]);

      const me = meData?.me;
      const members = workspaceData?.workspace?.members || [];
      const currentMember =
        (me?.id ? members.find((member) => member.userId === me.id) : undefined) || members[0];

      if (!currentMember?.id) {
        throw new Error("Current workspace member not found");
      }

      setCurrentWorkspaceMemberId(currentMember.id);
      setInitialMemberName(
        resolveDefaultMemberName({
          memberName: currentMember.name,
          username: me?.username ?? registeredUsername,
          email: currentMember.email || me?.email || registeredEmail,
        }),
      );
      setShowInitializeMemberDialog(true);
    } catch (error) {
      if (error instanceof Error) {
        setInitializeMemberError(error.message);
      } else {
        setInitializeMemberError("Initialize member failed");
      }

      const nextPath = resolveSafeNextPath(searchParams.get("next"));
      router.replace(nextPath);
    }
  }

  async function handleInitializeMember(name: string) {
    if (!currentWorkspaceMemberId) {
      setInitializeMemberError("Current workspace member not found");
      return;
    }

    setInitializeMemberError("");
    setIsInitializingMember(true);

    try {
      await apolloClient.mutate({
        mutation: UPDATE_WORKSPACE_MEMBER_MUTATION,
        variables: {
          input: {
            workspaceMemberId: currentWorkspaceMemberId,
            name,
          },
        },
      });

      setShowInitializeMemberDialog(false);
      const nextPath = resolveSafeNextPath(searchParams.get("next"));
      router.replace(nextPath);
    } catch (error) {
      if (error instanceof Error) {
        setInitializeMemberError(error.message);
      } else {
        setInitializeMemberError("Initialize member failed");
      }
    } finally {
      setIsInitializingMember(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/console/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          ...(inviteCode ? { inviteCode } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Register failed");
      }

      setRegisteredEmail(data.user?.email || email);
      setRegisteredUsername(data.user?.username || "");

      if (inviteCode) {
        router.replace("/console/dashboard");
        return;
      }

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
        setErrorMessage("Register failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-center py-4 lg:h-screen">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Register with email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            {errorMessage ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link
              href={resolveLoginPath(nextParam, inviteCode)}
              className="underline">
              Login
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

      <InitializeMemberDialog
        open={showInitializeMemberDialog}
        initialName={initialMemberName}
        isSubmitting={isInitializingMember}
        errorMessage={initializeMemberError}
        onSubmit={handleInitializeMember}
      />
    </div>
  );
}

function getInviteCode(searchParams: { get: (key: string) => string | null }): string | null {
  const inviteParam = searchParams.get("invite")?.trim();
  if (inviteParam) {
    return inviteParam;
  }

  const nextParam = searchParams.get("next");
  if (!nextParam || !nextParam.startsWith("/console/invite/")) {
    return null;
  }

  const pathSegments = nextParam.split("?")[0].split("/").filter(Boolean);
  if (pathSegments.length < 2) {
    return null;
  }

  return pathSegments[1] || null;
}

function resolveLoginPath(nextParam: string | null, inviteCode: string | null): string {
  if (inviteCode) {
    return `/console/login?next=${encodeURIComponent(`/console/invite/${inviteCode}`)}`;
  }
  if (nextParam) {
    return `/console/login?next=${encodeURIComponent(nextParam)}`;
  }
  return "/console/login";
}

function resolveDefaultMemberName(params: {
  memberName?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const memberName = params.memberName?.trim();
  if (memberName) {
    return memberName;
  }

  const username = params.username?.trim();
  if (username) {
    return username;
  }

  const email = params.email?.trim();
  if (!email) {
    return "";
  }

  const [localPart] = email.split("@");
  return localPart || "";
}
