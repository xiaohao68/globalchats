import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import graphql from "@rollup/plugin-graphql";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  return {
    publicDir: false,
    plugins: [tailwindcss(), react(), graphql()],

    build: {
      target: "ES2022",
      cssTargets: ["edge80", "safari15", "ios15", "android30"],
      moduleRunnerTransform: true,
      sourcemap: isDev ? "inline" : false,
      minify: false,
      rolldownOptions: {
        input: "src-preload/index.ts",
        output: {
          hoistTransitiveImports: true,
          inlineDynamicImports: true,
          advancedChunks: false,
          format: "iife",
          dir: "dist/preload",
          entryFileNames: "[name].js",
          assetFileNames: "assets/[name][extname]",
        },
      },
    },
    resolve: {
      preserveSymlinks: false,
      alias: {
        "@": path.resolve(__dirname, "./src-preload"),
        "@gc/ui": path.resolve(__dirname, "../../packages/ui/src"),
        "@gc/lib": path.resolve(__dirname, "../../packages/ui/src/lib"),
        "@gc/model": path.resolve(__dirname, "../../packages/model/src"),
        "@gc/store": path.resolve(__dirname, "../../packages/store/src"),
        "@gc/utils": path.resolve(__dirname, "../../packages/utils/src"),
        "@gc/api": path.resolve(__dirname, "../../packages/api/src"),
        "@gc/misc": path.resolve(__dirname, "../../packages/misc/src"),
        "@gc/adapter": path.resolve(__dirname, "../../packages/adapter/src"),
        "@gc/i18n": path.resolve(__dirname, "../../packages/i18n/src"),
        "@gc/webview": path.resolve(__dirname, "../../packages/webview/src"),
        "@gc/gc-engine": path.resolve(
          __dirname,
          "../../packages/gc-engine/src",
        ),
      },
    },
    optimizeDeps: {
      include: ["mitt", "axios", "zod"],
    },
    clearScreen: false,
  };
});
