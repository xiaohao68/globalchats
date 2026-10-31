// 核心模块加载器
export { moduleLoader, ModuleLoader } from "./moduleLoader";

// 认证模块
export {
  initAuthStore,
  getAppState,
  getAuthCmd,
  getAuthConn,
  isLoggedIn,
  type IAuthStoreAppState,
  type IAuthStoreCmd,
  type IAuthStoreConn,
} from "./authStore";

// 联系人模块
export {
  getStoreContact,
  getContactMethods,
  getAllContacts,
  findContactById,
  initContactModules,
} from "./contactCollection";

// 聊天模块
export {
  getStoreChat,
  getActiveChat,
  getAllChats,
  getChatById,
  initChatModules,
} from "./chatCollection";

// 头像模块
export {
  getProfilePic,
  getAvatarUrl,
  type ProfilePicInfo,
  type IProfilePic,
} from "./profile";

// 消息发送模块
export {
  getSendMessageModule,
  sendTextMessage,
  type ISendMessageModule,
} from "./sendMessage";

// 消息集合模块
export {
  getStoreMsg,
  onNewMessage,
  getMessagesByChatId,
  initMessageModules,
} from "./messageCollection";
