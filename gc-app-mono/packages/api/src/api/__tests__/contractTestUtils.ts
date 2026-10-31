import { expect } from "vitest";

type IntrospectionResponse = {
  data?: unknown;
  errors?: Array<{ message: string }>;
};

export const getContractTestEndpoint = (): string => {
  return process.env.GC_GRAPHQL_ENDPOINT ?? "https://app.caojdl.com/graphql";
};

export const shouldRunContractTests = (): boolean => {
  return process.env.GC_CONTRACT_TESTS === "1";
};

export const gqlRequest = async <TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> => {
  const endpoint = getContractTestEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  expect(res.ok).toBe(true);

  const json = (await res.json()) as IntrospectionResponse;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("\n"));
  }
  return (json as { data: TData }).data;
};
