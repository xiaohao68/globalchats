import {
  DatabaseIcon,
  MessageSquareHeartIcon,
  MessageSquareIcon,
  PieChartIcon,
  SettingsIcon,
  SlidersHorizontalIcon
} from "lucide-react"
import type { NavGroup } from "@/modules/layout/types/navigation"
import { formatTableName } from "@/modules/admin/utils/format-table-name"

interface BuildNavItemsOptions {
  isAdmin: boolean
  adminTableNames: string[]
}

const workspaceNavItems: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/console/dashboard",
        icon: PieChartIcon
      },
      {
        title: "IM",
        href: "/console/im",
        icon: MessageSquareIcon,
        items: [
          {
            title: "Aggregate",
            href: "/console/im/aggregate"
          },
          {
            title: "Whatsapp",
            href: "/console/im/whatsapp",
            icon: MessageSquareHeartIcon
          }
        ]
      },
      {
        title: "Settings",
        href: "/console/settings",
        icon: SettingsIcon
      }
    ]
  }
]

export function buildNavItems({ isAdmin, adminTableNames }: BuildNavItemsOptions): NavGroup[] {
  if (!isAdmin) return workspaceNavItems

  const sortedTableNames = [...adminTableNames].sort((left, right) => left.localeCompare(right))
  const tableItems = sortedTableNames.map((tableName) => ({
    title: formatTableName(tableName),
    href: `/console/admin/tables/${encodeURIComponent(tableName)}`
  }))

  return [
    ...workspaceNavItems,
    {
      title: "Admin Area",
      items: [
        {
          title: "Configs",
          href: "/console/admin/configs",
          icon: SlidersHorizontalIcon
        },
        {
          title: "Tables",
          href: "/console/admin/tables",
          icon: DatabaseIcon,
          items: tableItems
        }
      ]
    }
  ]
}

export const navItems = workspaceNavItems
