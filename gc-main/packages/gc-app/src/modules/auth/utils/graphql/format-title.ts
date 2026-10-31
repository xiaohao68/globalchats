export const getErrorColor = () => "#ef4444"

export const getLabelStyle = () => "color: #3b82f6; font-weight: bold"

const getOperationColor = (operationType: string) => {
  switch (operationType) {
    case "query":
      return "#22c55e"
    case "mutation":
      return "#f59e0b"
    case "subscription":
      return "#8b5cf6"
    default:
      return "#6b7280"
  }
}

export const formatTitle = (
  operationType: string,
  schemaName: string,
  queryName: string,
  timeOrDate: string | number
) => {
  const operationColor = getOperationColor(operationType)
  const timeStr = typeof timeOrDate === "number" ? `${timeOrDate} ms` : timeOrDate

  return [
    `%c${operationType.toUpperCase()} %c${schemaName}::${queryName} %c(${timeStr})`,
    `color: ${operationColor}; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${operationColor}20;`,
    "color: #374151; font-weight: 600;",
    "color: #6b7280; font-style: italic;"
  ]
}

export default formatTitle
