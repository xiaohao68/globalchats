// apps/global-chat-desktop/tests/e2e/pages/MainAppPage.ts
import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * 主应用页面对象
 */
export class MainAppPage extends BasePage {
  // 选择器（使用多个备选，兼容不同 UI 结构）
  private selectors = {
    sidebar: '[data-testid="sidebar"], .sidebar, nav, aside',
    mainContent: '[data-testid="main-content"], main, .main-content, #root > div',
    platformTabs: '[data-testid="platform-tabs"], .platform-tabs',
    settingsButton: '[data-testid="settings-btn"], .settings-btn',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * 等待页面加载完成
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
    this.log("info", "Main app page ready");
  }

  /**
   * 导航到首页
   */
  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.waitForReady();
  }

  /**
   * 检查侧边栏是否可见
   */
  async isSidebarVisible(): Promise<boolean> {
    const sidebar = this.page.locator(this.selectors.sidebar).first();
    return sidebar.isVisible();
  }

  /**
   * 检查主内容区是否可见
   */
  async isMainContentVisible(): Promise<boolean> {
    const main = this.page.locator(this.selectors.mainContent).first();
    return main.isVisible();
  }

  /**
   * 点击设置按钮
   */
  async clickSettings(): Promise<void> {
    await this.page.locator(this.selectors.settingsButton).first().click();
    this.log("info", "Clicked settings button");
  }

  /**
   * 获取当前 URL 路径
   */
  async getCurrentPath(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }
}
