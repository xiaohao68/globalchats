import type { WAWid } from "./wid";
import type { IWAContactModel, WAContact } from "./contact";

/**
 * WhatsApp 聊天会话 (序列化后)
 */
export interface WAChat {
  /** 聊天唯一标识 */
  id: WAWid;
  /** 最后消息时间戳 (Unix 秒) */
  t?: number;
  /** 未读消息数 */
  unreadCount: number;
  /** 是否只读 */
  isReadOnly?: boolean;
  /** 静音过期时间 */
  muteExpiration?: number;
  /** 是否自动静音 */
  isAutoMuted?: boolean;
  /** 是否非垃圾邮件 */
  notSpam?: boolean;
  /** 是否本地创建 */
  createdLocally?: boolean;
  /** 是否有未读提及 */
  hasUnreadMention?: boolean;
  /** 是否已打开过聊天 */
  hasChatBeenOpened?: boolean;
  /** 是否已打开 */
  hasOpened?: boolean;
  /** 关联的联系人信息 */
  contact?: WAContact;
}

/**
 * WhatsApp 聊天模型 (内部使用)
 */
export interface IWAChatModel {
  /** 是否为当前活动聊天 */
  active: boolean;
  /** 聊天唯一标识 */
  id: WAWid;
  /** 关联的联系人模型 */
  contact: IWAContactModel;
  /** 未读消息数 */
  unreadCount: number;
  /** 获取聊天标题 */
  title: () => string;
  /** 序列化聊天信息 */
  serialize: () => WAChat;
}

/**
 * WhatsApp Store.Chat 接口
 */
export interface IStoreChat {
  /** 获取所有聊天模型 */
  getModelsArray: () => IWAChatModel[];
  /** 根据 ID 获取聊天 */
  get: (id: string | WAWid) => IWAChatModel | undefined;
  /** 获取当前激活聊天 */
  getActive?: () => IWAChatModel | undefined;
  /** 查找聊天 */
  _find: (id: string | WAWid) => Promise<IWAChatModel>;
  findImpl: (id: string | WAWid) => Promise<IWAChatModel>;
  /** 监听事件 (change:active 事件会传递 isActive 参数) */
  on: (
    event: string,
    callback: (
      chatModel: IWAChatModel,
      isActive?: boolean,
      ...args: unknown[]
    ) => void,
  ) => void;
  /** 取消监听 */
  off: (
    event: string,
    callback: (
      chatModel: IWAChatModel,
      isActive?: boolean,
      ...args: unknown[]
    ) => void,
  ) => void;
}
