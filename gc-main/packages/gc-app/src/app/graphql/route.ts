import { createYoga } from "graphql-yoga";
import { schema } from "@/server/graphql/schema";
import { getTokenFromHeaders, verifyAccessToken } from "@/server/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yoga = createYoga({
  graphqlEndpoint: "/graphql",
  schema,
  fetchAPI: { Response, Request, Headers },
  context: async ({ request }) => {
    const token = getTokenFromHeaders(request.headers);
    const session = token ? await verifyAccessToken(token) : null;
    return { session };
  },
});

export { yoga as GET, yoga as POST };
