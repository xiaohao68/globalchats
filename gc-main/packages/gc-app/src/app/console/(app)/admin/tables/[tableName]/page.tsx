import { AdminTableDataPage } from "@/modules/admin/components/admin-table-data-page"

export default async function Page({
  params
}: {
  params: Promise<{ tableName: string }>
}) {
  const { tableName } = await params
  return <AdminTableDataPage tableName={tableName} />
}
