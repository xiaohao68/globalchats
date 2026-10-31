import { gqlClient } from "../apiClient.ts";
import type {
  ImtpWhatsappHijackPushConversationsInput,
  ImtpWhatsAppPushConversationsResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappHijackPushConversations } from "../gql/mutation/imtp/ImtpWhatsappHijackPushConversations.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      hijackPushConversations: ImtpWhatsAppPushConversationsResult;
    };
  };
}

export const apiImtpWhatsappPushConversations = async (
  input: ImtpWhatsappHijackPushConversationsInput,
): Promise<ImtpWhatsAppPushConversationsResult> => {
  console.log("[IMTP] pushConversations request:", JSON.stringify({ accountId: input.imtpWhatsappAccountId, count: input.conversations?.length }));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappHijackPushConversations,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  const data = res.data?.data?.imtp?.whatsapp?.hijackPushConversations;
  if (!data) {
    throw new Error("IMTP hijackPushConversations: invalid response");
  }
  console.log("[IMTP] pushConversations response:", JSON.stringify(data));
  return data;
};
