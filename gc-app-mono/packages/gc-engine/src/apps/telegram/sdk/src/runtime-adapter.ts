export function log1(...args: any[]) {
  console.log(
    "%c Recv ",
    "background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
    ...args,
  );
}

export function logWarning(...args: any[]) {
  console.log(
    "%c Warning ",
    "background: #FF9800; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
    ...args,
  );
}

export function logError(...args: any[]) {
  console.log(
    "%c Error ",
    "background: #f44336; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
    ...args,
  );
}

const isWebpackGlobalChunk = (obj: any) => {
  return Array.isArray(obj) && obj.hasOwnProperty("push");
};

// Extend Window interface to include webpack properties
declare global {
  interface Window {
    rrr?: any;
    [key: string]: any;
  }
}

class RuntimeAdapter {
  private runtime: any;
  private webpackRequire: any;
  private webpackVersion: number | undefined;

  async init(getRuntime?: (window: Window) => any) {
    if (isWebpackGlobalChunk(window.rrr)) return;

    const keys = Object.keys(window);
    const webpack5Key = keys.find((v) => v.startsWith("webpackChunk"));
    const webpack4Key = "webpackJsonp";
    const runtime =
      getRuntime?.(window) ||
      (webpack5Key ? window[webpack5Key] : undefined) ||
      window[webpack4Key];
    this.runtime = runtime;
    this.webpackVersion = webpack5Key ? 5 : webpack4Key ? 4 : undefined;

    if (!isWebpackGlobalChunk(this.runtime)) {
      log1("无法找到有效的 webpack 运行时");
      return;
    }

    const webpackRequire = await this.extractWebpackRequire();
    this.webpackRequire = webpackRequire;
    window.rrr = webpackRequire;
  }

  async extractWebpackRequire(maxRetries = 3) {
    const webpackGlobalChunk = this.runtime;
    let webpackRequire: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      webpackGlobalChunk.push([
        [Math.random()],
        {},
        (requireFunction: any) => {
          webpackRequire = requireFunction;
        },
      ]);

      if (webpackRequire) {
        return webpackRequire;
      }

      logWarning(
        `提取 webpack require 函数失败 (尝试 ${attempt}/${maxRetries})`,
      );

      if (attempt === maxRetries) {
        logError(`提取 webpack require 函数失败：达到最大重试次数`);
        return;
      }

      const waitTime = attempt * attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    return webpackRequire;
  }

  findModule(conditionFunc: (moduleId: number, moduleFactory: any) => boolean) {
    if (!this.webpackRequire) {
      logWarning("webpack require 函数未初始化，无法提取模块");
      return;
    }

    for (const [moduleIdStr, moduleFactory] of Object.entries(
      this.webpackRequire.m,
    )) {
      const moduleId = Number(moduleIdStr);
      if (conditionFunc(moduleId, moduleFactory)) {
        return {
          moduleId,
          moduleInstance: this.webpackRequire(moduleId),
        };
      }
    }

    logWarning("未找到匹配的模块");
  }

  findExports(
    moduleId: number,
    conditionFunc: (moduleFactory: any) => boolean,
  ) {
    if (!this.webpackRequire) {
      logWarning("webpack require 函数未初始化，无法提取模块");
      return;
    }

    const module1 = this.webpackRequire(moduleId);
    if (!module1) {
      logWarning(`模块 ID ${moduleId} 不存在`);
      return;
    }

    for (const [exportKey, exportFactory] of Object.entries(module1)) {
      if (conditionFunc(exportFactory)) {
        return exportKey;
      }
    }

    logWarning("未找到匹配的模块");
  }
}

const runtimeAdapter = new RuntimeAdapter();
window.ra = runtimeAdapter;

export { runtimeAdapter };
