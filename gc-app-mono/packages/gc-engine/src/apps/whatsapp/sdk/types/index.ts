// Enums
export {
  EWhatsappWAState,
  EWhatsappMessageAck,
  EWhatsappChatTypes,
  EWhatsappMessageTypes,
  EWhatsappLoginStatus,
} from "./enums";

// SocketState type
export type { SocketState } from "./enums";

// WAWid
export type { WAWid } from "./wid";
export { isValidWAWid } from "./wid";

// Contact
export type {
  WAContact,
  IWAContactModel,
  IWAContactMethods,
  IStoreContact,
} from "./contact";

// Chat
export type { WAChat, IWAChatModel, IStoreChat } from "./chat";

// Message
export type {
  WAMessageKey,
  WAMessage,
  WAHistoryMessage,
  IStoreMsg,
} from "./message";

// User
export type { WAUserInfo } from "./user";

// Errors
export {
  WhatsAppSDKError,
  ModuleLoadError,
  NotLoggedInError,
  MessageSendError,
  ChatNotFoundError,
} from "./errors";
