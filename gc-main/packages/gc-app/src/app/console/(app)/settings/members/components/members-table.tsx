"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Columns, MoreHorizontal } from "lucide-react";
import { Button } from "@/shadcn-ui-kit/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shadcn-ui-kit/ui/dropdown-menu";
import { Input } from "@/shadcn-ui-kit/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shadcn-ui-kit/ui/table";
import { Avatar, AvatarFallback } from "@/shadcn-ui-kit/ui/avatar";
import { Badge } from "@/shadcn-ui-kit/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shadcn-ui-kit/ui/dialog";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { ME_QUERY } from "@/modules/auth/graphql/operations/auth";
import {
  DELETE_WORKSPACE_MEMBER_MUTATION,
  WORKSPACE_MEMBERS_QUERY,
} from "@/modules/workspace/graphql/operations/workspace-member";
import ChangeRoleDialog from "./change-role-dialog";
import InviteLinkPanel, { InviteLinkData } from "./invite-link-panel";

export type Member = {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACCEPTED";
  invitedAt: string;
  joinedAt: string | null;
  declinedAt: string | null;
};

interface WorkspaceMembersQueryData {
  workspace: {
    members: Member[];
    inviteLink: InviteLinkData | null;
  };
}

interface MeQueryData {
  me: {
    currentWorkspace?: {
      role: "OWNER" | "ADMIN" | "MEMBER";
    } | null;
  };
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ");
    return parts.map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "OWNER" || role === "ADMIN") {
    return "default";
  }
  if (role === "MEMBER") {
    return "secondary";
  }
  return "outline";
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return "-";
  }
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface ColumnsProps {
  onChangeRole: (member: Member) => void;
  onRemoveMember: (member: Member) => void;
}

function getColumns({
  onChangeRole,
  onRemoveMember,
}: ColumnsProps): ColumnDef<Member>[] {
  return [
    {
      accessorKey: "name",
      header: "Member",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {getInitials(row.original.name, row.original.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name || row.original.email}</span>
            {!row.original.name ? (
              <span className="text-xs text-muted-foreground">{row.original.email}</span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant={getRoleBadgeVariant(row.original.role)}>{row.original.role}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant="success">{row.original.status}</Badge>,
    },
    {
      accessorKey: "invitedAt",
      header: "Joined At",
      cell: ({ row }) => formatDate(row.original.invitedAt),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onChangeRole(member)}>
                Change Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onRemoveMember(member)}>
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export default function MembersTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = React.useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [inviteLink, setInviteLink] = React.useState<InviteLinkData | null>(null);
  const [workspaceRole, setWorkspaceRole] = React.useState<"OWNER" | "ADMIN" | "MEMBER" | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refreshMembers = React.useCallback(async () => {
    try {
      const [{ data: membersData }, { data: meData }] = await Promise.all([
        apolloClient.query<WorkspaceMembersQueryData>({
          query: WORKSPACE_MEMBERS_QUERY,
          fetchPolicy: "network-only",
        }),
        apolloClient.query<MeQueryData>({
          query: ME_QUERY,
          fetchPolicy: "network-only",
        }),
      ]);

      setMembers(membersData?.workspace?.members || []);
      setInviteLink(membersData?.workspace?.inviteLink || null);
      setWorkspaceRole(meData?.me?.currentWorkspace?.role || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    }
  }, []);

  React.useEffect(() => {
    refreshMembers().finally(() => setLoading(false));
  }, [refreshMembers]);

  const handleDelete = async (memberId: string) => {
    try {
      await apolloClient.mutate({
        mutation: DELETE_WORKSPACE_MEMBER_MUTATION,
        variables: { workspaceMemberId: memberId },
      });
      await refreshMembers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete member");
    }
  };

  const handleChangeRole = (member: Member) => {
    setSelectedMember(member);
    setChangeRoleDialogOpen(true);
  };

  const handleRemoveMember = (member: Member) => {
    setSelectedMember(member);
    setRemoveMemberDialogOpen(true);
  };

  const tableColumns = React.useMemo(
    () =>
      getColumns({
        onChangeRole: handleChangeRole,
        onRemoveMember: handleRemoveMember,
      }),
    [],
  );

  const table = useReactTable({
    data: members,
    columns: tableColumns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  if (error) {
    return <div className="py-8 text-center text-destructive">Failed to load members: {error}</div>;
  }

  const canManageInviteLink = workspaceRole === "OWNER" || workspaceRole === "ADMIN";

  return (
    <div className="w-full space-y-4">
      {canManageInviteLink ? (
        <InviteLinkPanel inviteLink={inviteLink} onChanged={refreshMembers} />
      ) : null}

      <div className="flex items-center gap-4 py-4">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Search members..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Columns className="mr-2 h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(value)}>
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>

      <ChangeRoleDialog
        open={changeRoleDialogOpen}
        onOpenChange={setChangeRoleDialogOpen}
        member={selectedMember}
        onSuccess={refreshMembers}
      />

      <Dialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.name || selectedMember?.email} from
              this workspace? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedMember) {
                  void handleDelete(selectedMember.id);
                  setRemoveMemberDialogOpen(false);
                }
              }}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
