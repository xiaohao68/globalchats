interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
}

export const apiGetNewMessages = async (
  lastTimestamp?: number,
): Promise<Message[]> => {
  const mockMessages: Message[] = [
    {
      id: "msg_1",
      content: "Hello!",
      senderId: "user_123",
      receiverId: "user_456",
      timestamp: Date.now() - 5000,
    },
    {
      id: "msg_2",
      content: "How are you?",
      senderId: "user_456",
      receiverId: "user_123",
      timestamp: Date.now() - 3000,
    },
    {
      id: "msg_3",
      content: "I'm good, thanks!",
      senderId: "user_123",
      receiverId: "user_456",
      timestamp: Date.now() - 1000,
    },
  ];

  if (lastTimestamp) {
    return mockMessages.filter((msg) => msg.timestamp > lastTimestamp);
  }

  return mockMessages;
};
