// apps/global-chat-desktop/tests/e2e/pages/platforms/WhatsAppPage.ts
import { Page } from "@playwright/test";
import { PlatformPage, EPlatform } from "./PlatformPage";

/**
 * WhatsApp 页面对象
 */
export class WhatsAppPage extends PlatformPage {
  readonly platform = EPlatform.WhatsApp;

  // WhatsApp Web 选择器
  private selectors = {
    chatList: '[data-testid="chat-list"], .chat-list, ._3nbHh',
    messageList: '[data-testid="msg-container"], .message-list',
    inputBox: '[data-testid="conversation-compose-box-input"], .selectable-text',
    sendButton: '[data-testid="send"], .send-button',
    searchBox: '[data-testid="chat-list-search"], .search-input',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * 等待 WhatsApp 加载完成
   */
  async waitForReady(): Promise<void> {
    // 等待聊天列表出现
    await this.page.waitForSelector(this.selectors.chatList, {
      timeout: 30_000,
    });
    await this.waitForGCEngine();
    this.log("info", "WhatsApp page ready");
  }

  /**
   * 搜索聊天
   */
  async searchChat(keyword: string): Promise<void> {
    const searchBox = this.page.locator(this.selectors.searchBox).first();
    await searchBox.fill(keyword);
    await this.page.waitForTimeout(1000); // 等待搜索结果
    this.log("info", `Searched for: ${keyword}`);
  }

  /**
   * 打开指定聊天
   */
  async openChat(chatName: string): Promise<void> {
    await this.page.click(`text=${chatName}`);
    await this.page.waitForSelector(this.selectors.messageList, {
      timeout: 10_000,
    });
    this.log("info", `Opened chat: ${chatName}`);
  }

  /**
   * 检查是否已登录
   */
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

  /**
   * 获取聊天列表中的聊天数量
   */
  async getChatCount(): Promise<number> {
    const chats = this.page.locator(`${this.selectors.chatList} > div`);
    return chats.count();
  }
}
