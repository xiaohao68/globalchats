import { gqlClient } from "../apiClient.ts";
import type {
  ImtpPollParticipantsInput,
  ImtpWhatsAppPollParticipantsResult,
} from "../gen/graphql.ts";
import { ImtpWhatsappAggregatePollParticipants } from "../gql/query/imtp/ImtpWhatsappAggregatePollParticipants.graphql";

interface ResponseData {
  imtp: {
    whatsapp: {
      aggregatePollParticipants: ImtpWhatsAppPollParticipantsResult;
    };
  };
}

export const apiImtpWhatsappPollParticipants = async (
  input: ImtpPollParticipantsInput,
): Promise<ImtpWhatsAppPollParticipantsResult> => {
  console.log("[IMTP] pollParticipants request:", JSON.stringify(input));
  const res = await gqlClient<ResponseData>(
    {
      query: ImtpWhatsappAggregatePollParticipants,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  const data = res.data?.data?.imtp?.whatsapp?.aggregatePollParticipants;
  if (!data) {
    throw new Error("IMTP aggregatePollParticipants: invalid response");
  }
  console.log("[IMTP] pollParticipants response:", JSON.stringify(data));
  return data;
};
