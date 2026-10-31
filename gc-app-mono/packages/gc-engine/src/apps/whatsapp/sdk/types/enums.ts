/**
 * WhatsApp 连接状态
 */
export enum EWhatsappWAState {
  /** 冲突 (其他设备登录) */
  CONFLICT = "CONFLICT",
  /** 已连接 */
  CONNECTED = "CONNECTED",
  /** 版本过旧 */
  DEPRECATED_VERSION = "DEPRECATED_VERSION",
  /** 正在打开 */
  OPENING = "OPENING",
  /** 正在配对 */
  PAIRING = "PAIRING",
  /** 代理被阻止 */
  PROXYBLOCK = "PROXYBLOCK",
  /** SMB 服务条款阻止 */
  SMB_TOS_BLOCK = "SMB_TOS_BLOCK",
  /** 超时 */
  TIMEOUT = "TIMEOUT",
  /** 服务条款阻止 */
  TOS_BLOCK = "TOS_BLOCK",
  /** 未启动 */
  UNLAUNCHED = "UNLAUNCHED",
  /** 未配对 */
  UNPAIRED = "UNPAIRED",
  /** 未配对空闲 */
  UNPAIRED_IDLE = "UNPAIRED_IDLE",
}

/**
 * 消息确认状态
 */
export enum EWhatsappMessageAck {
  /** 错误 */
  ACK_ERROR = -1,
  /** 待发送 */
  ACK_PENDING = 0,
  /** 已发送到服务器 */
  ACK_SERVER = 1,
  /** 已送达设备 */
  ACK_DEVICE = 2,
  /** 已读 */
  ACK_READ = 3,
  /** 已播放 (语音消息) */
  ACK_PLAYED = 4,
}

/**
 * 聊天类型
 */
export enum EWhatsappChatTypes {
  /** 个人聊天 */
  SOLO = "solo",
  /** 群组聊天 */
  GROUP = "group",
  /** 未知类型 */
  UNKNOWN = "unknown",
}

/**
 * 消息类型
 */
export enum EWhatsappMessageTypes {
  /** 文本消息 */
  TEXT = "chat",
  /** 音频消息 */
  AUDIO = "audio",
  /** 语音消息 */
  VOICE = "ptt",
  /** 图片消息 */
  IMAGE = "image",
  /** 视频消息 */
  VIDEO = "video",
  /** 文档消息 */
  DOCUMENT = "document",
  /** 贴纸消息 */
  STICKER = "sticker",
  /** 位置消息 */
  LOCATION = "location",
  /** 名片消息 */
  CONTACT_CARD = "vcard",
  /** 多名片消息 */
  CONTACT_CARD_MULTI = "multi_vcard",
  /** 撤回消息 */
  REVOKED = "revoked",
  /** 投票创建 */
  POLL_CREATION = "poll_creation",
  /** 未知类型 */
  UNKNOWN = "unknown",
}

/**
 * SDK 登录状态
 */
export enum EWhatsappLoginStatus {
  /** 未登录 (显示 QR 码) */
  NOT_LOGGED_IN = "NOT_LOGGED_IN",
  /** 正在同步 */
  SYNCING = "SYNCING",
  /** 已登录 */
  LOGGED_IN = "LOGGED_IN",
  /** 已登出 */
  LOGGED_OUT = "LOGGED_OUT",
}

/**
 * WebSocket 连接状态
 */
export type SocketState = "OPENING" | "PAIRING" | "CONNECTED" | "DISCONNECTED";
