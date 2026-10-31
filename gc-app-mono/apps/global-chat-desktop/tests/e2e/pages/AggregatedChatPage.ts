// apps/global-chat-desktop/tests/e2e/pages/AggregatedChatPage.ts
import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * 聚合聊天页面对象
 */
export class AggregatedChatPage extends BasePage {
  private selectors = {
    chatList: '[data-testid="aggregated-chat-list"], .chat-list',
    messageList: '[data-testid="message-list"], .message-list',
    platformFilter: '[data-testid="platform-filter"], .platform-filter',
    translateButton: '[data-testid="translate-btn"], .translate-btn',
  };

  constructor(page: Page) {
    super(page);
  }

  async waitForReady(): Promise<void> {
    await this.waitForNetworkIdle();
    this.log("info", "Aggregated chat page ready");
  }

  async goto(): Promise<void> {
    await this.page.goto("/chat");
    await this.waitForReady();
  }

  async getVisibleMessages(): Promise<number> {
    const messages = this.page.locator(`${this.selectors.messageList} > *`);
    return messages.count();
  }

  async filterByPlatform(platform: string): Promise<void> {
    await this.page.click(`${this.selectors.platformFilter} [data-platform="${platform}"]`);
    await this.waitForNetworkIdle();
  }

  async translateMessage(messageIndex: number): Promise<void> {
    const messages = this.page.locator(`${this.selectors.messageList} > *`);
    const message = messages.nth(messageIndex);
    await message.hover();
    await message.locator(this.selectors.translateButton).click();
  }
}
