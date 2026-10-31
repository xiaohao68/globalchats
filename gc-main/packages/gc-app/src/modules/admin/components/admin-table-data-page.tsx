"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { apolloClient } from "@/modules/auth/utils/apollo-client"
import { ADMIN_TABLE_ROWS_QUERY } from "@/modules/admin/graphql/operations/admin"
import type { AdminTableRowsQueryResponse } from "@/modules/admin/types/admin-graphql"
import { formatTableName } from "@/modules/admin/utils/format-table-name"
import { Button } from "@/shadcn-ui-kit/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shadcn-ui-kit/ui/table"
import { Spinner } from "@/shadcn-ui-kit/ui/spinner"

interface AdminTableDataPageProps {
  tableName: string
}

function decodeTableName(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function AdminTableDataPage({ tableName }: AdminTableDataPageProps) {
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [tableData, setTableData] = useState<AdminTableRowsQueryResponse["adminTableRows"] | null>(null)

  const pageSize = 50
  const decodedTableName = useMemo(() => decodeTableName(tableName), [tableName])
  const safeTotalPages = Math.max(tableData?.totalPages ?? 0, 1)

  useEffect(() => {
    setPage(1)
  }, [decodedTableName])

  useEffect(() => {
    void refreshTableData()
  }, [decodedTableName, page])

  async function refreshTableData() {
    setIsLoading(true)
    try {
      const { data } = await apolloClient.query<AdminTableRowsQueryResponse>({
        query: ADMIN_TABLE_ROWS_QUERY,
        variables: {
          input: {
            tableName: decodedTableName,
            page,
            pageSize
          }
        },
        fetchPolicy: "network-only"
      })
      setTableData(data?.adminTableRows ?? null)
    } catch (error) {
      setTableData(null)
      const message = error instanceof Error ? error.message : "Failed to load table rows"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatTableName(decodedTableName)}</CardTitle>
        <CardDescription>Read only table data. No search or write actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Total rows: {tableData?.totalCount ?? 0}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {(tableData?.columns ?? []).map((column) => (
                  <TableHead key={column.name}>{column.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={(tableData?.columns?.length || 1) + 1}>
                    <div className="flex items-center justify-center py-8">
                      <Spinner className="size-5" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading && tableData && tableData.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={(tableData.columns.length || 1) + 1}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Empty table
                  </TableCell>
                </TableRow>
              ) : null}

              {!isLoading && tableData
                ? tableData.rows.map((row, rowIndex) => (
                    <TableRow key={`${decodedTableName}-${rowIndex}`}>
                      {tableData.columns.map((column) => (
                        <TableCell key={`${rowIndex}-${column.name}`} className="max-w-[360px] truncate">
                          {String(row.values[column.name] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : null}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((prev) => prev - 1)}>
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} / {safeTotalPages}
          </div>
          <Button
            variant="outline"
            disabled={isLoading || page >= safeTotalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
