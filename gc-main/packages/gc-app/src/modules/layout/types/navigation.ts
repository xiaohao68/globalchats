import type { LucideIcon } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon?: LucideIcon
  isComing?: boolean
  isDataBadge?: string
  isNew?: boolean
  newTab?: boolean
  items?: NavItem[]
}

export interface NavGroup {
  title: string
  items: NavItem[]
}
