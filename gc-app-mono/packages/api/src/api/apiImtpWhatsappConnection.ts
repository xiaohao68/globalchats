import { gqlClient } from "../apiClient.ts";
import type {
  ImtpWhatsAppAccountConnection,
  ImtpWhatsAppAccountConnectionInput,
  ImtpWhatsAppConversationConnection,
  ImtpWhatsAppConversationConnectionInput,
  ImtpWhatsAppMessageConnection,
  ImtpWhatsAppMessageConnectionInput,
  ImtpWhatsAppParticipantConnection,
  ImtpWhatsAppParticipantConnectionInput,
} from "../gen/graphql.ts";
import { ImtpWhatsappAccountsConnection } from "../gql/query/imtp/ImtpWhatsappAccountsConnection.graphql";
import { ImtpWhatsappConversationsConnection } from "../gql/query/imtp/ImtpWhatsappConversationsConnection.graphql";
import { ImtpWhatsappMessagesConnection } from "../gql/query/imtp/ImtpWhatsappMessagesConnection.graphql";
import { ImtpWhatsappParticipantsConnection } from "../gql/query/imtp/ImtpWhatsappParticipantsConnection.graphql";

interface AccountsResponse {
  imtp: { whatsapp: { accounts: ImtpWhatsAppAccountConnection } };
}
interface ConversationsResponse {
  imtp: { whatsapp: { conversations: ImtpWhatsAppConversationConnection } };
}
interface MessagesResponse {
  imtp: { whatsapp: { messages: ImtpWhatsAppMessageConnection } };
}
interface ParticipantsResponse {
  imtp: { whatsapp: { participants: ImtpWhatsAppParticipantConnection } };
}

export const apiImtpWhatsappConnectionAccounts = async (
  input: ImtpWhatsAppAccountConnectionInput = {},
): Promise<ImtpWhatsAppAccountConnection> => {
  const res = await gqlClient<AccountsResponse>(
    { query: ImtpWhatsappAccountsConnection, variables: { input } },
    {},
    { authMode: "require" },
  );
  return res.data?.data?.imtp?.whatsapp?.accounts ?? { edges: [], totalCount: 0, pageInfo: { hasNextPage: false, hasPreviousPage: false } };
};

export const apiImtpWhatsappConnectionConversations = async (
  input: ImtpWhatsAppConversationConnectionInput = {},
): Promise<ImtpWhatsAppConversationConnection> => {
  const res = await gqlClient<ConversationsResponse>(
    { query: ImtpWhatsappConversationsConnection, variables: { input } },
    {},
    { authMode: "require" },
  );
  return res.data?.data?.imtp?.whatsapp?.conversations ?? { edges: [], totalCount: 0, pageInfo: { hasNextPage: false, hasPreviousPage: false } };
};

export const apiImtpWhatsappConnectionMessages = async (
  input: ImtpWhatsAppMessageConnectionInput = {},
): Promise<ImtpWhatsAppMessageConnection> => {
  const res = await gqlClient<MessagesResponse>(
    { query: ImtpWhatsappMessagesConnection, variables: { input } },
    {},
    { authMode: "require" },
  );
  return res.data?.data?.imtp?.whatsapp?.messages ?? { edges: [], totalCount: 0, pageInfo: { hasNextPage: false, hasPreviousPage: false } };
};

export const apiImtpWhatsappConnectionParticipants = async (
  input: ImtpWhatsAppParticipantConnectionInput = {},
): Promise<ImtpWhatsAppParticipantConnection> => {
  const res = await gqlClient<ParticipantsResponse>(
    { query: ImtpWhatsappParticipantsConnection, variables: { input } },
    {},
    { authMode: "require" },
  );
  return res.data?.data?.imtp?.whatsapp?.participants ?? { edges: [], totalCount: 0, pageInfo: { hasNextPage: false, hasPreviousPage: false } };
};
