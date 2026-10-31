"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Bell, ChevronRightIcon, CreditCard, LogOut, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/shadcn-ui-kit/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/shadcn-ui-kit/ui/dropdown-menu";
import Link from "next/link";
import { Progress } from "@/shadcn-ui-kit/ui/progress";
import { clearAuthState } from "@/modules/auth/utils/auth-storage";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth";
import { WORKSPACE_MEMBERS_QUERY } from "@/modules/workspace/graphql/operations/workspace-member";

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

export default function UserMenu() {
  const router = useRouter();
  const [memberName, setMemberName] = useState("Member");
  const [memberEmail, setMemberEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadMemberProfile() {
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
        const resolvedName =
          currentMember?.name?.trim() ||
          me?.username?.trim() ||
          resolveNameFromEmail(currentMember?.email || me?.email || "") ||
          "Member";
        const resolvedEmail = currentMember?.email?.trim() || me?.email?.trim() || "";

        if (!mounted) {
          return;
        }

        setMemberName(resolvedName);
        setMemberEmail(resolvedEmail);
      } catch (error) {
        console.error("Failed to fetch member profile:", error);
      }
    }

    loadMemberProfile();

    return () => {
      mounted = false;
    };
  }, []);

  function handleLogout() {
    clearAuthState();
    router.replace("/console/login");
  }

  const avatarFallback = getAvatarFallback(memberName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar>
          <AvatarImage src={`/images/avatars/01.png`} alt={memberName} />
          <AvatarFallback className="rounded-lg">{avatarFallback}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-60" align="end">
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar>
              <AvatarImage src={`/images/avatars/01.png`} alt={memberName} />
              <AvatarFallback className="rounded-lg">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{memberName}</span>
              <span className="text-muted-foreground truncate text-xs">{memberEmail}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="https://shadcnuikit.com/pricing" target="_blank">
              <Sparkles /> Upgrade to Pro
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <BadgeCheck />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
        <div className="bg-muted mt-1.5 rounded-md border">
          <div className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Credits</h4>
              <div className="text-muted-foreground flex cursor-pointer items-center text-sm">
                <span>5 left</span>
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </div>
            </div>
            <Progress value={40} indicatorColor="bg-primary" />
            <div className="text-muted-foreground flex items-center text-sm">
              Daily credits used first
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function resolveNameFromEmail(email: string): string {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) {
    return "";
  }

  const [localPart] = normalizedEmail.split("@");
  return localPart || "";
}

function getAvatarFallback(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "MB";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
