import { ModuleLoadError } from "../types";

/**
 * WhatsApp Web 模块加载器
 * 使用 window.require() 加载 WhatsApp Web 内部模块
 */
export class ModuleLoader {
  private cache = new Map<string, unknown>();

  /**
   * 获取指定模块
   * @param moduleName WhatsApp Web 内部模块名
   * @returns 模块实例或 null (模块不存在时)
   */
  get<T>(moduleName: string): T | null {
    if (this.cache.has(moduleName)) {
      return this.cache.get(moduleName) as T;
    }

    try {
      // @ts-expect-error window.require 是 WhatsApp Web 注入的
      const module = window.require(moduleName);
      if (module) {
        this.cache.set(moduleName, module);
        return module as T;
      }
      return null;
    } catch (error) {
      console.warn(`[WhatsAppSDK] Module ${moduleName} not available:`, error);
      return null;
    }
  }

  /**
   * 获取指定模块 (必需)
   * @param moduleName WhatsApp Web 内部模块名
   * @returns 模块实例
   * @throws {ModuleLoadError} 当模块不存在时
   */
  getRequired<T>(moduleName: string): T {
    const module = this.get<T>(moduleName);
    if (!module) {
      throw new ModuleLoadError(moduleName);
    }
    return module;
  }

  /**
   * 检查模块是否可用
   */
  has(moduleName: string): boolean {
    if (this.cache.has(moduleName)) {
      return true;
    }
    return this.get(moduleName) !== null;
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * 全局模块加载器实例
 */
export const moduleLoader = new ModuleLoader();
