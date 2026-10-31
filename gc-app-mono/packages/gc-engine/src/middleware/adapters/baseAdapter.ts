import type { IThirdAppUserInfo } from "@gc/model";
import type {
  MiddlewareContact,
  MiddlewareConversation,
  MiddlewareMessage,
  MiddlewareUser,
} from "../types.ts";

export interface BaseAdapter<
  TUser = unknown,
  TContact = unknown,
  TConversation = unknown,
  TMessage = unknown,
> {
  toMiddlewareUser(user: TUser): MiddlewareUser;
  toMiddlewareContact(contact: TContact): MiddlewareContact;
  toMiddlewareConversation(conversation: TConversation): MiddlewareConversation;
  toMiddlewareMessage(message: TMessage): MiddlewareMessage;
  toThirdAppUserInfo(user: TUser): IThirdAppUserInfo;
}
