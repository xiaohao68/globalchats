interface UserConfig {
  config: Record<string, unknown>;
  version: number;
  updatedAt: number;
}

export const apiGetUserConfig = async (): Promise<UserConfig> => {
  return {
    config: {
      theme: "dark",
      language: "zh-CN",
      proxy: {
        enabled: false,
        host: "",
        port: 0,
      },
      notifications: {
        enabled: true,
        sound: true,
      },
    },
    version: 1,
    updatedAt: Date.now(),
  };
};
