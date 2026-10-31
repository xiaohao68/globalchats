// apps/global-chat-desktop/tests/e2e/fixtures/base.ts
import { test as base, expect } from "@playwright/test";

/**
 * Tauri Internals 类型定义
 */
interface TauriInternals {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  metadata: {
    currentWebview: { label: string };
  };
}

declare global {
  interface Window {
    __TAURI_INTERNALS__: TauriInternals;
  }
}

/**
 * 扩展 Playwright 基础测试 fixture
 * 注入 Tauri mock 和通用工具
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // 注入 Tauri mock
    await page.addInitScript(() => {
      window.__TAURI_INTERNALS__ = {
        invoke: async (cmd, args) => {
          console.log(`[Mock] invoke: ${cmd}`, args);
          switch (cmd) {
            case "get_theme":
              return "light";
            case "get_user_settings":
              return {};
            default:
              return null;
          }
        },
        metadata: {
          currentWebview: { label: "main" },
        },
      };
    });

    await use(page);
  },
});

export { expect };
