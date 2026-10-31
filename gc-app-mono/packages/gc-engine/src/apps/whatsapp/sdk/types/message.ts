import type { EWhatsappMessageAck } from "./enums";

/**
 * 消息唯一标识键
 */
export interface WAMessageKey {
  /** 是否为自己发送 */
  fromMe: boolean;
  /** 远程会话 ID (WAWid._serialized) */
  remote: string;
  /** 消息 ID */
  id: string;
  /** 序列化格式 */
  _serialized: string;
}

/**
 * WhatsApp 消息
 */
export interface WAMessage {
  /** 消息唯一标识 */
  id: WAMessageKey;
  /** 消息类型: 'chat' (文本) | 其他类型 */
  type: string;
  /** 消息内容 (文本消息时) */
  body: string;
  /** 发送时间戳 (Unix 秒) */
  t: number;
  /** 客户端接收时间戳 (毫秒) */
  clientReceivedTsMillis?: number;
  /** 发送者 ID */
  from: string;
  /** 接收者 ID */
  to: string;
  /** 实际作者 ID (群组中区分实际发送者) */
  author?: string;
  /** 是否为新消息 */
  isNewMsg: boolean;
  /** 消息确认状态 */
  ack: EWhatsappMessageAck;
  /** 显示名称 */
  notifyName?: string;
  /** 是否已读 */
  viewed: boolean;
  /** 是否收藏 */
  star?: boolean;
  /** 是否为转发消息 */
  isForwarded?: boolean;
  /** 转发次数 */
  forwardsCount?: number;
  /** 被 @ 提及的 JID 列表 */
  mentionedJidList?: string[];
}

/**
 * WhatsApp 历史消息 (简化版)
 */
export interface WAHistoryMessage {
  /** 消息唯一标识 */
  id: WAMessageKey;
  /** 消息内容 */
  body: string;
  /** 消息类型 */
  type: string;
  /** 发送时间戳 (Unix 秒) */
  t: number;
  /** 发送者 ID */
  from: string;
  /** 接收者 ID */
  to: string;
}

/**
 * WhatsApp Store.Msg 接口
 */
export interface IStoreMsg {
  /** 监听新消息 */
  on: (event: "add", callback: (msg: WAMessage) => void) => void;
  /** 取消监听 */
  off: (event: "add", callback: (msg: WAMessage) => void) => void;
}
