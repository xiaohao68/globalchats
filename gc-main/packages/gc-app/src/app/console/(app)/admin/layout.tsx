import { AdminRouteGuard } from "@/modules/admin/components/admin-route-guard"

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <AdminRouteGuard>{children}</AdminRouteGuard>
}
