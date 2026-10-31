"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquareHeartIcon } from "lucide-react";
import { Button } from "@/shadcn-ui-kit/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shadcn-ui-kit/ui/breadcrumb";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import WhatsAppAccountsTable from "@/modules/im/components/whatsapp/whatsapp-accounts-table";
import WhatsAppConversationsTable from "@/modules/im/components/whatsapp/whatsapp-conversations-table";
import WhatsAppMessagesTable from "@/modules/im/components/whatsapp/whatsapp-messages-table";
import { WORKSPACE_MEMBERS_QUERY } from "@/modules/im/graphql/operations/im-whatsapp";
import {
  WorkspaceMember,
  WorkspaceMembersData,
} from "@/modules/im/types/whatsapp";

function buildUrl(params: URLSearchParams): string {
  const query = params.toString();
  if (!query) return "/console/im/whatsapp";
  return `/console/im/whatsapp?${query}`;
}

export default function WhatsAppBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get("accountId");
  const conversationId = searchParams.get("conversationId");

  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchMembers(): Promise<void> {
      try {
        const { data } = await apolloClient.query<WorkspaceMembersData>({
          query: WORKSPACE_MEMBERS_QUERY,
          fetchPolicy: "network-only",
        });
        if (!isMounted) return;
        setMembers(data?.workspace?.members || []);
      } finally {
        if (!isMounted) return;
        setIsLoadingMembers(false);
      }
    }

    void fetchMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleViewConversations(nextAccountId: string): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("accountId", nextAccountId);
    params.delete("conversationId");
    router.push(buildUrl(params));
  }

  function handleViewMessages(nextConversationId: string): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("conversationId", nextConversationId);
    router.push(buildUrl(params));
  }

  function handleBackToAccounts(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("accountId");
    params.delete("conversationId");
    router.push(buildUrl(params));
  }

  function handleBackToConversations(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("conversationId");
    router.push(buildUrl(params));
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/console/im/whatsapp">Whatsapp</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {!accountId ? (
              <BreadcrumbPage>Accounts</BreadcrumbPage>
            ) : (
              <BreadcrumbLink
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  handleBackToAccounts();
                }}
              >
                Accounts
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {accountId ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {!conversationId ? (
                  <BreadcrumbPage>Conversations</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      handleBackToConversations();
                    }}
                  >
                    Conversations
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </>
          ) : null}
          {conversationId ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Messages</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <MessageSquareHeartIcon className="h-6 w-6" />
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Whatsapp</h2>
          <p className="text-muted-foreground">
            Manage whatsapp accounts and drill down into conversations/messages.
          </p>
        </div>
      </div>

      {isLoadingMembers ? <div>Loading workspace members...</div> : null}

      {!accountId ? (
        <WhatsAppAccountsTable
          members={members}
          onViewConversations={handleViewConversations}
        />
      ) : null}

      {accountId && !conversationId ? (
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={handleBackToAccounts}>
            ← Back to Accounts
          </Button>
          <WhatsAppConversationsTable
            accountId={accountId}
            members={members}
            onViewMessages={handleViewMessages}
          />
        </div>
      ) : null}

      {accountId && conversationId ? (
        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToConversations}
          >
            ← Back to Conversations
          </Button>
          <WhatsAppMessagesTable
            accountId={accountId}
            conversationId={conversationId}
          />
        </div>
      ) : null}
    </div>
  );
}
