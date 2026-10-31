"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { apolloClient } from "@/modules/auth/utils/apollo-client"
import { ADMIN_TABLES_QUERY } from "@/modules/admin/graphql/operations/admin"
import type { AdminTablesQueryResponse } from "@/modules/admin/types/admin-graphql"
import { formatTableName } from "@/modules/admin/utils/format-table-name"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shadcn-ui-kit/ui/card"
import { Spinner } from "@/shadcn-ui-kit/ui/spinner"

export function AdminTablesIndexPage() {
  const [tables, setTables] = useState<AdminTablesQueryResponse["adminTables"]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void refreshTables()
  }, [])

  async function refreshTables() {
    setIsLoading(true)
    try {
      const { data } = await apolloClient.query<AdminTablesQueryResponse>({
        query: ADMIN_TABLES_QUERY,
        fetchPolicy: "network-only"
      })
      setTables(data?.adminTables ?? [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load tables"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Tables</CardTitle>
        <CardDescription>All database tables in alphabetical order.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-5" />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <Link
                key={table.name}
                href={`/console/admin/tables/${encodeURIComponent(table.name)}`}
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <div className="font-medium">{formatTableName(table.name)}</div>
                <div className="text-muted-foreground text-xs">{table.name}</div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
