//-------------------------------------------------------------------------------------
// query
//-------------------------------------------------------------------------------------
export { ModelsByScene } from "./query/ModelsByScene.graphql";
export { Translate } from "./query/Translate.graphql";
export { GetAccounts } from "./query/GetAccounts.graphql";
export { GetNewMessages } from "./query/GetNewMessages.graphql";
export { GetContacts } from "./query/GetContacts.graphql";
export { GetChatMessages } from "./query/GetChatMessages.graphql";
export { GetUserConfig } from "./query/GetUserConfig.graphql";
export { GetConversations } from "./query/GetConversations.graphql";
export { GetAttachment } from "./query/GetAttachment.graphql";
export { Proxies } from "./query/Proxies.graphql";

//-------------------------------------------------------------------------------------
// mutation
//-------------------------------------------------------------------------------------
export { SyncAccount } from "./mutation/SyncAccount.graphql";
export { SendMessage } from "./mutation/SendMessage.graphql";
export { SyncContacts } from "./mutation/SyncContacts.graphql";
export { SyncChatMessages } from "./mutation/SyncChatMessages.graphql";
export { SyncUserConfig } from "./mutation/SyncUserConfig.graphql";
export { ImLogin } from "./mutation/ImLogin.graphql";
export { Login } from "./mutation/Login.graphql";
