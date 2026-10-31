import type { WAContact } from "../../../sdk/types";
import type { ChatBinding } from "./ChatBinding";

/**
 * 联系人模块绑定
 * 封装与 WhatsApp Web 联系人相关的内部模块交互
 */
export class ContactBinding {
  constructor(private chatBinding: ChatBinding) {}

  /**
   * 获取所有联系人
   * 从聊天列表中提取联系人信息
   */
  getAllContacts(type?: "group" | "private"): WAContact[] {
    const chats = this.chatBinding.getAllChats();
    const contacts = chats
      .map((chat) => chat.contact)
      .filter((contact): contact is WAContact => contact !== undefined);

    if (!type) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const isGroup = contact.id.server === "g.us";
      return type === "group" ? isGroup : !isGroup;
    });
  }

  /**
   * 根据 ID 获取联系人
   */
  getContactById(contactId: string): WAContact | null {
    const contacts = this.getAllContacts();
    return contacts.find((c) => c.id.user === contactId) ?? null;
  }
}
