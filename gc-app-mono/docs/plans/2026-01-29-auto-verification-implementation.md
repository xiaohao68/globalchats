# 自动化验证架构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建统一日志系统 + Playwright UI 测试 + CLI 验证工具，让 Claude 能够自动运行和验证应用

**Architecture:** 三层验证架构 - Layer 1 统一日志系统收集所有日志到文件，Layer 2 Playwright 测试前端 UI，Layer 3 CLI 工具提供统一接口查询日志和运行测试

**Tech Stack:** @tauri-apps/plugin-log, Playwright, Vitest, Node.js CLI

---

## Phase 1: 统一日志系统

### Task 1.1: 创建 @gc/logger 包基础结构

**Files:**
- Create: `packages/logger/package.json`
- Create: `packages/logger/tsconfig.json`
- Create: `packages/logger/src/index.ts`

**Step 1: 创建 package.json**

```json
{
  "name": "@gc/logger",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tauri-apps/plugin-log": "^2.7.1"
  },
  "devDependencies": {
    "@gc/typescript-config": "workspace:*"
  },
  "peerDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
{
  "extends": "@gc/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: 创建 src/index.ts 基础导出**

```typescript
export * from "./logger";
export * from "./types";
```

**Step 4: 运行 bun install 安装依赖**

Run: `bun install`
Expected: 成功安装依赖

---

### Task 1.2: 实现 Logger 核心类型

**Files:**
- Create: `packages/logger/src/types.ts`

**Step 1: 创建类型定义**

```typescript
export type LogSource =
  | "main"
  | "telegram"
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "teams"
  | "aggregated-chat"
  | "preload"
  | "unknown";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: number;
  level: LogLevel;
  source: LogSource;
  category?: string;
  message: string;
  data?: Record<string, unknown>;
  file?: string;
  line?: number;
}

export interface LoggerOptions {
  source: LogSource;
  category?: string;
}

export interface ILogger {
  trace(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}
```

---

### Task 1.3: 实现 Logger 核心类

**Files:**
- Create: `packages/logger/src/logger.ts`

**Step 1: 实现 Logger 类**

```typescript
import {
  trace as tauriTrace,
  debug as tauriDebug,
  info as tauriInfo,
  warn as tauriWarn,
  error as tauriError,
} from "@tauri-apps/plugin-log";
import type { ILogger, LogEntry, LoggerOptions, LogLevel, LogSource } from "./types";

class Logger implements ILogger {
  private source: LogSource;
  private category?: string;

  constructor(options: LoggerOptions) {
    this.source = options.source;
    this.category = options.category;
  }

  private formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const entry: LogEntry = {
      ts: Date.now(),
      level,
      source: this.source,
      category: this.category,
      message,
      data,
    };
    return JSON.stringify(entry);
  }

  trace(message: string, data?: Record<string, unknown>): void {
    tauriTrace(this.formatEntry("trace", message, data)).catch(console.error);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    tauriDebug(this.formatEntry("debug", message, data)).catch(console.error);
  }

  info(message: string, data?: Record<string, unknown>): void {
    tauriInfo(this.formatEntry("info", message, data)).catch(console.error);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    tauriWarn(this.formatEntry("warn", message, data)).catch(console.error);
  }

  error(message: string, data?: Record<string, unknown>): void {
    tauriError(this.formatEntry("error", message, data)).catch(console.error);
  }
}

export function createLogger(source: LogSource, category?: string): ILogger {
  return new Logger({ source, category });
}

// 预创建的 logger 实例
export const mainLogger = createLogger("main");
export const preloadLogger = createLogger("preload");
```

---

### Task 1.4: 实现 WebView 日志桥接

**Files:**
- Create: `packages/logger/src/webview-bridge.ts`

**Step 1: 实现 console 拦截和事件桥接**

```typescript
import { emit } from "@tauri-apps/api/event";
import type { LogEntry, LogSource } from "./types";

export const LOG_EVENT_NAME = "gc-log-entry";

interface ConsoleInterceptorOptions {
  source: LogSource;
  interceptConsole?: boolean;
}

export function setupWebviewLogBridge(options: ConsoleInterceptorOptions): () => void {
  const { source, interceptConsole = true } = options;

  if (!interceptConsole) {
    return () => {};
  }

  const originalConsole = {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  const createInterceptor = (level: "debug" | "info" | "warn" | "error", original: typeof console.log) => {
    return (...args: unknown[]) => {
      original.apply(console, args);

      const entry: LogEntry = {
        ts: Date.now(),
        level,
        source,
        message: args.map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        ).join(" "),
      };

      emit(LOG_EVENT_NAME, entry).catch(() => {
        // 静默失败，避免无限循环
      });
    };
  };

  console.log = createInterceptor("debug", originalConsole.log);
  console.debug = createInterceptor("debug", originalConsole.debug);
  console.info = createInterceptor("info", originalConsole.info);
  console.warn = createInterceptor("warn", originalConsole.warn);
  console.error = createInterceptor("error", originalConsole.error);

  return () => {
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  };
}
```

---

### Task 1.5: 实现主应用日志收集器

**Files:**
- Create: `packages/logger/src/collector.ts`

**Step 1: 实现日志收集器**

```typescript
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { info as tauriInfo } from "@tauri-apps/plugin-log";
import { LOG_EVENT_NAME } from "./webview-bridge";
import type { LogEntry } from "./types";

export class LogCollector {
  private unlisten: UnlistenFn | null = null;

  async start(): Promise<void> {
    if (this.unlisten) {
      return;
    }

    this.unlisten = await listen<LogEntry>(LOG_EVENT_NAME, (event) => {
      const entry = event.payload;
      tauriInfo(JSON.stringify(entry)).catch(console.error);
    });
  }

  stop(): void {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
  }
}

export const logCollector = new LogCollector();
```

---

### Task 1.6: 更新 vitest.shared.ts 添加 logger 别名

**Files:**
- Modify: `vitest.shared.ts`

**Step 1: 添加 @gc/logger 别名**

在 `resolve.alias` 中添加：
```typescript
"@gc/logger": resolve(rootDir, "packages/logger/src"),
```

---

### Task 1.7: 集成到主应用

**Files:**
- Modify: `apps/global-chat-desktop/src/main.tsx`
- Modify: `apps/global-chat-desktop/package.json`

**Step 1: 在 package.json 添加依赖**

在 devDependencies 中添加：
```json
"@gc/logger": "workspace:*",
```

**Step 2: 在 main.tsx 初始化日志收集器**

在文件顶部导入并启动：
```typescript
import { logCollector, mainLogger } from "@gc/logger";

// 启动日志收集器
logCollector.start();
mainLogger.info("Application started");
```

---

### Task 1.8: 集成到 Preload

**Files:**
- Modify: `apps/global-chat-desktop/src-preload/index.ts`

**Step 1: 添加日志桥接**

```typescript
import { gcEngine } from "@gc/gc-engine";
import { setupWebviewLogBridge } from "@gc/logger";

// 获取当前 WebView 的平台标识
const webviewId = window.__TAURI_INTERNALS__?.metadata?.currentWebview?.label || "unknown";
const source = webviewId.includes("telegram") ? "telegram"
  : webviewId.includes("whatsapp") ? "whatsapp"
  : webviewId.includes("instagram") ? "instagram"
  : webviewId.includes("messenger") ? "messenger"
  : webviewId.includes("facebook") ? "facebook"
  : webviewId.includes("tiktok") ? "tiktok"
  : webviewId.includes("linkedin") ? "linkedin"
  : webviewId.includes("teams") ? "teams"
  : "preload";

setupWebviewLogBridge({ source });
gcEngine.mount();
```

---

## Phase 2: CLI 日志查询工具

### Task 2.1: 创建 gc-verify CLI 工具

**Files:**
- Create: `tools/gc-verify/package.json`
- Create: `tools/gc-verify/src/index.ts`
- Create: `tools/gc-verify/src/commands/log.ts`

**Step 1: 创建 package.json**

```json
{
  "name": "gc-verify",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "gc-verify": "./dist/index.js"
  },
  "scripts": {
    "build": "bun build src/index.ts --outdir dist --target node",
    "dev": "bun run src/index.ts"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^24.10.0",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: 创建 src/index.ts**

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { logCommand } from "./commands/log";

const program = new Command();

program
  .name("gc-verify")
  .description("Global Chats 验证工具")
  .version("0.0.0");

program.addCommand(logCommand);

program.parse();
```

**Step 3: 创建 src/commands/log.ts**

```typescript
import { Command } from "commander";
import { createReadStream, existsSync } from "fs";
import { createInterface } from "readline";
import { homedir } from "os";
import { join } from "path";
import chalk from "chalk";

const LOG_PATH = join(
  homedir(),
  "Library/Logs/com.socialsmart.globalchats.app/Global Chats.log"
);

interface LogEntry {
  ts: number;
  level: string;
  source: string;
  category?: string;
  message: string;
  data?: Record<string, unknown>;
}

function parseLogLine(line: string): LogEntry | null {
  // 尝试解析 JSON 格式的日志
  const jsonMatch = line.match(/\[INFO\]\s*(.+)$/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // 不是 JSON 格式
    }
  }

  // 解析原始格式 [date][time][module][LEVEL] message
  const match = line.match(/\[(\d{4}-\d{2}-\d{2})\]\[(\d{2}:\d{2}:\d{2})\]\[([^\]]+)\]\[(\w+)\]\s*(.+)/);
  if (match) {
    const [, date, time, module, level, message] = match;
    return {
      ts: new Date(`${date}T${time}`).getTime(),
      level: level.toLowerCase(),
      source: module.includes("webview") ? "webview" : "rust",
      message,
    };
  }

  return null;
}

function formatEntry(entry: LogEntry): string {
  const time = new Date(entry.ts).toLocaleTimeString();
  const levelColors: Record<string, (s: string) => string> = {
    trace: chalk.gray,
    debug: chalk.blue,
    info: chalk.green,
    warn: chalk.yellow,
    error: chalk.red,
  };
  const colorFn = levelColors[entry.level] || chalk.white;

  let output = `${chalk.dim(time)} ${colorFn(entry.level.toUpperCase().padEnd(5))} `;
  output += `${chalk.cyan(entry.source.padEnd(12))} `;
  if (entry.category) {
    output += `${chalk.magenta(`[${entry.category}]`)} `;
  }
  output += entry.message;

  if (entry.data) {
    output += ` ${chalk.dim(JSON.stringify(entry.data))}`;
  }

  return output;
}

export const logCommand = new Command("log")
  .description("查看和查询日志");

logCommand
  .command("tail")
  .description("实时查看日志")
  .option("-n, --lines <number>", "显示最后 N 行", "20")
  .option("-s, --source <source>", "过滤来源")
  .option("-l, --level <level>", "过滤级别")
  .action(async (options) => {
    if (!existsSync(LOG_PATH)) {
      console.error(chalk.red(`日志文件不存在: ${LOG_PATH}`));
      process.exit(1);
    }

    const { spawn } = await import("child_process");
    const tail = spawn("tail", ["-f", "-n", options.lines, LOG_PATH]);

    const rl = createInterface({ input: tail.stdout });

    rl.on("line", (line) => {
      const entry = parseLogLine(line);
      if (!entry) {
        console.log(chalk.dim(line));
        return;
      }

      if (options.source && entry.source !== options.source) return;
      if (options.level && entry.level !== options.level) return;

      console.log(formatEntry(entry));
    });

    process.on("SIGINT", () => {
      tail.kill();
      process.exit(0);
    });
  });

logCommand
  .command("query")
  .description("查询历史日志")
  .option("-s, --source <source>", "过滤来源")
  .option("-l, --level <level>", "过滤级别")
  .option("--since <duration>", "时间范围 (如 5m, 1h, 1d)", "1h")
  .option("-n, --limit <number>", "最大行数", "100")
  .action(async (options) => {
    if (!existsSync(LOG_PATH)) {
      console.error(chalk.red(`日志文件不存在: ${LOG_PATH}`));
      process.exit(1);
    }

    const sinceMs = parseDuration(options.since);
    const cutoff = Date.now() - sinceMs;
    const limit = parseInt(options.limit, 10);
    const entries: LogEntry[] = [];

    const rl = createInterface({
      input: createReadStream(LOG_PATH),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const entry = parseLogLine(line);
      if (!entry) continue;
      if (entry.ts < cutoff) continue;
      if (options.source && entry.source !== options.source) continue;
      if (options.level && entry.level !== options.level) continue;

      entries.push(entry);
      if (entries.length >= limit) break;
    }

    for (const entry of entries) {
      console.log(formatEntry(entry));
    }

    console.log(chalk.dim(`\n共 ${entries.length} 条日志`));
  });

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 3600000; // 默认 1 小时

  const [, value, unit] = match;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };

  return parseInt(value, 10) * multipliers[unit];
}
```

---

### Task 2.2: 添加健康检查命令

**Files:**
- Create: `tools/gc-verify/src/commands/health.ts`
- Modify: `tools/gc-verify/src/index.ts`

**Step 1: 创建 health.ts**

```typescript
import { Command } from "commander";
import chalk from "chalk";

export const healthCommand = new Command("health")
  .description("检查应用状态")
  .option("--wait", "等待应用就绪")
  .option("--timeout <ms>", "超时时间", "30000")
  .action(async (options) => {
    const port = 1420;
    const timeout = parseInt(options.timeout, 10);
    const startTime = Date.now();

    const checkHealth = async (): Promise<boolean> => {
      try {
        const response = await fetch(`http://localhost:${port}/`);
        return response.ok;
      } catch {
        return false;
      }
    };

    if (options.wait) {
      console.log(chalk.blue(`等待应用就绪 (端口 ${port})...`));

      while (Date.now() - startTime < timeout) {
        if (await checkHealth()) {
          console.log(chalk.green("✓ 应用已就绪"));
          process.exit(0);
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      console.error(chalk.red("✗ 超时：应用未就绪"));
      process.exit(1);
    } else {
      const healthy = await checkHealth();
      if (healthy) {
        console.log(chalk.green("✓ 应用运行中"));
        console.log(`  端口: ${port}`);
      } else {
        console.log(chalk.red("✗ 应用未运行"));
        process.exit(1);
      }
    }
  });
```

**Step 2: 在 index.ts 添加 health 命令**

```typescript
import { healthCommand } from "./commands/health";
program.addCommand(healthCommand);
```

---

## Phase 3: Playwright UI 测试

### Task 3.1: 配置 Playwright

**Files:**
- Create: `apps/global-chat-desktop/playwright.config.ts`
- Create: `apps/global-chat-desktop/tests/e2e/setup.ts`

**Step 1: 安装 Playwright**

Run: `bun add -D @playwright/test --cwd apps/global-chat-desktop`

**Step 2: 创建 playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev:renderer",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**Step 3: 创建 tests/e2e/setup.ts**

```typescript
import { test as base } from "@playwright/test";

// Mock Tauri APIs
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      // Mock Tauri internals
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args?: Record<string, unknown>) => {
          console.log(`[Mock] invoke: ${cmd}`, args);

          // 返回模拟数据
          switch (cmd) {
            case "get_theme":
              return "light";
            default:
              return null;
          }
        },
        metadata: {
          currentWebview: { label: "main" },
        },
      };
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";
```

---

### Task 3.2: 创建基础 UI 测试

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/app.spec.ts`

**Step 1: 创建基础测试**

```typescript
import { test, expect } from "./setup";

test.describe("应用基础功能", () => {
  test("应用能够加载", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Global Chats/);
  });

  test("左侧边栏显示", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator('[data-testid="left-sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  test("平台图标显示", async ({ page }) => {
    await page.goto("/");
    // 检查至少有一个平台图标
    const platformIcons = page.locator('[data-testid^="platform-icon-"]');
    await expect(platformIcons.first()).toBeVisible();
  });
});
```

---

### Task 3.3: 添加测试脚本

**Files:**
- Modify: `apps/global-chat-desktop/package.json`

**Step 1: 添加测试脚本**

在 scripts 中添加：
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:debug": "playwright test --debug"
```

---

## Phase 4: 集成验证

### Task 4.1: 添加 gc-verify ui 命令

**Files:**
- Create: `tools/gc-verify/src/commands/ui.ts`
- Modify: `tools/gc-verify/src/index.ts`

**Step 1: 创建 ui.ts**

```typescript
import { Command } from "commander";
import { spawn } from "child_process";
import { join } from "path";
import chalk from "chalk";

const APP_DIR = join(process.cwd(), "apps/global-chat-desktop");

export const uiCommand = new Command("ui")
  .description("UI 测试命令");

uiCommand
  .command("test")
  .description("运行 Playwright UI 测试")
  .option("--grep <pattern>", "过滤测试")
  .option("--debug", "调试模式")
  .action(async (options) => {
    const args = ["playwright", "test"];

    if (options.grep) {
      args.push("--grep", options.grep);
    }
    if (options.debug) {
      args.push("--debug");
    }

    console.log(chalk.blue(`运行 UI 测试...`));

    const proc = spawn("bunx", args, {
      cwd: APP_DIR,
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      process.exit(code || 0);
    });
  });
```

**Step 2: 在 index.ts 添加 ui 命令**

```typescript
import { uiCommand } from "./commands/ui";
program.addCommand(uiCommand);
```

---

### Task 4.2: 创建快捷脚本

**Files:**
- Modify: `package.json` (根目录)

**Step 1: 添加根目录脚本**

在 scripts 中添加：
```json
"verify:log": "bun run tools/gc-verify/src/index.ts log",
"verify:health": "bun run tools/gc-verify/src/index.ts health",
"verify:ui": "bun run tools/gc-verify/src/index.ts ui test"
```

---

## 验证清单

完成所有任务后，执行以下验证：

1. **日志系统验证**
   ```bash
   # 启动应用
   cd apps/global-chat-desktop && task dev:all

   # 新终端查看日志
   bun run verify:log tail
   ```

2. **健康检查验证**
   ```bash
   bun run verify:health
   ```

3. **UI 测试验证**
   ```bash
   bun run verify:ui
   ```

---

## 文件清单

### 新建文件
- `packages/logger/package.json`
- `packages/logger/tsconfig.json`
- `packages/logger/src/index.ts`
- `packages/logger/src/types.ts`
- `packages/logger/src/logger.ts`
- `packages/logger/src/webview-bridge.ts`
- `packages/logger/src/collector.ts`
- `tools/gc-verify/package.json`
- `tools/gc-verify/src/index.ts`
- `tools/gc-verify/src/commands/log.ts`
- `tools/gc-verify/src/commands/health.ts`
- `tools/gc-verify/src/commands/ui.ts`
- `apps/global-chat-desktop/playwright.config.ts`
- `apps/global-chat-desktop/tests/e2e/setup.ts`
- `apps/global-chat-desktop/tests/e2e/app.spec.ts`

### 修改文件
- `vitest.shared.ts` - 添加 @gc/logger 别名
- `apps/global-chat-desktop/package.json` - 添加依赖和脚本
- `apps/global-chat-desktop/src/main.tsx` - 初始化日志收集器
- `apps/global-chat-desktop/src-preload/index.ts` - 添加日志桥接
- `package.json` (根目录) - 添加验证脚本
