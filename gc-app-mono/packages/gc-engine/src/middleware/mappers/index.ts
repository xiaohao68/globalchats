import type { IThirdAppUserInfo } from "@gc/model";
import type {
  MiddlewareContact,
  MiddlewareDomainEvent,
  MiddlewareMessage,
  MiddlewareUser,
  TimestampMs,
} from "../types.ts";

export function toMiddlewareUser(
  user: IThirdAppUserInfo,
  now: TimestampMs,
): MiddlewareUser {
  return {
    ...user,
    version: 1,
    updatedAt: now,
  };
}

export function toMiddlewareContact(
  contact: {
    contactId: string;
    nickname: string;
    avatar?: string;
    remarkName?: string;
    phone?: string;
  },
  now: TimestampMs,
): MiddlewareContact {
  return {
    ...contact,
    version: 1,
    updatedAt: now,
  };
}

export function toMiddlewareMessage(
  message: {
    messageId: string;
    chatId: string;
    senderId: string;
    content: string;
    timestamp: TimestampMs;
    messageType: string;
  },
  now: TimestampMs,
): MiddlewareMessage {
  return {
    ...message,
    version: 1,
    updatedAt: now,
  };
}

export function toMiddlewareEvent(
  event: {
    eventId?: string;
    type: string;
    occurredAt: TimestampMs;
    payload?: unknown;
  },
  now: TimestampMs,
): MiddlewareDomainEvent {
  return {
    ...event,
    version: 1,
    updatedAt: now,
  };
}
