import type { ChatService } from "../types";
import { realChatService } from "./realChatService";

// 直接使用 realChatService
export const chatService: ChatService = realChatService;

export { realChatService };

// 导出 SyncEngine
export { syncEngine } from "./SyncEngine";
export type { SyncEngine } from "./SyncEngine";

export { notificationService } from "./notificationService";
