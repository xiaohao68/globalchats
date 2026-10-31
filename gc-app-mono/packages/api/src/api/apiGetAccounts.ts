import { gqlClient } from "../apiClient.ts";
import { GetAccounts } from "../gql/index.ts";

export interface ApiAccount {
  id: string;
  platform: string;
  userId: string;
  nickname: string;
  avatar?: string;
  version: number;
  updatedAt: number;
}

interface ResponseData {
  getAccounts: ApiAccount[];
}

export const apiGetAccounts = async (): Promise<ApiAccount[]> => {
  const res = await gqlClient<ResponseData>(
    {
      query: GetAccounts,
      variables: {},
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.getAccounts;
};
