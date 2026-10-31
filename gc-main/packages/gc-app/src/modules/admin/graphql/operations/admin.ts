import { gql } from "@apollo/client"

export const ADMIN_TABLES_QUERY = gql`
  query AdminTables {
    adminTables {
      name
      rowCount
    }
  }
`

export const ADMIN_TABLE_ROWS_QUERY = gql`
  query AdminTableRows($input: AdminTableRowsInput!) {
    adminTableRows(input: $input) {
      tableName
      page
      pageSize
      totalCount
      totalPages
      columns {
        name
        type
        notNull
        pk
      }
      rows {
        values
      }
    }
  }
`

export const ADMIN_CONFIGS_QUERY = gql`
  query AdminConfigs {
    configs {
      id
      key
      value
      description
      createdAt
      updatedAt
    }
  }
`

export const CREATE_ADMIN_CONFIG_MUTATION = gql`
  mutation CreateAdminConfig($input: CreateAdminConfigInput!) {
    createAdminConfig(input: $input) {
      id
      key
      value
      description
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_ADMIN_CONFIG_MUTATION = gql`
  mutation UpdateAdminConfig($id: ID!, $input: UpdateConfigInput!) {
    updateConfig(id: $id, input: $input) {
      id
      key
      value
      description
      createdAt
      updatedAt
    }
  }
`

export const DELETE_ADMIN_CONFIG_MUTATION = gql`
  mutation DeleteAdminConfig($id: ID!) {
    deleteAdminConfig(id: $id)
  }
`
