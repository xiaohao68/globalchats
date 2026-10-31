import { WhatsAppSDK } from "./WhatsappSDK";

// 导出类型
export * from "./types";

// 导出工具函数
export * from "./utils";

// 导出模块加载器
export { moduleLoader, ModuleLoader } from "./modules/moduleLoader";

// 导出事件处理器
export * from "./events";

// 创建并导出 SDK 实例
export const whatsappSDK = new WhatsAppSDK();

// 导出 SDK 类
export { WhatsAppSDK };
