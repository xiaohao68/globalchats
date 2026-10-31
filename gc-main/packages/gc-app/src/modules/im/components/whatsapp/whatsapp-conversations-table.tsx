"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/shadcn-ui-kit/ui/button";
import { Input } from "@/shadcn-ui-kit/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shadcn-ui-kit/ui/table";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import AssignMemberEditor from "@/modules/im/components/whatsapp/assign-member-editor";
import {
  IM_WHATSAPP_CONVERSATIONS_QUERY,
  IM_WHATSAPP_UPDATE_CONVERSATION_MUTATION,
} from "@/modules/im/graphql/operations/im-whatsapp";
import {
  ConnectionPageInfo,
  ConnectionPaginationInput,
  DEFAULT_PAGE_SIZE,
  WhatsAppConversationEdge,
  WhatsAppConversationsData,
  WorkspaceMember,
} from "@/modules/im/types/whatsapp";
import {
  createInitialPagination,
  createNextPagination,
  createPreviousPagination,
} from "@/modules/im/utils/connection-pagination";

const EMPTY_PAGE_INFO: ConnectionPageInfo = {
  hasPreviousPage: false,
  hasNextPage: false,
  startCursor: null,
  endCursor: null,
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface WhatsAppConversationsTableProps {
  accountId: string;
  members: WorkspaceMember[];
  onViewMessages: (conversationId: string) => void;
}

export default function WhatsAppConversationsTable({
  accountId,
  members,
  onViewMessages,
}: WhatsAppConversationsTableProps) {
  const [conversations, setConversations] = React.useState<
    WhatsAppConversationEdge[]
  >([]);
  const [pageInfo, setPageInfo] = React.useState<ConnectionPageInfo>(
    EMPTY_PAGE_INFO,
  );
  const [totalCount, setTotalCount] = React.useState(0);
  const [pagination, setPagination] = React.useState<ConnectionPaginationInput>(
    createInitialPagination(),
  );
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setPagination(createInitialPagination(DEFAULT_PAGE_SIZE));
  }, [accountId]);

  React.useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [searchInput]);

  React.useEffect(() => {
    setPagination(createInitialPagination(DEFAULT_PAGE_SIZE));
  }, [search]);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchConversations(): Promise<void> {
      setIsLoading(true);
      try {
        const { data } = await apolloClient.query<WhatsAppConversationsData>({
          query: IM_WHATSAPP_CONVERSATIONS_QUERY,
          variables: {
            input: {
              ...pagination,
              accountId,
              search: search || undefined,
            },
          },
          fetchPolicy: "network-only",
        });
        if (!isMounted) return;

        setConversations(data?.im?.whatsapp?.conversations?.edges || []);
        setPageInfo(
          data?.im?.whatsapp?.conversations?.pageInfo || EMPTY_PAGE_INFO,
        );
        setTotalCount(data?.im?.whatsapp?.conversations?.totalCount || 0);
      } catch (error) {
        if (!isMounted) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to fetch conversations",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    void fetchConversations();

    return () => {
      isMounted = false;
    };
  }, [accountId, pagination, search, refreshKey]);

  async function handleUpdateAssign(
    conversationId: string,
    nextMemberId: string | null,
  ): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: IM_WHATSAPP_UPDATE_CONVERSATION_MUTATION,
        variables: {
          input: {
            conversationId,
            assignWorkspaceMemberId: nextMemberId,
          },
        },
      });
      toast.success("Conversation assignment updated");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update conversation",
      );
    }
  }

  function handlePreviousPage(): void {
    if (!pageInfo.hasPreviousPage) return;
    setPagination(createPreviousPagination(pageInfo, DEFAULT_PAGE_SIZE));
  }

  function handleNextPage(): void {
    if (!pageInfo.hasNextPage) return;
    setPagination(createNextPagination(pageInfo, DEFAULT_PAGE_SIZE));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by conversation JID"
          className="max-w-md"
        />
        <div className="text-sm text-muted-foreground">
          Total: {totalCount}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>JID</TableHead>
              <TableHead>Assigned Member</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : conversations.length ? (
              conversations.map((conversation) => (
                <TableRow key={conversation.nodeId}>
                  <TableCell className="font-mono text-xs">
                    {conversation.jid}
                  </TableCell>
                  <TableCell>
                    <AssignMemberEditor
                      memberId={conversation.assignWorkspaceMemberId}
                      members={members}
                      onSave={(nextMemberId) =>
                        handleUpdateAssign(conversation.nodeId, nextMemberId)
                      }
                    />
                  </TableCell>
                  <TableCell>{formatDate(conversation.updatedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewMessages(conversation.nodeId)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePreviousPage}
          disabled={isLoading || !pageInfo.hasPreviousPage}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleNextPage}
          disabled={isLoading || !pageInfo.hasNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
