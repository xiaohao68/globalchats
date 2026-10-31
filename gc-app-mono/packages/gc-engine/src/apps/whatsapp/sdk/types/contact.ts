import type { WAWid } from "./wid";

/**
 * WhatsApp 联系人信息 (序列化后)
 */
export interface WAContact {
  /** 联系人唯一标识 */
  id: WAWid;
  /** 显示名称 */
  name: string;
  /** 简短名称 */
  shortName?: string;
  /** 联系人类型: "in" (已保存) | "out" (未保存) */
  type?: string;
  /** 手机号 (群组时为 undefined) */
  phone?: string;
  /** 头像 URL */
  avatar?: string;
  /** 是否为群组 */
  isGroup: boolean;
  /** 群成员数 (仅群组) */
  memberCount?: number;
  /** 是否为商业账号 */
  isBusiness?: boolean;
  /** 是否为企业账号 */
  isEnterprise?: boolean;
}

/**
 * WhatsApp 联系人模型 (内部使用)
 */
export interface IWAContactModel {
  /** 联系人唯一标识 */
  id: WAWid;
  /** 序列化联系人信息 */
  serialize: () => WAContact;
}

/**
 * WhatsApp 联系人方法集合 (Store.ContactMethods)
 */
export interface IWAContactMethods {
  /** 获取联系人头部名称 */
  getHeader: (contact: IWAContactModel) => string;
  /** 获取联系人 ID */
  getId: (contact: IWAContactModel) => WAWid;
  /** 是否为广播 */
  getIsBroadcast: (contact: IWAContactModel) => boolean;
  /** 是否为商业账号 */
  getIsBusiness: (contact: IWAContactModel) => boolean;
  /** 是否为企业账号 */
  getIsEnterprise: (contact: IWAContactModel) => boolean;
  /** 是否为群组 */
  getIsGroup: (contact: IWAContactModel) => boolean;
  /** 是否为当前用户 */
  getIsMe: (contact: IWAContactModel) => boolean;
  /** 是否为我的联系人 */
  getIsMyContact: (contact: IWAContactModel) => boolean;
  /** 是否为普通用户 */
  getIsUser: (contact: IWAContactModel) => boolean;
  /** 是否为 WhatsApp 联系人 */
  getIsWAContact: (contact: IWAContactModel) => boolean;
  /** 获取提及名称 */
  getMentionName: (contact: IWAContactModel) => string;
  /** 获取名称 */
  getName: (contact: IWAContactModel) => string;
  /** 获取简短名称 */
  getShortName: (contact: IWAContactModel) => string;
  /** 获取用户 ID */
  getUserid: (contact: IWAContactModel) => string;
}

/**
 * WhatsApp Store.Contact 接口
 */
export interface IStoreContact {
  /** 序列化所有联系人 */
  serialize: () => WAContact[];
  /** 获取群组联系人 */
  getGroupContacts: () => IWAContactModel[];
  /** 获取当前用户联系人 */
  getMeContact: () => IWAContactModel;
  /** 获取当前用户 LID 联系人 */
  getMeLidContact: () => IWAContactModel;
  /** 获取所有联系人模型 */
  getModelsArray: () => IWAContactModel[];
}
