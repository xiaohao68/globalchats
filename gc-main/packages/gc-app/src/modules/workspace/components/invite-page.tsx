"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { getAccessToken } from "@/modules/auth/utils/auth-storage";
import {
  ACCEPT_WORKSPACE_INVITE_MUTATION,
  WORKSPACE_INVITE_PREVIEW_QUERY,
} from "@/modules/workspace/graphql/operations/workspace-member";

interface InvitePageProps {
  code: string;
}

type PreviewStatus = "ACTIVE" | "DISABLED" | "INVALID";

interface WorkspaceInvitePreviewResponse {
  workspaceInvite: {
    status: PreviewStatus;
    workspaceDisplayName: string | null;
    path: string;
  };
}

interface AcceptWorkspaceInviteResponse {
  acceptWorkspaceInvite: {
    workspaceId: string;
    workspaceDisplayName: string | null;
    joined: boolean;
    role: "OWNER" | "ADMIN" | "MEMBER";
  };
}

export function InvitePage({ code }: InvitePageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorkspaceInvitePreviewResponse["workspaceInvite"] | null>(
    null,
  );
  const [acceptResult, setAcceptResult] =
    useState<AcceptWorkspaceInviteResponse["acceptWorkspaceInvite"] | null>(null);

  const nextPath = useMemo(() => `/console/invite/${code}`, [code]);
  const isLoggedIn = !!getAccessToken();

  useEffect(() => {
    let isMounted = true;

    async function fetchPreview() {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await apolloClient.query<WorkspaceInvitePreviewResponse>({
          query: WORKSPACE_INVITE_PREVIEW_QUERY,
          variables: { code },
          fetchPolicy: "network-only",
        });
        if (!isMounted) {
          return;
        }
        setPreview(data?.workspaceInvite || null);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load invite");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [code]);

  const acceptInvite = async () => {
    setError(null);
    setIsAccepting(true);
    try {
      const { data } = await apolloClient.mutate<AcceptWorkspaceInviteResponse>({
        mutation: ACCEPT_WORKSPACE_INVITE_MUTATION,
        variables: { code },
      });
      setAcceptResult(data?.acceptWorkspaceInvite || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsAccepting(false);
    }
  };

  const goToDashboard = () => {
    router.replace("/console/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Workspace Invitation</CardTitle>
          <CardDescription>
            {preview?.workspaceDisplayName
              ? `You are invited to join ${preview.workspaceDisplayName}.`
              : "Use invite link to join workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading invite...</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!isLoading && preview?.status === "INVALID" ? (
            <p className="text-sm">This invite link is invalid.</p>
          ) : null}

          {!isLoading && preview?.status === "DISABLED" ? (
            <p className="text-sm">This invite link is disabled.</p>
          ) : null}

          {!isLoading && preview?.status === "ACTIVE" && !acceptResult && !isLoggedIn ? (
            <div className="space-y-2">
              <p className="text-sm">Please login or register first to accept this invitation.</p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/console/login?next=${encodeURIComponent(nextPath)}`}>Login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/console/register?invite=${encodeURIComponent(code)}`}>Register</Link>
                </Button>
              </div>
            </div>
          ) : null}

          {!isLoading && preview?.status === "ACTIVE" && !acceptResult && isLoggedIn ? (
            <div className="space-y-2">
              <p className="text-sm">Accept this invitation to join as a member.</p>
              <Button onClick={acceptInvite} disabled={isAccepting}>
                {isAccepting ? "Accepting..." : "Accept Invitation"}
              </Button>
            </div>
          ) : null}

          {acceptResult ? (
            <div className="space-y-2">
              <p className="text-sm">
                {acceptResult.joined
                  ? "Invitation accepted. You joined this workspace."
                  : "You are already a member of this workspace."}
              </p>
              <Button onClick={goToDashboard}>Go to Dashboard</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
