import { gqlClient } from "../apiClient.ts";
import type {
  SyncWhatsappAccountInput,
  ImptWhatsappHijactPushAccountsResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappHijackPushAccounts } from "../gql/mutation/imtp/ImtpWhatsappHijackPushAccounts.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      hijackPushAccounts: ImptWhatsappHijactPushAccountsResult;
    };
  };
}

export const apiImtpWhatsappPushAccounts = async (input: {
  accounts: SyncWhatsappAccountInput[];
  hijackImUserId?: string;
  assignImUserId?: string;
}): Promise<ImptWhatsappHijactPushAccountsResult> => {
  console.log("[IMTP] pushAccounts request:", JSON.stringify(input));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappHijackPushAccounts,
      variables: input,
    },
    {},
    { authMode: "require" },
  );

  const data = res.data?.data?.imtp?.whatsapp?.hijackPushAccounts;
  if (!data) {
    throw new Error("IMTP hijackPushAccounts: empty response data");
  }
  console.log("[IMTP] pushAccounts response:", JSON.stringify(data));
  return data;
};
