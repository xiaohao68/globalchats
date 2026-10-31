import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "../../vitest.shared.ts";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    define: {
      "import.meta.env.VITE_VERSION": JSON.stringify("1.0.0"),
    },
    test: {
      name: "adapter",
      environment: "node",
    },
  }),
);
