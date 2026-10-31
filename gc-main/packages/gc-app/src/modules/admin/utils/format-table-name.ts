export function formatTableName(tableName: string): string {
  return tableName
    .split("_")
    .filter(Boolean)
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(" ")
}
