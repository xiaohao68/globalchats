"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shadcn-ui-kit/ui/dialog";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { Input } from "@/shadcn-ui-kit/ui/input";
import { Label } from "@/shadcn-ui-kit/ui/label";

interface CreateWorkspaceDialogProps {
  open: boolean;
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (displayName: string) => void;
}

const WORKSPACE_NAME_MAX_LENGTH = 50;

export function CreateWorkspaceDialog({
  open,
  isSubmitting,
  errorMessage,
  onSubmit,
}: CreateWorkspaceDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setDisplayName("");
      setValidationMessage("");
    }
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedDisplayName = displayName.trim();

    if (!normalizedDisplayName) {
      setValidationMessage("Workspace name is required");
      return;
    }

    if (normalizedDisplayName.length > WORKSPACE_NAME_MAX_LENGTH) {
      setValidationMessage("Workspace name must be at most 50 characters");
      return;
    }

    setValidationMessage("");
    onSubmit(normalizedDisplayName);
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[440px]" showCloseIcon={false}>
        <DialogHeader>
          <DialogTitle>Create your workspace</DialogTitle>
          <DialogDescription>
            You need a workspace before continuing.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              type="text"
              value={displayName}
              maxLength={WORKSPACE_NAME_MAX_LENGTH}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={isSubmitting}
              placeholder="My Workspace"
              required
            />
          </div>

          {validationMessage ? (
            <p className="text-sm text-destructive">{validationMessage}</p>
          ) : null}

          {!validationMessage && errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create workspace"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
