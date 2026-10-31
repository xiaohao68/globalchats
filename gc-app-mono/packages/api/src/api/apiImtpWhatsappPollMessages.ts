import { gqlClient } from "../apiClient.ts";
import type {
  ImtpPollMessagesInput,
  ImtpWhatsAppPollMessagesResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappAggregatePollMessages } from "../gql/query/imtp/ImtpWhatsappAggregatePollMessages.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      aggregatePollMessages: ImtpWhatsAppPollMessagesResult;
    };
  };
}

export const apiImtpWhatsappPollMessages = async (
  input: ImtpPollMessagesInput,
): Promise<ImtpWhatsAppPollMessagesResult> => {
  console.log("[IMTP] pollMessages request:", JSON.stringify(input));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappAggregatePollMessages,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  const data = res.data?.data?.imtp?.whatsapp?.aggregatePollMessages;
  if (!data) {
    throw new Error("IMTP aggregatePollMessages: invalid response");
  }
  console.log("[IMTP] pollMessages response:", JSON.stringify(data));
  return data;
};
