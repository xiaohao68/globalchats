import { resolve } from "path";
import { defineConfig } from "vitest/config";
import graphql from "@rollup/plugin-graphql";

const rootDir = import.meta.dirname;

export const sharedConfig = defineConfig({
  plugins: [graphql()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules",
        "dist",
        "**/*.d.ts",
        "**/__tests__/**",
        "**/index.ts",
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@gc/adapter": resolve(rootDir, "packages/adapter/src"),
      "@gc/api": resolve(rootDir, "packages/api/src"),
      "@gc/channel": resolve(rootDir, "packages/channel/src"),
      "@gc/gc-engine": resolve(rootDir, "packages/gc-engine/src"),
      "@gc/i18n": resolve(rootDir, "packages/i18n/src"),
      "@gc/logger": resolve(rootDir, "packages/logger/src"),
      "@gc/misc": resolve(rootDir, "packages/misc/src"),
      "@gc/model": resolve(rootDir, "packages/model/src"),
      "@gc/store": resolve(rootDir, "packages/store/src"),
      "@gc/ui": resolve(rootDir, "packages/ui/src"),
      "@gc/utils": resolve(rootDir, "packages/utils/src"),
      "@gc/webview": resolve(rootDir, "packages/webview/src"),
    },
  },
});
