"use client"

import { ApolloClient, CombinedGraphQLErrors, InMemoryCache, createHttpLink, from } from "@apollo/client"
import { setContext } from "@apollo/client/link/context"
import { ErrorLink } from "@apollo/client/link/error"
import { clearAuthState, getAccessToken } from "@/modules/auth/utils/auth-storage"
import { toLoginPathWithNext } from "@/modules/auth/utils/next-path"
import { loggerLink } from "@/modules/auth/utils/graphql/logger-link"

const httpLink = createHttpLink({
  uri: "/graphql"
})

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken()

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ""
    }
  }
})

const errorLink = new ErrorLink(({ error }) => {
  if (!CombinedGraphQLErrors.is(error)) return

  for (const gqlError of error.errors) {
    if (gqlError.extensions?.code !== "UNAUTHORIZED") continue

    if (typeof window !== "undefined") {
      clearAuthState()
      const pathname = window.location.pathname
      const isPublicPath =
        pathname === "/console/login" || pathname === "/console/register" || pathname.startsWith("/console/invite/")
      if (!isPublicPath) {
        const currentPath = `${window.location.pathname}${window.location.search}`
        window.location.href = toLoginPathWithNext(currentPath)
      }
    }

    break
  }
})

const isDev = process.env.NODE_ENV === "development"

export const apolloClient = new ApolloClient({
  link: isDev
    ? from([errorLink, loggerLink(), authLink, httpLink])
    : from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          workspace: {
            merge: true
          }
        }
      }
    }
  })
})
