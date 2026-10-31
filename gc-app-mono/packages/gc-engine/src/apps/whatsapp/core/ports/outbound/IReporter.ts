import type {
  MiddlewareMessage,
  MiddlewareConversation,
  MiddlewareContact,
  MiddlewareStatusEvent,
  ReportResult,
} from "../../../../../middleware/types";
import type { IThirdAppUserInfo } from "@gc/model";

/**
 * 上报适配器接口
 * 定义数据上报的所有方法
 */
export interface IReporter {
  // ========== 状态上报 ==========
  /**
   * 上报登录状态变化
   */
  reportStatusChange(event: MiddlewareStatusEvent): Promise<ReportResult>;

  /**
   * 上报当前用户信息
   */
  reportCurrentUser(user: IThirdAppUserInfo): Promise<ReportResult>;

  // ========== 数据上报 ==========
  /**
   * 上报会话列表
   */
  reportConversations(
    conversations: MiddlewareConversation[],
  ): Promise<ReportResult>;

  /**
   * 上报联系人列表
   */
  reportContacts(contacts: MiddlewareContact[]): Promise<ReportResult>;

  /**
   * 上报新消息（实时）
   */
  reportMessages(messages: MiddlewareMessage[]): Promise<ReportResult>;

  /**
   * 上报历史消息（批量）
   */
  reportHistory(
    chatId: string,
    messages: MiddlewareMessage[],
  ): Promise<ReportResult>;

  // ========== 控制 ==========
  /**
   * 暂停上报
   */
  pause(): void;

  /**
   * 恢复上报
   */
  resume(): void;

  /**
   * 是否正在上报
   */
  isReporting(): boolean;
}
