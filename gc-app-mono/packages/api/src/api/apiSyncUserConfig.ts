interface SyncUserConfigInput {
  config: Record<string, unknown>;
  version: number;
  updatedAt: number;
}

interface SyncUserConfigResult {
  success: boolean;
  version: number;
  updatedAt: number;
}

export const apiSyncUserConfig = async (
  input: SyncUserConfigInput,
): Promise<SyncUserConfigResult> => {
  return {
    success: true,
    version: input.version,
    updatedAt: input.updatedAt,
  };
};
