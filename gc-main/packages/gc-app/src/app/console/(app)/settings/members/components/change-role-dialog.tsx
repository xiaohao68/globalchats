"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/shadcn-ui-kit/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shadcn-ui-kit/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn-ui-kit/ui/select";
import { UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION } from "@/modules/workspace/graphql/operations/workspace-member";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import type { Member } from "./members-table";

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onSuccess?: () => void;
}

export default function ChangeRoleDialog({
  open,
  onOpenChange,
  member,
  onSuccess,
}: ChangeRoleDialogProps) {
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当打开对话框时，同步当前成员的角色
  useEffect(() => {
    if (member) {
      setRole(member.role === "OWNER" ? "ADMIN" : member.role);
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    setError(null);
    setLoading(true);
    try {
      await apolloClient.mutate({
        mutation: UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION,
        variables: {
          input: {
            workspaceMemberId: member.id,
            role,
          },
        },
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update role";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError(null);
    }
    onOpenChange(isOpen);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Change the role for {member.name || member.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
              <Select
                value={role}
                onValueChange={(value: "ADMIN" | "MEMBER") => setRole(value)}
                disabled={loading || member.role === "OWNER"}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              {member.role === "OWNER" && (
                <p className="text-xs text-muted-foreground">
                  Owner role cannot be changed
                </p>
              )}
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || member.role === "OWNER" || member.role === role}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
