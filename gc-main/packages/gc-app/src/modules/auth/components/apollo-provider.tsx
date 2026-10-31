"use client";

import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/modules/auth/utils/apollo-client";

export function ApolloAppProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
