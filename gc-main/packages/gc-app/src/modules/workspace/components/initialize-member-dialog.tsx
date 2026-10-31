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

interface InitializeMemberDialogProps {
  open: boolean;
  initialName: string;
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (name: string) => void;
}

export function InitializeMemberDialog({
  open,
  initialName,
  isSubmitting,
  errorMessage,
  onSubmit,
}: InitializeMemberDialogProps) {
  const [name, setName] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setValidationMessage("");
      return;
    }

    setName(initialName);
    setValidationMessage("");
  }, [initialName, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();

    if (!normalizedName) {
      setValidationMessage("Name is required");
      return;
    }

    setValidationMessage("");
    onSubmit(normalizedName);
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[440px]" showCloseIcon={false}>
        <DialogHeader>
          <DialogTitle>Set up your member profile</DialogTitle>
          <DialogDescription>
            This name will be shown to other members in your workspace.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="member-name">Name</Label>
            <Input
              id="member-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              placeholder="Your name"
              required
            />
            <p className="text-muted-foreground text-xs">
              This is your public display name inside this workspace.
            </p>
          </div>

          {validationMessage ? (
            <p className="text-sm text-destructive">{validationMessage}</p>
          ) : null}

          {!validationMessage && errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
