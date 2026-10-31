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

interface SyncContactsInput {
  accountId: string;
  contacts: Omit<Contact, "id">[];
}

interface SyncContactsResult {
  success: boolean;
  count: number;
}

export const apiSyncContacts = async (
  input: SyncContactsInput,
): Promise<SyncContactsResult> => {
  return {
    success: true,
    count: input.contacts.length,
  };
};
