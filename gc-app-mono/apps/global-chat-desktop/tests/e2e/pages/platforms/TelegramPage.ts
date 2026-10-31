// apps/global-chat-desktop/tests/e2e/pages/platforms/TelegramPage.ts
import { Page } from "@playwright/test";
import { PlatformPage, EPlatform } from "./PlatformPage";

/**
 * Telegram 页面对象
 */
export class TelegramPage extends PlatformPage {
  readonly platform = EPlatform.Telegram;

  private selectors = {
    chatList: ".chat-list, .chatlist",
    messageList: ".messages-container, .message-list",
    inputBox: ".input-message-input, .composer-input",
    searchBox: ".input-search, .search-input",
  };

  constructor(page: Page) {
    super(page);
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForSelector(this.selectors.chatList, {
      timeout: 30_000,
    });
    await this.waitForGCEngine();
    this.log("info", "Telegram page ready");
  }

  async searchChat(keyword: string): Promise<void> {
    const searchBox = this.page.locator(this.selectors.searchBox).first();
    await searchBox.fill(keyword);
    await this.page.waitForTimeout(1000);
  }

  async openChat(chatName: string): Promise<void> {
    await this.page.click(`text=${chatName}`);
    await this.page.waitForSelector(this.selectors.messageList);
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.chatList, {
        timeout: 5_000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
