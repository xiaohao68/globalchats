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
  IM_WHATSAPP_ACCOUNTS_QUERY,
  IM_WHATSAPP_UPDATE_ACCOUNT_MUTATION,
} from "@/modules/im/graphql/operations/im-whatsapp";
import {
  ConnectionPageInfo,
  ConnectionPaginationInput,
  DEFAULT_PAGE_SIZE,
  WhatsAppAccountEdge,
  WhatsAppAccountsData,
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

interface WhatsAppAccountsTableProps {
  members: WorkspaceMember[];
  onViewConversations: (accountId: string) => void;
}

export default function WhatsAppAccountsTable({
  members,
  onViewConversations,
}: WhatsAppAccountsTableProps) {
  const [accounts, setAccounts] = React.useState<WhatsAppAccountEdge[]>([]);
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

    async function fetchAccounts(): Promise<void> {
      setIsLoading(true);
      try {
        const { data } = await apolloClient.query<WhatsAppAccountsData>({
          query: IM_WHATSAPP_ACCOUNTS_QUERY,
          variables: {
            input: {
              ...pagination,
              search: search || undefined,
            },
          },
          fetchPolicy: "network-only",
        });
        if (!isMounted) return;

        setAccounts(data?.im?.whatsapp?.accounts?.edges || []);
        setPageInfo(data?.im?.whatsapp?.accounts?.pageInfo || EMPTY_PAGE_INFO);
        setTotalCount(data?.im?.whatsapp?.accounts?.totalCount || 0);
      } catch (error) {
        if (!isMounted) return;
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch accounts",
        );
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    void fetchAccounts();

    return () => {
      isMounted = false;
    };
  }, [pagination, search, refreshKey]);

  async function handleUpdateAssign(
    accountId: string,
    nextMemberId: string | null,
  ): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: IM_WHATSAPP_UPDATE_ACCOUNT_MUTATION,
        variables: {
          input: {
            accountId,
            assignWorkspaceMemberId: nextMemberId,
          },
        },
      });
      toast.success("Account assignment updated");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account",
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
          placeholder="Search by LID or JID"
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
              <TableHead>LID</TableHead>
              <TableHead>JID</TableHead>
              <TableHead>Assigned Member</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : accounts.length ? (
              accounts.map((account) => (
                <TableRow key={account.nodeId}>
                  <TableCell className="font-mono text-xs">{account.lid}</TableCell>
                  <TableCell className="font-mono text-xs">{account.jid}</TableCell>
                  <TableCell>
                    <AssignMemberEditor
                      memberId={account.assignWorkspaceMemberId}
                      members={members}
                      onSave={(nextMemberId) =>
                        handleUpdateAssign(account.nodeId, nextMemberId)
                      }
                    />
                  </TableCell>
                  <TableCell>{formatDate(account.updatedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewConversations(account.nodeId)}
                    >
                      View
                    </Button>
                  </TableCell>
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
