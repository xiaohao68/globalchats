import type { IWAWebAdapter } from "../ports/outbound/IWAWebAdapter";
import type { IEventBus } from "../ports/outbound/IEventBus";
import type { WAChat } from "../../sdk/types";

/**
 * 聊天服务
 * 负责管理聊天列表和聊天事件
 */
export class ChatService {
  constructor(
    private readonly waAdapter: IWAWebAdapter,
    private readonly eventBus: IEventBus,
  ) {}

  /**
   * 初始化聊天监听
   */
  initialize(): () => void {
    const cleanups: (() => void)[] = [];

    // 监听聊天切换
    cleanups.push(
      this.waAdapter.onChatChange((chat) => {
        this.eventBus.emit({
          type: "chat:change",
          timestamp: Date.now(),
          payload: { chat },
        });
      }),
    );

    // 监听聊天关闭
    cleanups.push(
      this.waAdapter.onChatClose(() => {
        this.eventBus.emit({
          type: "chat:close",
          timestamp: Date.now(),
          payload: undefined,
        });
      }),
    );

    return () => cleanups.forEach((fn) => fn());
  }

  getAllChats(): WAChat[] {
    return this.waAdapter.getAllChats();
  }

  getActiveChat(): WAChat | null {
    return this.waAdapter.getActiveChat();
  }

  getChatById(chatId: string): WAChat | null {
    return this.waAdapter.getChatById(chatId);
  }
}
