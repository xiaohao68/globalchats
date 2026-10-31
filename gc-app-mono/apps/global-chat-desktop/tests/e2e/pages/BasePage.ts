// apps/global-chat-desktop/tests/e2e/pages/BasePage.ts
import { Page } from "@playwright/test";
import { testLogger } from "../utils/logger";

/**
 * 页面基类 - 所有 Page Object 的基础
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * 等待页面加载完成（子类必须实现）
   */
  abstract waitForReady(): Promise<void>;

  /**
   * 截图（用于调试和报告）
   */
  async screenshot(name: string): Promise<void> {
    const path = `test-results/screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path });
    this.log("info", `Screenshot saved: ${path}`);
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * 日志记录（留空接口，后续接入项目日志系统）
   */
  protected log(level: "info" | "error" | "warn", message: string): void {
    testLogger[level](message);
  }
}
