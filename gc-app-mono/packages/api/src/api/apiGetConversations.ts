import { gqlClient } from "../apiClient.ts";
import { GetConversations } from "../gql/index.ts";

export interface ApiConversation {
  id: string;
  accountId: string;
  contactId: string;
  contactNickname: string;
  contactAvatar?: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageTime: number;
  unreadCount: number;
  version: number;
  updatedAt: number;
}

interface GetConversationsParams {
  accountId?: string;
  updatedAfter?: number;
}

interface ResponseData {
  getConversations: ApiConversation[];
}

export const apiGetConversations = async (
  params: GetConversationsParams = {},
): Promise<ApiConversation[]> => {
  const res = await gqlClient<ResponseData>(
    {
      query: GetConversations,
      variables: params,
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.getConversations;
};
