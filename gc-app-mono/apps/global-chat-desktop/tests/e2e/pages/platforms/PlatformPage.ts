// apps/global-chat-desktop/tests/e2e/pages/platforms/PlatformPage.ts
import { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * 平台枚举（简化版，避免依赖 @gc/model）
 */
export enum EPlatform {
  Telegram = "telegram",
  WhatsApp = "whatsapp",
  Instagram = "instagram",
  Messenger = "messenger",
  Facebook = "facebook",
  TikTok = "tiktok",
  LinkedIn = "linkedin",
  Teams = "teams",
}

/**
 * 消息类型
 */
export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
}

/**
 * 会话类型
 */
export interface Conversation {
  id: string;
  name: string;
  lastMessage?: Message;
}

/**
 * 平台页面基类
 */
export abstract class PlatformPage extends BasePage {
  abstract readonly platform: EPlatform;

  constructor(page: Page) {
    super(page);
  }

  /**
   * 等待登录状态确认
   */
  async waitForLogin(): Promise<void> {
    // 默认实现：等待网络空闲
    await this.waitForNetworkIdle();
    this.log("info", `${this.platform} login state confirmed`);
  }

  /**
   * 等待 GCEngine 注入完成
   */
  async waitForGCEngine(): Promise<void> {
    await this.page.waitForFunction(
      () => typeof (window as unknown as { gcEngine?: unknown }).gcEngine !== "undefined",
      { timeout: 30_000 }
    );
    this.log("info", `GCEngine injected for ${this.platform}`);
  }

  /**
   * 执行注入脚本
   */
  async executeInjectScript<T>(script: string): Promise<T> {
    return this.page.evaluate(script) as Promise<T>;
  }

  /**
   * 获取消息列表
   */
  async getMessages(limit = 50): Promise<Message[]> {
    try {
      return await this.executeInjectScript<Message[]>(`
        (async () => {
          if (window.gcEngine && window.gcEngine.${this.platform}) {
            return await window.gcEngine.${this.platform}.getMessages(${limit});
          }
          return [];
        })()
      `);
    } catch (error) {
      this.log("error", `Failed to get messages: ${error}`);
      return [];
    }
  }

  /**
   * 获取会话列表
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      return await this.executeInjectScript<Conversation[]>(`
        (async () => {
          if (window.gcEngine && window.gcEngine.${this.platform}) {
            return await window.gcEngine.${this.platform}.getConversations();
          }
          return [];
        })()
      `);
    } catch (error) {
      this.log("error", `Failed to get conversations: ${error}`);
      return [];
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    try {
      await this.executeInjectScript(`
        (async () => {
          if (window.gcEngine && window.gcEngine.${this.platform}) {
            await window.gcEngine.${this.platform}.sendMessage('${chatId}', '${text}');
          }
        })()
      `);
      this.log("info", `Message sent to ${chatId}`);
      return true;
    } catch (error) {
      this.log("error", `Failed to send message: ${error}`);
      return false;
    }
  }
}
