import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: "channel",
      environment: "jsdom",
      setupFiles: ["../../packages/__mocks__/setup.ts"],
    },
  }),
);
