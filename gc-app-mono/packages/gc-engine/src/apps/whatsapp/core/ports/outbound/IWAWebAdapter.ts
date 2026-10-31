import type { WAChat, WAContact, WAMessage, WAUserInfo, SocketState } from "../../../sdk/types";

/**
 * WhatsApp Web API 适配器接口
 * 定义与 WhatsApp Web 内部模块交互的所有方法
 */
export interface IWAWebAdapter {
  // ========== 生命周期 ==========
  /**
   * 等待 WhatsApp Web 应用就绪
   */
  waitForReady(): Promise<void>;

  /**
   * 初始化适配器，加载必要模块
   */
  initialize(): void;

  /**
   * 销毁适配器，清理资源
   */
  destroy(): void;

  // ========== 认证 ==========
  /**
   * 检查是否已登录
   * 使用 hasSynced 而非 stream 状态（更可靠）
   */
  isLoggedIn(): boolean;

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): Promise<WAUserInfo | null>;

  /**
   * 监听登录状态变化
   * @returns 清理函数
   */
  onLoginStatusChange(callback: (isLoggedIn: boolean) => void): () => void;

  /**
   * 监听登出事件
   * @returns 清理函数
   */
  onLogout(callback: () => void): () => void;

  /**
   * 监听 Socket 连接状态
   * @returns 清理函数
   */
  onSocketStateChange(callback: (state: SocketState) => void): () => void;

  // ========== 聊天 ==========
  /**
   * 获取所有聊天列表
   */
  getAllChats(): WAChat[];

  /**
   * 获取当前激活的聊天
   */
  getActiveChat(): WAChat | null;

  /**
   * 根据 ID 获取聊天
   */
  getChatById(chatId: string): WAChat | null;

  /**
   * 监听聊天切换事件
   * @returns 清理函数
   */
  onChatChange(callback: (chat: WAChat) => void): () => void;

  /**
   * 监听聊天关闭事件
   * @returns 清理函数
   */
  onChatClose(callback: () => void): () => void;

  // ========== 消息 ==========
  /**
   * 监听新消息
   * @returns 清理函数
   */
  onNewMessage(callback: (message: WAMessage) => void): () => void;

  /**
   * 获取指定聊天的消息历史
   */
  getMessagesByChat(chatId: string): WAMessage[];

  /**
   * 发送文本消息
   */
  sendTextMessage(chatId: string, text: string): Promise<void>;

  // ========== 联系人 ==========
  /**
   * 获取所有联系人
   */
  getAllContacts(type?: "group" | "private"): WAContact[];

  /**
   * 根据 ID 获取联系人
   */
  getContactById(contactId: string): WAContact | null;
}
