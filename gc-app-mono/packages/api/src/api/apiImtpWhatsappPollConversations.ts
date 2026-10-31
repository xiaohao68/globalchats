import { gqlClient } from "../apiClient.ts";
import type {
  ImtpPollConversationsInput,
  ImtpWhatsAppPollConversationsResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappAggregatePollConversations } from "../gql/query/imtp/ImtpWhatsappAggregatePollConversations.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      aggregatePollConversations: ImtpWhatsAppPollConversationsResult;
    };
  };
}

export const apiImtpWhatsappPollConversations = async (
  input: ImtpPollConversationsInput,
): Promise<ImtpWhatsAppPollConversationsResult> => {
  console.log("[IMTP] pollConversations request:", JSON.stringify(input));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappAggregatePollConversations,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  const data = res.data?.data?.imtp?.whatsapp?.aggregatePollConversations;
  if (!data) {
    throw new Error("IMTP aggregatePollConversations: invalid response");
  }
  console.log("[IMTP] pollConversations response:", JSON.stringify(data));
  return data;
};
