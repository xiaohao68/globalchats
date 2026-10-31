import { gqlClient } from "../apiClient.ts";
import { Mutation, MutationLoginArgs } from "../gen/graphql.ts";
import { Login } from "../gql/index.ts";

interface RequestData {
  email: string;
  password: string;
}

export const apiLogin = async (data: RequestData): Promise<string> => {
  const res = await gqlClient<Mutation>(
    {
      query: Login,
      variables: {
        input: {
          email: data.email,
          password: data.password,
          captchaToken: null,
        },
      } as MutationLoginArgs,
    },
    {},
    { authMode: "skip" },
  );

  const accessToken = res.data.data.login?.accessToken;
  if (!accessToken) {
    throw new Error("Login failed: no access token returned");
  }

  return accessToken;
};
