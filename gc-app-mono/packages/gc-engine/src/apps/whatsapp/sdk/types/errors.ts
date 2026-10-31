/**
 * SDK 错误基类
 */
export class WhatsAppSDKError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean,
  ) {
    super(message);
    this.name = "WhatsAppSDKError";
  }
}

/**
 * 模块加载失败错误
 */
export class ModuleLoadError extends WhatsAppSDKError {
  constructor(moduleName: string) {
    super(
      `Failed to load WhatsApp module: ${moduleName}`,
      "MODULE_LOAD_ERROR",
      false,
    );
    this.name = "ModuleLoadError";
  }
}

/**
 * 未登录错误
 */
export class NotLoggedInError extends WhatsAppSDKError {
  constructor() {
    super("User is not logged in", "NOT_LOGGED_IN", true);
    this.name = "NotLoggedInError";
  }
}

/**
 * 消息发送失败错误
 */
export class MessageSendError extends WhatsAppSDKError {
  constructor(reason: string) {
    super(`Failed to send message: ${reason}`, "MESSAGE_SEND_ERROR", true);
    this.name = "MessageSendError";
  }
}

/**
 * 聊天不存在错误
 */
export class ChatNotFoundError extends WhatsAppSDKError {
  constructor(chatId: string) {
    super(`Chat not found: ${chatId}`, "CHAT_NOT_FOUND", true);
    this.name = "ChatNotFoundError";
  }
}
