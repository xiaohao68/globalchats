import { gqlClient } from "../apiClient.ts";
import type {
  GetWhatsappAccountsInput,
  ImtpWhatsappAggregatePollAccountsResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappAggregatePollAccounts } from "../gql/query/imtp/ImtpWhatsappAggregatePollAccounts.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      aggregatePollAccounts: ImtpWhatsappAggregatePollAccountsResult;
    };
  };
}

export const apiImtpWhatsappPollAccounts = async (
  input: GetWhatsappAccountsInput,
): Promise<ImtpWhatsappAggregatePollAccountsResult> => {
  console.log("[IMTP] pollAccounts request:", JSON.stringify(input));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappAggregatePollAccounts,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  console.log("[DEBUG:pollAccounts] raw response:", JSON.stringify(res.data).slice(0, 500));
  const data = res.data?.data?.imtp?.whatsapp?.aggregatePollAccounts;
  if (!data) {
    console.error("[DEBUG:pollAccounts] data path missing! res.data keys:", Object.keys(res.data || {}));
    throw new Error("IMTP aggregatePollAccounts: invalid response");
  }
  console.log("[IMTP] pollAccounts response:", JSON.stringify(data));
  return data;
};
