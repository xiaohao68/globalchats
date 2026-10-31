/**
 * 当前登录用户的信息
 */
export interface WAUserInfo {
  /** 用户唯一标识 (WAWid._serialized) */
  id: string;
  /** 用户昵称/显示名称 */
  nickname: string;
  /** 头像 URL (可能为空) */
  avatar: string;
  /** 手机号 */
  phone: string;
  /** 是否为群组 (始终为 false) */
  isGroup: false;
  /** 备注名 */
  remarkName?: string;
}
