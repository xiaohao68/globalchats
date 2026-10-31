"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card";
import { Input } from "@/shadcn-ui-kit/ui/input";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import {
  REGENERATE_WORKSPACE_INVITE_LINK_MUTATION,
  SET_WORKSPACE_INVITE_LINK_ENABLED_MUTATION,
} from "@/modules/workspace/graphql/operations/workspace-member";

export interface InviteLinkData {
  code: string;
  path: string;
  enabled: boolean;
}

interface InviteLinkPanelProps {
  inviteLink: InviteLinkData | null;
  onChanged: () => Promise<void>;
}

export default function InviteLinkPanel({
  inviteLink,
  onChanged,
}: InviteLinkPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteUrl = useMemo(() => {
    if (!inviteLink) {
      return "";
    }
    if (typeof window === "undefined") {
      return inviteLink.path;
    }
    return `${window.location.origin}${inviteLink.path}`;
  }, [inviteLink]);

  const toggleInviteLink = async () => {
    if (!inviteLink) {
      return;
    }
    setError(null);
    setIsUpdating(true);
    try {
      await apolloClient.mutate({
        mutation: SET_WORKSPACE_INVITE_LINK_ENABLED_MUTATION,
        variables: {
          enabled: !inviteLink.enabled,
        },
      });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update invite link");
    } finally {
      setIsUpdating(false);
    }
  };

  const regenerateInviteLink = async () => {
    setError(null);
    setIsUpdating(true);
    try {
      await apolloClient.mutate({
        mutation: REGENERATE_WORKSPACE_INVITE_LINK_MUTATION,
      });
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate invite link");
    } finally {
      setIsUpdating(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteUrl) {
      return;
    }
    setError(null);
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      setError("Failed to copy invite link");
    }
  };

  if (!inviteLink) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Link</CardTitle>
        <CardDescription>
          Share this link to invite users to your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input readOnly value={inviteUrl} disabled={!inviteLink.enabled} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyInviteLink} disabled={isUpdating || !inviteLink.enabled}>
            Copy Link
          </Button>
          <Button variant="outline" onClick={regenerateInviteLink} disabled={isUpdating || !inviteLink.enabled}>
            Regenerate
          </Button>
          <Button onClick={toggleInviteLink} disabled={isUpdating}>
            {inviteLink.enabled ? "Disable" : "Enable"}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
