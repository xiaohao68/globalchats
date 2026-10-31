/**
 * WhatsApp Web 内部模块加载器
 * 参考 whatsapp-hijack 的直接 require 方式
 */
export class ModuleLoader {
  private cache = new Map<string, unknown>();

  /**
   * 获取模块（带缓存）
   */
  get<T>(moduleName: string): T | null {
    if (this.cache.has(moduleName)) {
      return this.cache.get(moduleName) as T;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const module = (window as any).require(moduleName);
      if (module) {
        this.cache.set(moduleName, module);
        return module as T;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取必需模块（不存在则抛异常）
   */
  getRequired<T>(moduleName: string): T {
    const module = this.get<T>(moduleName);
    if (!module) {
      throw new Error(`Required module not found: ${moduleName}`);
    }
    return module;
  }

  /**
   * 检查模块是否可用
   */
  has(moduleName: string): boolean {
    return this.get(moduleName) !== null;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}
