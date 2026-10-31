import { gqlClient } from "../apiClient.ts";
import type {
  ImtpWhatsappHijackPushParticipantsInput,
  ImtpWhatsAppPushParticipantsResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappHijackPushParticipants } from "../gql/mutation/imtp/ImtpWhatsappHijackPushParticipants.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      hijackPushParticipants: ImtpWhatsAppPushParticipantsResult;
    };
  };
}

export const apiImtpWhatsappPushParticipants = async (
  input: ImtpWhatsappHijackPushParticipantsInput,
): Promise<ImtpWhatsAppPushParticipantsResult> => {
  console.log("[IMTP] pushParticipants request:", JSON.stringify({ accountId: input.imtpWhatsappAccountId, count: input.participants?.length }));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappHijackPushParticipants,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  const data = res.data?.data?.imtp?.whatsapp?.hijackPushParticipants;
  if (!data) {
    throw new Error("IMTP hijackPushParticipants: invalid response");
  }
  console.log("[IMTP] pushParticipants response:", JSON.stringify(data));
  return data;
};
