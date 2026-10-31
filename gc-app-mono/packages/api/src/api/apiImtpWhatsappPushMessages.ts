import { gqlClient } from "../apiClient.ts";
import type {
  HijackPushMessagesInput,
  ImtpWhatsAppPushMessagesResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappHijackPushMessages } from "../gql/mutation/imtp/ImtpWhatsappHijackPushMessages.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      hijackPushMessages: ImtpWhatsAppPushMessagesResult;
    };
  };
}

export const apiImtpWhatsappPushMessages = async (
  input: HijackPushMessagesInput,
): Promise<ImtpWhatsAppPushMessagesResult> => {
  console.log("[IMTP] pushMessages request:", JSON.stringify({ accountId: input.imtpWhatsappAccountId, conversationId: input.imtpWhatsappConversationId, count: input.messages?.length }));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappHijackPushMessages,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  const data = res.data?.data?.imtp?.whatsapp?.hijackPushMessages;
  if (!data) {
    throw new Error("IMTP hijackPushMessages: invalid response");
  }
  console.log("[IMTP] pushMessages response:", JSON.stringify(data));
  return data;
};
