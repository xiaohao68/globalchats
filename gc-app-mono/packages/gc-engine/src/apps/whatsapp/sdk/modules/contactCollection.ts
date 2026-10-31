import { moduleLoader } from "./moduleLoader";
import type {
  IStoreContact,
  IWAContactMethods,
  WAContact,
  IStoreChat,
} from "../types";
import { isGroupId } from "../utils";

/**
 * 获取 Store.Contact
 */
export function getStoreContact(): IStoreContact | null {
  const collections = moduleLoader.get<{ Contact: IStoreContact }>(
    "WAWebCollections",
  );
  return collections?.Contact ?? null;
}

/**
 * 获取 ContactMethods
 */
export function getContactMethods(): IWAContactMethods | null {
  return moduleLoader.get<IWAContactMethods>("WAWebContactGetters");
}

/**
 * 获取联系人列表（从聊天中提取）
 */
export function getAllContacts(type?: "group" | "private"): WAContact[] {
  const collections = moduleLoader.get<{ Chat: IStoreChat }>(
    "WAWebCollections",
  );
  if (!collections?.Chat) {
    return [];
  }

  const chatModels = collections.Chat.getModelsArray();
  const contacts = chatModels
    .map((chat) => chat.contact?.serialize?.())
    .filter((contact): contact is WAContact => contact !== undefined);

  if (!type) {
    return contacts;
  }

  return contacts.filter((contact) => {
    const isGroup = isGroupId(contact.id._serialized);
    return type === "group" ? isGroup : !isGroup;
  });
}

/**
 * 根据用户 ID 获取联系人
 * @param userId 用户 ID（支持完整序列化 ID 或纯用户 ID）
 */
export function findContactById(userId: string): WAContact | undefined {
  const contacts = getAllContacts();
  return contacts.find(
    (c) => c.id._serialized === userId || c.id.user === userId,
  );
}

/**
 * 初始化 Contact 相关模块
 */
export function initContactModules(): {
  storeContact: IStoreContact | null;
  contactMethods: IWAContactMethods | null;
} {
  return {
    storeContact: getStoreContact(),
    contactMethods: getContactMethods(),
  };
}
