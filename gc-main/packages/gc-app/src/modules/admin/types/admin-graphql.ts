export interface AdminTableMeta {
  name: string
  rowCount: number
}

export interface AdminTablesQueryResponse {
  adminTables: AdminTableMeta[]
}

export interface AdminTableColumn {
  name: string
  type: string
  notNull: boolean
  pk: boolean
}

export interface AdminTableRow {
  values: Record<string, unknown>
}

export interface AdminTableRowsPage {
  tableName: string
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  columns: AdminTableColumn[]
  rows: AdminTableRow[]
}

export interface AdminTableRowsQueryResponse {
  adminTableRows: AdminTableRowsPage
}

export interface AdminConfigItem {
  id: string
  key: string
  value: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminConfigsQueryResponse {
  configs: AdminConfigItem[]
}
