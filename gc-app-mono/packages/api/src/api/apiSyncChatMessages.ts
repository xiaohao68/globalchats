interface ChatMessage {
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

interface SyncChatMessagesInput {
  accountId: string;
  messages: Omit<ChatMessage, "id">[];
}

interface SyncChatMessagesResult {
  success: boolean;
  count: number;
}

export const apiSyncChatMessages = async (
  input: SyncChatMessagesInput,
): Promise<SyncChatMessagesResult> => {
  return {
    success: true,
    count: input.messages.length,
  };
};
