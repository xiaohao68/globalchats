import { defineConfig, mergeConfig } from "vitest/config";
import { sharedConfig } from "../../vitest.shared.ts";
import { resolve } from "path";

const rootDir = import.meta.dirname;

export default mergeConfig(
  sharedConfig,
  defineConfig({
    define: {
      "import.meta.env.VITE_VERSION": JSON.stringify("1.0.0"),
    },
    resolve: {
      alias: {
        "@tauri-apps/api/webview": resolve(
          rootDir,
          "../../packages/__mocks__/@tauri-apps/api/webview.ts",
        ),
        "@tauri-apps/api/event": resolve(
          rootDir,
          "../../packages/__mocks__/@tauri-apps/api/event.ts",
        ),
        "@tauri-apps/plugin-store": resolve(
          rootDir,
          "../../packages/__mocks__/@tauri-apps/plugin-store/index.ts",
        ),
      },
    },
    test: {
      name: "gc-engine",
      environment: "jsdom",
      setupFiles: ["../../packages/__mocks__/setup.ts"],
    },
  }),
);
