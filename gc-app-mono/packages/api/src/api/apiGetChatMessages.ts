import { gqlClient } from "../apiClient.ts";
import { GetChatMessages } from "../gql/index.ts";

export interface ApiChatMessage {
  id: string;
  accountId: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: number;
  messageType: string;
  version: number;
  updatedAt: number;
}

export interface GetChatMessagesParams {
  accountId: string;
  limit?: number;
  offset?: number;
  startTime?: number;
  endTime?: number;
}

interface ResponseData {
  getChatMessages: ApiChatMessage[];
}

export const apiGetChatMessages = async (
  params: GetChatMessagesParams,
): Promise<ApiChatMessage[]> => {
  const res = await gqlClient<ResponseData>(
    {
      query: GetChatMessages,
      variables: params,
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.getChatMessages;
};
