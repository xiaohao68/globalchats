"use client";

import * as React from "react";
import { Button } from "@/shadcn-ui-kit/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn-ui-kit/ui/select";
import { WorkspaceMember } from "@/modules/im/types/whatsapp";

const UNASSIGNED_VALUE = "__UNASSIGNED__";

function getSelectValue(memberId: string | null | undefined): string {
  return memberId?.trim() ? memberId : UNASSIGNED_VALUE;
}

function getMemberLabel(member: WorkspaceMember): string {
  if (member.name?.trim()) return `${member.name} (${member.email})`;
  return member.email;
}

interface AssignMemberEditorProps {
  memberId: string | null | undefined;
  members: WorkspaceMember[];
  onSave: (nextMemberId: string | null) => Promise<void>;
}

export default function AssignMemberEditor({
  memberId,
  members,
  onSave,
}: AssignMemberEditorProps) {
  const [selectedValue, setSelectedValue] = React.useState<string>(
    getSelectValue(memberId),
  );
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setSelectedValue(getSelectValue(memberId));
  }, [memberId]);

  const currentValue = getSelectValue(memberId);
  const hasChanged = selectedValue !== currentValue;

  async function handleSave(): Promise<void> {
    if (!hasChanged) return;
    setIsSaving(true);
    try {
      await onSave(selectedValue === UNASSIGNED_VALUE ? null : selectedValue);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedValue}
        onValueChange={setSelectedValue}
        disabled={isSaving}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select member" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {getMemberLabel(member)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void handleSave()}
        disabled={!hasChanged || isSaving}
      >
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
