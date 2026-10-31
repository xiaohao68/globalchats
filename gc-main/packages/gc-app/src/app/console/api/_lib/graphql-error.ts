interface GraphQLErrorPayload {
  message?: string;
  extensions?: {
    code?: string;
  };
}

export function mapGraphQLErrorToHttpResponse(
  errors: GraphQLErrorPayload[] | undefined,
  fallbackMessage: string,
) {
  const firstError = errors?.[0];
  const message = firstError?.message || fallbackMessage;
  const code = firstError?.extensions?.code;

  if (code === "BAD_USER_INPUT") {
    return { error: message, status: 400 };
  }

  if (code === "UNAUTHORIZED") {
    return { error: message, status: 401 };
  }

  if (code === "FORBIDDEN") {
    return { error: message, status: 403 };
  }

  if (code === "NOT_FOUND") {
    return { error: message, status: 404 };
  }

  if (code === "SERVICE_UNAVAILABLE" || message.includes("Can't reach database server") || message.includes("Database is unavailable")) {
    return { error: message, status: 503 };
  }

  return { error: message, status: 500 };
}
