interface SyncAccountInput {
  platform: string;
  userId: string;
  nickname: string;
  avatar?: string;
  version: number;
  updatedAt: number;
}

interface Account {
  id: string;
  platform: string;
  userId: string;
  nickname: string;
  avatar?: string;
  version: number;
  updatedAt: number;
}

export const apiSyncAccount = async (
  input: SyncAccountInput,
): Promise<Account> => {
  return {
    id: `account_${Date.now()}`,
    ...input,
  };
};
