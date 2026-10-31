"use client";

import { useParams } from "next/navigation";
import { InvitePage } from "@/modules/workspace/components/invite-page";

export default function InviteCodePage() {
  const params = useParams();
  const code = params.code as string;
  return <InvitePage code={code} />;
}
