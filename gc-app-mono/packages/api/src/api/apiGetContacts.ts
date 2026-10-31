interface Contact {
  id: string;
  accountId: string;
  contactId: string;
  nickname: string;
  avatar?: string;
  platform: string;
  version: number;
  updatedAt: number;
}

export const apiGetContacts = async (accountId: string): Promise<Contact[]> => {
  return [
    {
      id: "contact_1",
      accountId,
      contactId: "c_001",
      nickname: "Alice",
      avatar: "https://example.com/avatar1.jpg",
      platform: "telegram",
      version: 1,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: "contact_2",
      accountId,
      contactId: "c_002",
      nickname: "Bob",
      avatar: "https://example.com/avatar2.jpg",
      platform: "telegram",
      version: 1,
      updatedAt: Date.now() - 43200000,
    },
    {
      id: "contact_3",
      accountId,
      contactId: "c_003",
      nickname: "Charlie",
      platform: "telegram",
      version: 1,
      updatedAt: Date.now() - 21600000,
    },
    {
      id: "contact_4",
      accountId,
      contactId: "c_004",
      nickname: "David",
      avatar: "https://example.com/avatar4.jpg",
      platform: "telegram",
      version: 1,
      updatedAt: Date.now() - 10800000,
    },
    {
      id: "contact_5",
      accountId,
      contactId: "c_005",
      nickname: "Eve",
      avatar: "https://example.com/avatar5.jpg",
      platform: "telegram",
      version: 1,
      updatedAt: Date.now(),
    },
  ];
};
