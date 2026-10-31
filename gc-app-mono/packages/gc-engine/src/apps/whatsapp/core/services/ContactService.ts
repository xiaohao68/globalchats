import type { IWAWebAdapter } from "../ports/outbound/IWAWebAdapter";
import type { WAContact } from "../../sdk/types";

/**
 * 联系人服务
 * 负责管理联系人列表
 */
export class ContactService {
  constructor(private readonly waAdapter: IWAWebAdapter) {}

  getAllContacts(type?: "group" | "private"): WAContact[] {
    return this.waAdapter.getAllContacts(type);
  }

  getContactById(contactId: string): WAContact | null {
    return this.waAdapter.getContactById(contactId);
  }
}
