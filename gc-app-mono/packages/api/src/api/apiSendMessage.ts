import { gqlClient } from "../apiClient.ts";
import { SendMessage } from "../gql/index.ts";

export interface SendMessageInput {
  content: string;
  senderId: string;
  receiverId: string;
}

export interface ApiSentMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
}

interface ResponseData {
  sendMessage: ApiSentMessage;
}

// TODO: 确认后端 SendMessage API 是否可用
export const apiSendMessage = async (
  input: SendMessageInput,
): Promise<ApiSentMessage> => {
  const res = await gqlClient<ResponseData>(
    {
      query: SendMessage,
      variables: { input },
    },
    {},
    { authMode: "require" },
  );

  return res.data.data.sendMessage;
};
