import { moduleLoader } from "./moduleLoader";
import type { IWAChatModel } from "../types";

/**
 * 发送消息模块接口
 */
export interface ISendMessageModule {
  sendTextMsgToChat: (chat: IWAChatModel, text: string) => void;
}

/**
 * 获取发送消息模块
 */
export function getSendMessageModule(): ISendMessageModule | null {
  return moduleLoader.get<ISendMessageModule>("WAWebSendTextMsgChatAction");
}

/**
 * 发送文本消息到聊天
 * @param chat 聊天模型
 * @param text 消息文本
 * @throws Error 如果发送模块不可用
 */
export function sendTextMessage(chat: IWAChatModel, text: string): void {
  const sendModule = getSendMessageModule();
  if (!sendModule) {
    throw new Error("Send message module not available");
  }
  sendModule.sendTextMsgToChat(chat, text);
}
