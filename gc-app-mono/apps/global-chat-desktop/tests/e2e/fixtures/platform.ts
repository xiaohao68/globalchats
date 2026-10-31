// apps/global-chat-desktop/tests/e2e/fixtures/platform.ts
import { test as base } from "./base";
import { EPlatform } from "../pages/platforms";

/**
 * 平台测试 fixture
 * 提供平台相关的测试工具
 */
export const platformTest = base.extend<{
  platformName: EPlatform;
  waitForPlatformReady: () => Promise<void>;
}>({
  platformName: [EPlatform.WhatsApp, { option: true }],

  waitForPlatformReady: async ({ page, platformName }, use) => {
    const waitFn = async () => {
      // 等待平台 WebView 加载
      await page.waitForLoadState("networkidle");

      // 等待 GCEngine 注入（如果存在）
      try {
        await page.waitForFunction(
          () => typeof (window as unknown as { gcEngine?: unknown }).gcEngine !== "undefined",
          { timeout: 10_000 }
        );
      } catch {
        // GCEngine 可能不存在，跳过
      }

      console.log(`[Platform] ${platformName} ready`);
    };

    await use(waitFn);
  },
});

export { expect } from "@playwright/test";
