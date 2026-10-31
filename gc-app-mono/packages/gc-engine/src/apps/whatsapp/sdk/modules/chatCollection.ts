import { moduleLoader } from "./moduleLoader";
import type { IStoreChat, IWAChatModel, WAChat } from "../types";
import { createLogger } from "@gc/logger";

const logger = createLogger("preload", "chatCollection");

/**
 * 获取 Store.Chat
 */
export function getStoreChat(): IStoreChat | null {
  const collections = moduleLoader.get<{ Chat: IStoreChat }>(
    "WAWebCollections",
  );
  logger.info("getStoreChat: got collections", {
    hasCollections: !!collections,
    hasChat: !!collections?.Chat,
  });
  return collections?.Chat ?? null;
}

function isJid(value: string): boolean {
  return /^\d{5,}$/.test(value);
}

function resolveChatName(model: IWAChatModel, chat: WAChat): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = model as any;
  const c = m.contact;

  const candidates: Array<string | undefined | null> = [
    typeof model.title === "function" ? model.title() : undefined,
    m.formattedTitle,
    m.name,
    c?.pushname,
    c?.name,
    c?.shortName,
    c?.verifiedName,
    c?.notifyName,
  ];

  const jidUser = chat.id._serialized.split("@")[0] || "";

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.length > 0 &&
      candidate !== jidUser &&
      candidate !== chat.id._serialized &&
      !isJid(candidate)
    ) {
      return candidate;
    }
  }

  return "";
}

/**
 * 获取所有聊天列表
 */
export function getAllChats(): WAChat[] {
  const storeChat = getStoreChat();
  if (!storeChat) {
    logger.warn("getAllChats: storeChat is null");
    return [];
  }

  const chatModels = storeChat.getModelsArray();
  logger.info("getAllChats: got chatModels", { count: chatModels?.length ?? 0 });
  return chatModels.map((model) => {
    const chat = model.serialize();
    const resolvedName = resolveChatName(model, chat);
    if (resolvedName) {
      chat.contact = { ...chat.contact, name: resolvedName } as typeof chat.contact;
    }
    return chat;
  });
}

/**
 * 获取当前活动聊天
 */
export function getActiveChat(): IWAChatModel | null {
  const storeChat = getStoreChat();
  if (!storeChat) {
    return null;
  }

  if (storeChat.getActive) {
    return storeChat.getActive() ?? null;
  }

  const chats = storeChat.getModelsArray();
  return chats.find((chat) => chat.active) ?? null;
}

/**
 * 根据 ID 获取聊天
 */
export function getChatById(chatId: string): IWAChatModel | undefined {
  const storeChat = getStoreChat();
  return storeChat?.get(chatId);
}

/**
 * 初始化 Chat 相关模块
 */
export function initChatModules(): {
  storeChat: IStoreChat | null;
} {
  return {
    storeChat: getStoreChat(),
  };
}
