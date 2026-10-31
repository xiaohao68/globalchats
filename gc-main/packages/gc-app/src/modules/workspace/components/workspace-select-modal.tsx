"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shadcn-ui-kit/ui/dialog";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { cn } from "@/modules/shared/utils/cn";
import { Building2 } from "lucide-react";

export interface WorkspaceWithToken {
  id: string;
  displayName?: string | null;
  logo?: string | null;
  role?: string | null;
  accessToken: string;
}

interface WorkspaceSelectModalProps {
  open: boolean;
  workspaces: WorkspaceWithToken[];
  onSelect: (workspace: WorkspaceWithToken) => void;
}

export function WorkspaceSelectModal({
  open,
  workspaces,
  onSelect,
}: WorkspaceSelectModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = () => {
    const workspace = workspaces.find((ws) => ws.id === selectedId);
    if (workspace) {
      onSelect(workspace);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]" showCloseIcon={false}>
        <DialogHeader>
          <DialogTitle className="text-center">选择工作区</DialogTitle>
          <DialogDescription className="text-center">
            您有多个工作区，请选择一个继续
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setSelectedId(workspace.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:bg-accent",
                selectedId === workspace.id
                  ? "border-primary bg-accent ring-2 ring-primary"
                  : "border-border"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                {workspace.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={workspace.logo}
                    alt={workspace.displayName || "Workspace"}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {workspace.displayName || "未命名工作区"}
                </div>
                <div className="text-sm text-muted-foreground capitalize">
                  {workspace.role?.toLowerCase() || "成员"}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSelect}
            disabled={!selectedId}
            className="w-full"
          >
            进入工作区
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
