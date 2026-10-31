import { ApolloLink, gql, Operation, Observable } from "@apollo/client"
import type { FetchResult } from "@apollo/client"
import type { OperationDefinitionNode } from "graphql"

import formatTitle, { getErrorColor, getLabelStyle } from "./format-title"

const getGroup = (collapsed: boolean) =>
  collapsed
    ? console.groupCollapsed.bind(console)
    : console.group.bind(console)

const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

const parseQuery = (queryString: string) => {
  const queryObj = gql`
    ${queryString}
  `
  const definition = queryObj.definitions[0] as OperationDefinitionNode
  const { name } = definition
  return [name ? name.value : "Generic", queryString.trim()]
}

const logWithLabel = (label: string, value: unknown) => {
  console.log(`%c${label}`, getLabelStyle(), value)
}

const logErrorsObject = (errors: readonly unknown[]) => {
  console.log("%c📋 ERRORS (right-click → Copy object)", getLabelStyle(), errors)
}

const logDebug = (message: string, style?: string) => {
  if (style) {
    console.log(message, style)
  } else {
    console.log(message)
  }
}

const logError = (errors: readonly unknown[]) => {
  console.error(errors)
}

const getNestedErrors = (
  data: FetchResult["data"],
  queryName: string
): readonly unknown[] | undefined => {
  if (!data || typeof data !== "object") return undefined
  const queryResult = (data as Record<string, unknown>)[queryName]
  if (!queryResult || typeof queryResult !== "object") return undefined
  const errors = (queryResult as Record<string, unknown>).errors
  return Array.isArray(errors) ? errors : undefined
}

const getOperationType = (operation: Operation): string => {
  const definition = operation.query.definitions[0] as OperationDefinitionNode
  return definition.operation
}

export const loggerLink = (getSchemaName?: (operation: Operation) => string) =>
  new ApolloLink((operation, forward) => {
    const schemaName = getSchemaName ? getSchemaName(operation) : "default"

    operation.setContext({ start: Date.now() })

    const { variables } = operation
    const operationType = getOperationType(operation)
    const headers = operation.getContext().headers

    const [queryName, query] = parseQuery(operation.query.loc?.source.body ?? "")

    if (operationType === "subscription") {
      const date = new Date().toLocaleTimeString()
      const titleArgs = formatTitle(operationType, schemaName, queryName, date)

      console.groupCollapsed(...(titleArgs as [string, ...string[]]))

      if (variables && Object.keys(variables).length !== 0) {
        logDebug("VARIABLES")
        console.log(variables)
      }

      logDebug("QUERY")
      console.log(query)

      console.groupEnd()

      return forward(operation)
    }

    return new Observable<FetchResult>((observer) => {
      const subscription = forward(operation).subscribe({
        next: (result) => {
          const time = Date.now() - operation.getContext().start
          const errors = result.errors ?? getNestedErrors(result.data, queryName)
          const hasError = Boolean(errors)

          try {
            const titleArgs = formatTitle(operationType, schemaName, queryName, time)
            getGroup(!hasError)(...(titleArgs as [string, ...string[]]))

            if (isDefined(errors)) {
              errors.forEach((errorItem) => {
                const message =
                  typeof errorItem === "object" && errorItem !== null && "message" in errorItem
                    ? String((errorItem as { message?: unknown }).message)
                    : "Unknown GraphQL error"
                logDebug(`%c✗ ${message}`, `color: ${getErrorColor()}; font-weight: bold`)
              })
            }

            if (headers && Object.keys(headers).length !== 0) {
              logWithLabel("HEADERS", headers)
            }

            if (variables && Object.keys(variables).length !== 0) {
              logWithLabel("VARIABLES", variables)
            }

            logWithLabel("QUERY", [query])

            if (isDefined(result.data)) {
              logWithLabel("DATA", result.data)
            }

            if (isDefined(errors)) {
              logErrorsObject(errors)
            }

            const copyPayload: Record<string, unknown> = {
              operation: `${operationType} ${schemaName}::${queryName} (in ${time} ms)`
            }

            if (headers && Object.keys(headers).length !== 0) {
              copyPayload.HEADERS = headers
            }
            if (variables && Object.keys(variables).length !== 0) {
              copyPayload.VARIABLES = variables
            }
            copyPayload.QUERY = query
            if (isDefined(result.data)) {
              copyPayload.DATA = result.data
            }
            if (isDefined(errors)) {
              copyPayload.ERRORS = errors
            }
            logWithLabel("FULL", copyPayload)

            console.groupEnd()
          } catch {
            logDebug(`${operationType} ${schemaName}::${queryName} (in ${time} ms)`)
            if (isDefined(errors)) {
              logError(errors)
            }
          }

          observer.next(result)
        },
        error: (error) => {
          observer.error(error)
        },
        complete: () => {
          observer.complete()
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    })
  })
