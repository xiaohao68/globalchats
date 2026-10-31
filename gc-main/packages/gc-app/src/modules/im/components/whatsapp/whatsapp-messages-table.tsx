"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/shadcn-ui-kit/ui/badge";
import { Button } from "@/shadcn-ui-kit/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shadcn-ui-kit/ui/table";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { IM_WHATSAPP_MESSAGES_QUERY } from "@/modules/im/graphql/operations/im-whatsapp";
import {
  ConnectionPageInfo,
  ConnectionPaginationInput,
  DEFAULT_PAGE_SIZE,
  WhatsAppMessageEdge,
  WhatsAppMessagesData,
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

interface WhatsAppMessagesTableProps {
  accountId: string;
  conversationId: string;
}

export default function WhatsAppMessagesTable({
  accountId,
  conversationId,
}: WhatsAppMessagesTableProps) {
  const [messages, setMessages] = React.useState<WhatsAppMessageEdge[]>([]);
  const [pageInfo, setPageInfo] = React.useState<ConnectionPageInfo>(
    EMPTY_PAGE_INFO,
  );
  const [totalCount, setTotalCount] = React.useState(0);
  const [pagination, setPagination] = React.useState<ConnectionPaginationInput>(
    createInitialPagination(),
  );
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setPagination(createInitialPagination(DEFAULT_PAGE_SIZE));
  }, [accountId, conversationId]);

  React.useEffect(() => {
    let isMounted = true;

    async function fetchMessages(): Promise<void> {
      setIsLoading(true);
      try {
        const { data } = await apolloClient.query<WhatsAppMessagesData>({
          query: IM_WHATSAPP_MESSAGES_QUERY,
          variables: {
            input: {
              ...pagination,
              accountId,
              conversationId,
            },
          },
          fetchPolicy: "network-only",
        });
        if (!isMounted) return;

        setMessages(data?.im?.whatsapp?.messages?.edges || []);
        setPageInfo(data?.im?.whatsapp?.messages?.pageInfo || EMPTY_PAGE_INFO);
        setTotalCount(data?.im?.whatsapp?.messages?.totalCount || 0);
      } catch (error) {
        if (!isMounted) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch messages",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    void fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [accountId, conversationId, pagination]);

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
      <div className="text-sm text-muted-foreground">Total: {totalCount}</div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Message ID</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Remote JID</TableHead>
              <TableHead>Participant</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : messages.length ? (
              messages.map((message) => (
                <TableRow key={message.nodeId}>
                  <TableCell className="font-mono text-xs">
                    {message.messageId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={message.fromMe ? "default" : "secondary"}>
                      {message.fromMe ? "Sent" : "Received"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {message.remoteJid}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {message.participant || "-"}
                  </TableCell>
                  <TableCell>{formatDate(message.createdAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
