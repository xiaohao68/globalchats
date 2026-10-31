import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import graphql from "@rollup/plugin-graphql";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(async ({ mode, command }) => {
  const isDev = mode === "development";
  const env = loadEnv(mode, path.join(__dirname, "./"));
  return {
    plugins: [
      tailwindcss(),
      react(),
      graphql(),
      sentryVitePlugin({
        authToken: env.VITE_SENTRY_AUTH_TOKEN,
        org: "globalchats",
        project: "desktop-app",
        sourcemaps: {
          filesToDeleteAfterUpload: "./dist/render/**/*.map",
        },
      }),
    ],
    build: {
      // root: "./index.html",
      assetsInlineLimit: 0,
      target: "ES2022",
      cssTarget: "chrome120",
      // sourcemap:!isDev,
      sourcemap: true,
      // outdir: "dist/render",
      rollupOptions: {
        plugins: [],
        output: {
          dir: "dist/render",
        },
      },
    },
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "zustand",
        "lodash-es",
        "graphql",
        "axios",
        "i18next",
      ],
      alias: {
        "@": path.resolve(__dirname, "./src"),
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
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: true,
      hmr: true,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
      //
      proxy: {
        "/api": {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
        "/graphql": {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
