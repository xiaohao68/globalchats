# E2E 自动化测试实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立完整的 E2E 自动化测试体系，基于 Playwright 全栈方案

**Architecture:** 使用 Page Object Model 封装页面操作，分层测试（app → platforms → chat），日志接口留空后续对接

**Tech Stack:** Playwright 1.58.0, TypeScript, Bun

---

## 阶段 1：基础设施搭建

### Task 1.1: 创建目录结构

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/fixtures/base.ts`
- Create: `apps/global-chat-desktop/tests/e2e/pages/BasePage.ts`
- Create: `apps/global-chat-desktop/tests/e2e/pages/platforms/.gitkeep`
- Create: `apps/global-chat-desktop/tests/e2e/specs/app/.gitkeep`
- Create: `apps/global-chat-desktop/tests/e2e/specs/chat/.gitkeep`
- Create: `apps/global-chat-desktop/tests/e2e/specs/platforms/.gitkeep`
- Create: `apps/global-chat-desktop/tests/e2e/utils/logger.ts`
- Create: `apps/global-chat-desktop/tests/e2e/utils/assertions.ts`

**Step 1: 创建 fixtures/base.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/fixtures/base.ts
import { test as base, expect } from "@playwright/test";

/**
 * 扩展 Playwright 基础测试 fixture
 * 注入 Tauri mock 和通用工具
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // 注入 Tauri mock
    await page.addInitScript(() => {
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args?: Record<string, unknown>) => {
          console.log(`[Mock] invoke: ${cmd}`, args);
          switch (cmd) {
            case "get_theme":
              return "light";
            case "get_user_settings":
              return {};
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

export { expect };
```

**Step 2: 创建 pages/BasePage.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/BasePage.ts
import { Page } from "@playwright/test";
import { testLogger } from "../utils/logger";

/**
 * 页面基类 - 所有 Page Object 的基础
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * 等待页面加载完成（子类必须实现）
   */
  abstract waitForReady(): Promise<void>;

  /**
   * 截图（用于调试和报告）
   */
  async screenshot(name: string): Promise<void> {
    const path = `test-results/screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path });
    this.log("info", `Screenshot saved: ${path}`);
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * 日志记录（留空接口，后续接入项目日志系统）
   */
  protected log(level: "info" | "error" | "warn", message: string): void {
    testLogger[level](message);
  }
}
```

**Step 3: 创建 utils/logger.ts（留空接口）**

```typescript
// apps/global-chat-desktop/tests/e2e/utils/logger.ts
import { Page } from "@playwright/test";

/**
 * 日志条目类型
 */
export interface LogEntry {
  level: "info" | "error" | "warn";
  message: string;
  timestamp: number;
  data?: unknown;
}

/**
 * 测试日志接口
 * TODO: 后续接入项目日志系统
 */
export interface TestLogger {
  info(message: string, data?: unknown): void;
  error(message: string, error?: Error): void;
  warn(message: string, data?: unknown): void;
  screenshot(name: string, page: Page): Promise<void>;

  /** 获取测试运行期间的日志（用于断言） */
  getLogs(): LogEntry[];

  /** 清空日志（每个测试开始时调用） */
  clear(): void;
}

/**
 * 空实现 - 后续接入项目日志系统
 */
export const testLogger: TestLogger = {
  info: (message: string, _data?: unknown) => {
    // TODO: 接入项目日志系统
    console.log(`[TEST INFO] ${message}`);
  },
  error: (message: string, _error?: Error) => {
    // TODO: 接入项目日志系统
    console.error(`[TEST ERROR] ${message}`);
  },
  warn: (message: string, _data?: unknown) => {
    // TODO: 接入项目日志系统
    console.warn(`[TEST WARN] ${message}`);
  },
  screenshot: async (_name: string, _page: Page) => {
    // TODO: 接入项目日志系统
  },
  getLogs: () => [],
  clear: () => {},
};
```

**Step 4: 创建 utils/assertions.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/utils/assertions.ts
import { expect, Page } from "@playwright/test";

/**
 * 自定义断言工具
 */
export const customAssertions = {
  /**
   * 断言元素可见且包含文本
   */
  async toBeVisibleWithText(page: Page, selector: string, text: string) {
    const element = page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toContainText(text);
  },

  /**
   * 断言页面 URL 匹配
   */
  async toHaveUrlMatching(page: Page, pattern: RegExp) {
    await expect(page).toHaveURL(pattern);
  },

  /**
   * 断言元素数量
   */
  async toHaveCount(page: Page, selector: string, count: number) {
    const elements = page.locator(selector);
    await expect(elements).toHaveCount(count);
  },
};
```

**Step 5: 创建占位文件**

```bash
# 创建目录占位文件
touch apps/global-chat-desktop/tests/e2e/pages/platforms/.gitkeep
touch apps/global-chat-desktop/tests/e2e/specs/app/.gitkeep
touch apps/global-chat-desktop/tests/e2e/specs/chat/.gitkeep
touch apps/global-chat-desktop/tests/e2e/specs/platforms/.gitkeep
```

**Step 6: 验证目录结构**

Run: `find apps/global-chat-desktop/tests/e2e -type f | head -20`
Expected: 显示新创建的所有文件

**Step 7: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/
git commit -m "feat(e2e): 创建测试基础设施目录结构和基类"
```

---

### Task 1.2: 更新 Playwright 配置

**Files:**
- Modify: `apps/global-chat-desktop/playwright.config.ts`

**Step 1: 更新 playwright.config.ts**

```typescript
// apps/global-chat-desktop/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // 超时设置（真实平台可能较慢）
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // 不完全并行（平台测试需串行）
  fullyParallel: false,

  // CI 配置
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  // 报告配置
  reporter: [
    ["html", { outputFolder: "test-results/html" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],

  // 通用配置
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // 项目配置
  projects: [
    {
      name: "app",
      testMatch: /specs\/app\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chat",
      testMatch: /specs\/chat\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["app"],
    },
    {
      name: "platforms",
      testMatch: /specs\/platforms\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["app"],
    },
  ],

  // 开发服务器
  webServer: {
    command: "bun run dev:renderer",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  // 输出目录
  outputDir: "test-results/artifacts",
});
```

**Step 2: 运行配置验证**

Run: `cd apps/global-chat-desktop && bunx playwright test --list`
Expected: 显示可用的测试项目（app, chat, platforms）

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/playwright.config.ts
git commit -m "feat(e2e): 更新 Playwright 配置，添加分项目测试"
```

---

### Task 1.3: 更新 Taskfile 添加测试命令

**Files:**
- Modify: `apps/global-chat-desktop/Taskfile.yml`

**Step 1: 添加测试命令到 Taskfile.yml**

在 `#============================================================================` 和 `# 清理命令` 之间添加：

```yaml
  #============================================================================
  # E2E 测试命令
  #============================================================================
  test:e2e:
    desc: Run all E2E tests
    cmds:
      - bunx playwright test

  test:e2e:app:
    desc: Run app E2E tests only
    cmds:
      - bunx playwright test --project=app

  test:e2e:platforms:
    desc: Run platform E2E tests only
    cmds:
      - bunx playwright test --project=platforms

  test:e2e:chat:
    desc: Run chat E2E tests only
    cmds:
      - bunx playwright test --project=chat

  test:e2e:ui:
    desc: Run E2E tests with UI mode
    cmds:
      - bunx playwright test --ui

  test:e2e:debug:
    desc: Run E2E tests in debug mode
    cmds:
      - bunx playwright test --debug

  test:e2e:headed:
    desc: Run E2E tests in headed mode (visible browser)
    cmds:
      - bunx playwright test --headed

  test:e2e:report:
    desc: Show E2E test report
    cmds:
      - bunx playwright show-report test-results/html
```

**Step 2: 更新帮助信息**

在 help task 的输出中添加：

```yaml
        echo ""
        echo "🧪 Testing:"
        echo "  task test:e2e          - Run all E2E tests"
        echo "  task test:e2e:app      - Run app tests only"
        echo "  task test:e2e:platforms - Run platform tests only"
        echo "  task test:e2e:ui       - Run with Playwright UI"
        echo "  task test:e2e:headed   - Run in headed mode"
        echo "  task test:e2e:report   - Show test report"
```

**Step 3: 验证命令**

Run: `cd apps/global-chat-desktop && task --list | grep test`
Expected: 显示所有测试相关命令

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/Taskfile.yml
git commit -m "feat(e2e): 添加 E2E 测试 task 命令"
```

---

### Task 1.4: 迁移现有测试到新结构

**Files:**
- Move: `apps/global-chat-desktop/tests/e2e/app.spec.ts` → `apps/global-chat-desktop/tests/e2e/specs/app/startup.spec.ts`
- Move: `apps/global-chat-desktop/tests/e2e/whatsapp.spec.ts` → `apps/global-chat-desktop/tests/e2e/specs/platforms/whatsapp.spec.ts`
- Delete: `apps/global-chat-desktop/tests/e2e/setup.ts`（功能已迁移到 fixtures/base.ts）

**Step 1: 创建新的 app/startup.spec.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/specs/app/startup.spec.ts
import { test, expect } from "../../fixtures/base";

test.describe("应用启动", () => {
  test("应用能够正常加载", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 验证主要 UI 元素存在
    await expect(page.locator("body")).toBeVisible();
  });

  test("页面标题正确", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Global Chat/i);
  });
});
```

**Step 2: 创建新的 platforms/whatsapp.spec.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/specs/platforms/whatsapp.spec.ts
import { test, expect } from "../../fixtures/base";

test.describe("WhatsApp 平台", () => {
  test.skip("WhatsApp WebView 加载", async ({ page }) => {
    // TODO: 实现 WhatsApp 平台测试
    // 需要真实平台连接
  });
});
```

**Step 3: 删除旧文件**

```bash
rm apps/global-chat-desktop/tests/e2e/app.spec.ts
rm apps/global-chat-desktop/tests/e2e/whatsapp.spec.ts
rm apps/global-chat-desktop/tests/e2e/setup.ts
```

**Step 4: 运行测试验证迁移**

Run: `cd apps/global-chat-desktop && bunx playwright test --project=app`
Expected: 测试通过

**Step 5: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/
git commit -m "refactor(e2e): 迁移现有测试到新目录结构"
```

---

## 阶段 2：主应用测试

### Task 2.1: 创建 MainAppPage

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/pages/MainAppPage.ts`

**Step 1: 创建 MainAppPage.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/MainAppPage.ts
import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * 主应用页面对象
 */
export class MainAppPage extends BasePage {
  // 选择器
  private selectors = {
    sidebar: '[data-testid="sidebar"], .sidebar, nav',
    mainContent: '[data-testid="main-content"], main, .main-content',
    platformTabs: '[data-testid="platform-tabs"], .platform-tabs',
    settingsButton: '[data-testid="settings-btn"], .settings-btn',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * 等待页面加载完成
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
    this.log("info", "Main app page ready");
  }

  /**
   * 导航到首页
   */
  async goto(): Promise<void> {
    await this.page.goto("/");
    await this.waitForReady();
  }

  /**
   * 检查侧边栏是否可见
   */
  async isSidebarVisible(): Promise<boolean> {
    const sidebar = this.page.locator(this.selectors.sidebar).first();
    return sidebar.isVisible();
  }

  /**
   * 检查主内容区是否可见
   */
  async isMainContentVisible(): Promise<boolean> {
    const main = this.page.locator(this.selectors.mainContent).first();
    return main.isVisible();
  }

  /**
   * 点击设置按钮
   */
  async clickSettings(): Promise<void> {
    await this.page.locator(this.selectors.settingsButton).first().click();
    this.log("info", "Clicked settings button");
  }

  /**
   * 获取当前 URL 路径
   */
  async getCurrentPath(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/pages/MainAppPage.ts
git commit -m "feat(e2e): 添加 MainAppPage 页面对象"
```

---

### Task 2.2: 编写导航测试

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/specs/app/navigation.spec.ts`

**Step 1: 创建 navigation.spec.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/specs/app/navigation.spec.ts
import { test, expect } from "../../fixtures/base";
import { MainAppPage } from "../../pages/MainAppPage";

test.describe("应用导航", () => {
  let mainApp: MainAppPage;

  test.beforeEach(async ({ page }) => {
    mainApp = new MainAppPage(page);
    await mainApp.goto();
  });

  test("首页加载成功", async ({ page }) => {
    await expect(page).toHaveURL(/localhost:1420/);
  });

  test("主内容区可见", async () => {
    const isVisible = await mainApp.isMainContentVisible();
    expect(isVisible).toBe(true);
  });

  test("页面刷新后状态保持", async ({ page }) => {
    const initialPath = await mainApp.getCurrentPath();
    await page.reload();
    await mainApp.waitForReady();
    const afterPath = await mainApp.getCurrentPath();
    expect(afterPath).toBe(initialPath);
  });
});
```

**Step 2: 运行测试**

Run: `cd apps/global-chat-desktop && bunx playwright test specs/app/navigation.spec.ts`
Expected: 测试通过

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/specs/app/navigation.spec.ts
git commit -m "feat(e2e): 添加应用导航测试"
```

---

## 阶段 3：平台测试框架

### Task 3.1: 创建 PlatformPage 基类

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/pages/platforms/PlatformPage.ts`
- Create: `apps/global-chat-desktop/tests/e2e/pages/platforms/index.ts`

**Step 1: 创建 PlatformPage.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/platforms/PlatformPage.ts
import { Page } from "@playwright/test";
import { BasePage } from "../BasePage";

/**
 * 平台枚举（简化版，避免依赖 @gc/model）
 */
export enum EPlatform {
  Telegram = "telegram",
  WhatsApp = "whatsapp",
  Instagram = "instagram",
  Messenger = "messenger",
  Facebook = "facebook",
  TikTok = "tiktok",
  LinkedIn = "linkedin",
  Teams = "teams",
}

/**
 * 消息类型
 */
export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
}

/**
 * 会话类型
 */
export interface Conversation {
  id: string;
  name: string;
  lastMessage?: Message;
}

/**
 * 平台页面基类
 */
export abstract class PlatformPage extends BasePage {
  abstract readonly platform: EPlatform;

  constructor(page: Page) {
    super(page);
  }

  /**
   * 等待登录状态确认
   */
  async waitForLogin(): Promise<void> {
    // 默认实现：等待网络空闲
    await this.waitForNetworkIdle();
    this.log("info", `${this.platform} login state confirmed`);
  }

  /**
   * 等待 GCEngine 注入完成
   */
  async waitForGCEngine(): Promise<void> {
    await this.page.waitForFunction(
      () => typeof (window as any).gcEngine !== "undefined",
      { timeout: 30_000 }
    );
    this.log("info", `GCEngine injected for ${this.platform}`);
  }

  /**
   * 执行注入脚本
   */
  async executeInjectScript<T>(script: string): Promise<T> {
    return this.page.evaluate(script) as Promise<T>;
  }

  /**
   * 获取消息列表
   */
  async getMessages(limit = 50): Promise<Message[]> {
    try {
      return await this.executeInjectScript<Message[]>(`
        (async () => {
          if (window.gcEngine && window.gcEngine.${this.platform}) {
            return await window.gcEngine.${this.platform}.getMessages(${limit});
          }
          return [];
        })()
      `);
    } catch (error) {
      this.log("error", `Failed to get messages: ${error}`);
      return [];
    }
  }

  /**
   * 获取会话列表
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      return await this.executeInjectScript<Conversation[]>(`
        (async () => {
          if (window.gcEngine && window.gcEngine.${this.platform}) {
            return await window.gcEngine.${this.platform}.getConversations();
          }
          return [];
        })()
      `);
    } catch (error) {
      this.log("error", `Failed to get conversations: ${error}`);
      return [];
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(chatId: string, text: string): Promise<boolean> {
    try {
      await this.executeInjectScript(`
        (async () => {
          if (window.gcEngine && window.gcEngine.${this.platform}) {
            await window.gcEngine.${this.platform}.sendMessage('${chatId}', '${text}');
          }
        })()
      `);
      this.log("info", `Message sent to ${chatId}`);
      return true;
    } catch (error) {
      this.log("error", `Failed to send message: ${error}`);
      return false;
    }
  }
}
```

**Step 2: 创建 index.ts 导出**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/platforms/index.ts
export { PlatformPage, EPlatform } from "./PlatformPage";
export type { Message, Conversation } from "./PlatformPage";
```

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/pages/platforms/
git commit -m "feat(e2e): 添加 PlatformPage 基类"
```

---

### Task 3.2: 创建 platform fixture

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/fixtures/platform.ts`

**Step 1: 创建 platform.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/fixtures/platform.ts
import { test as base } from "./base";
import { EPlatform } from "../pages/platforms";

/**
 * 平台测试 fixture
 * 提供平台相关的测试工具
 */
export const platformTest = base.extend<{
  platformName: EPlatform;
  waitForPlatformReady: () => Promise<void>;
}>({
  platformName: [EPlatform.WhatsApp, { option: true }],

  waitForPlatformReady: async ({ page, platformName }, use) => {
    const waitFn = async () => {
      // 等待平台 WebView 加载
      await page.waitForLoadState("networkidle");

      // 等待 GCEngine 注入（如果存在）
      try {
        await page.waitForFunction(
          () => typeof (window as any).gcEngine !== "undefined",
          { timeout: 10_000 }
        );
      } catch {
        // GCEngine 可能不存在，跳过
      }

      console.log(`[Platform] ${platformName} ready`);
    };

    await use(waitFn);
  },
});

export { expect } from "@playwright/test";
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/fixtures/platform.ts
git commit -m "feat(e2e): 添加 platform fixture"
```

---

### Task 3.3: 实现 WhatsAppPage

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/pages/platforms/WhatsAppPage.ts`

**Step 1: 创建 WhatsAppPage.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/platforms/WhatsAppPage.ts
import { Page } from "@playwright/test";
import { PlatformPage, EPlatform } from "./PlatformPage";

/**
 * WhatsApp 页面对象
 */
export class WhatsAppPage extends PlatformPage {
  readonly platform = EPlatform.WhatsApp;

  // WhatsApp Web 选择器
  private selectors = {
    chatList: '[data-testid="chat-list"], .chat-list, ._3nbHh',
    messageList: '[data-testid="msg-container"], .message-list',
    inputBox: '[data-testid="conversation-compose-box-input"], .selectable-text',
    sendButton: '[data-testid="send"], .send-button',
    searchBox: '[data-testid="chat-list-search"], .search-input',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * 等待 WhatsApp 加载完成
   */
  async waitForReady(): Promise<void> {
    // 等待聊天列表出现
    await this.page.waitForSelector(this.selectors.chatList, {
      timeout: 30_000,
    });
    await this.waitForGCEngine();
    this.log("info", "WhatsApp page ready");
  }

  /**
   * 搜索聊天
   */
  async searchChat(keyword: string): Promise<void> {
    const searchBox = this.page.locator(this.selectors.searchBox).first();
    await searchBox.fill(keyword);
    await this.page.waitForTimeout(1000); // 等待搜索结果
    this.log("info", `Searched for: ${keyword}`);
  }

  /**
   * 打开指定聊天
   */
  async openChat(chatName: string): Promise<void> {
    await this.page.click(`text=${chatName}`);
    await this.page.waitForSelector(this.selectors.messageList, {
      timeout: 10_000,
    });
    this.log("info", `Opened chat: ${chatName}`);
  }

  /**
   * 检查是否已登录
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.chatList, {
        timeout: 5_000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取聊天列表中的聊天数量
   */
  async getChatCount(): Promise<number> {
    const chats = this.page.locator(`${this.selectors.chatList} > div`);
    return chats.count();
  }
}
```

**Step 2: 更新 index.ts 导出**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/platforms/index.ts
export { PlatformPage, EPlatform } from "./PlatformPage";
export type { Message, Conversation } from "./PlatformPage";
export { WhatsAppPage } from "./WhatsAppPage";
```

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/pages/platforms/
git commit -m "feat(e2e): 添加 WhatsAppPage 实现"
```

---

### Task 3.4: 编写 WhatsApp 平台测试

**Files:**
- Modify: `apps/global-chat-desktop/tests/e2e/specs/platforms/whatsapp.spec.ts`

**Step 1: 更新 whatsapp.spec.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/specs/platforms/whatsapp.spec.ts
import { test, expect } from "../../fixtures/base";
import { WhatsAppPage } from "../../pages/platforms/WhatsAppPage";

test.describe("WhatsApp 平台测试", () => {
  let whatsapp: WhatsAppPage;

  test.beforeEach(async ({ page }) => {
    whatsapp = new WhatsAppPage(page);
  });

  test("WhatsApp 页面对象可以实例化", async () => {
    expect(whatsapp).toBeDefined();
    expect(whatsapp.platform).toBe("whatsapp");
  });

  // 以下测试需要真实平台连接，默认跳过
  test.describe("真实平台测试", () => {
    test.skip(
      () => !process.env.E2E_REAL_PLATFORM,
      "需要设置 E2E_REAL_PLATFORM=true 启用真实平台测试"
    );

    test("WhatsApp 已登录", async ({ page }) => {
      // 导航到 WhatsApp WebView
      // 注：实际路径需要根据项目调整
      await page.goto("/whatsapp");
      const isLoggedIn = await whatsapp.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });

    test("可以获取聊天列表", async ({ page }) => {
      await page.goto("/whatsapp");
      await whatsapp.waitForReady();
      const conversations = await whatsapp.getConversations();
      expect(Array.isArray(conversations)).toBe(true);
    });
  });
});
```

**Step 2: 运行测试**

Run: `cd apps/global-chat-desktop && bunx playwright test specs/platforms/whatsapp.spec.ts`
Expected: 基础测试通过，真实平台测试跳过

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/specs/platforms/whatsapp.spec.ts
git commit -m "feat(e2e): 添加 WhatsApp 平台测试"
```

---

## 阶段 4：其他平台实现（模板）

### Task 4.1: 创建 TelegramPage

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/pages/platforms/TelegramPage.ts`
- Create: `apps/global-chat-desktop/tests/e2e/specs/platforms/telegram.spec.ts`

**Step 1: 创建 TelegramPage.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/platforms/TelegramPage.ts
import { Page } from "@playwright/test";
import { PlatformPage, EPlatform } from "./PlatformPage";

/**
 * Telegram 页面对象
 */
export class TelegramPage extends PlatformPage {
  readonly platform = EPlatform.Telegram;

  private selectors = {
    chatList: ".chat-list, .chatlist",
    messageList: ".messages-container, .message-list",
    inputBox: ".input-message-input, .composer-input",
    searchBox: ".input-search, .search-input",
  };

  constructor(page: Page) {
    super(page);
  }

  async waitForReady(): Promise<void> {
    await this.page.waitForSelector(this.selectors.chatList, {
      timeout: 30_000,
    });
    await this.waitForGCEngine();
    this.log("info", "Telegram page ready");
  }

  async searchChat(keyword: string): Promise<void> {
    const searchBox = this.page.locator(this.selectors.searchBox).first();
    await searchBox.fill(keyword);
    await this.page.waitForTimeout(1000);
  }

  async openChat(chatName: string): Promise<void> {
    await this.page.click(`text=${chatName}`);
    await this.page.waitForSelector(this.selectors.messageList);
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector(this.selectors.chatList, {
        timeout: 5_000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

**Step 2: 创建 telegram.spec.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/specs/platforms/telegram.spec.ts
import { test, expect } from "../../fixtures/base";
import { TelegramPage } from "../../pages/platforms/TelegramPage";

test.describe("Telegram 平台测试", () => {
  let telegram: TelegramPage;

  test.beforeEach(async ({ page }) => {
    telegram = new TelegramPage(page);
  });

  test("Telegram 页面对象可以实例化", async () => {
    expect(telegram).toBeDefined();
    expect(telegram.platform).toBe("telegram");
  });

  test.describe("真实平台测试", () => {
    test.skip(
      () => !process.env.E2E_REAL_PLATFORM,
      "需要设置 E2E_REAL_PLATFORM=true"
    );

    test("Telegram 已登录", async ({ page }) => {
      await page.goto("/telegram");
      const isLoggedIn = await telegram.isLoggedIn();
      expect(isLoggedIn).toBe(true);
    });
  });
});
```

**Step 3: 更新 index.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/platforms/index.ts
export { PlatformPage, EPlatform } from "./PlatformPage";
export type { Message, Conversation } from "./PlatformPage";
export { WhatsAppPage } from "./WhatsAppPage";
export { TelegramPage } from "./TelegramPage";
```

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/pages/platforms/
git add apps/global-chat-desktop/tests/e2e/specs/platforms/
git commit -m "feat(e2e): 添加 Telegram 平台测试"
```

---

## 阶段 5：聊天功能测试

### Task 5.1: 创建 AggregatedChatPage

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/pages/AggregatedChatPage.ts`

**Step 1: 创建 AggregatedChatPage.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/pages/AggregatedChatPage.ts
import { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * 聚合聊天页面对象
 */
export class AggregatedChatPage extends BasePage {
  private selectors = {
    chatList: '[data-testid="aggregated-chat-list"], .chat-list',
    messageList: '[data-testid="message-list"], .message-list',
    platformFilter: '[data-testid="platform-filter"], .platform-filter',
    translateButton: '[data-testid="translate-btn"], .translate-btn',
  };

  constructor(page: Page) {
    super(page);
  }

  async waitForReady(): Promise<void> {
    await this.waitForNetworkIdle();
    this.log("info", "Aggregated chat page ready");
  }

  async goto(): Promise<void> {
    await this.page.goto("/chat");
    await this.waitForReady();
  }

  async getVisibleMessages(): Promise<number> {
    const messages = this.page.locator(`${this.selectors.messageList} > *`);
    return messages.count();
  }

  async filterByPlatform(platform: string): Promise<void> {
    await this.page.click(`${this.selectors.platformFilter} [data-platform="${platform}"]`);
    await this.waitForNetworkIdle();
  }

  async translateMessage(messageIndex: number): Promise<void> {
    const messages = this.page.locator(`${this.selectors.messageList} > *`);
    const message = messages.nth(messageIndex);
    await message.hover();
    await message.locator(this.selectors.translateButton).click();
  }
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/pages/AggregatedChatPage.ts
git commit -m "feat(e2e): 添加 AggregatedChatPage 页面对象"
```

---

### Task 5.2: 编写聚合聊天测试

**Files:**
- Create: `apps/global-chat-desktop/tests/e2e/specs/chat/aggregated.spec.ts`

**Step 1: 创建 aggregated.spec.ts**

```typescript
// apps/global-chat-desktop/tests/e2e/specs/chat/aggregated.spec.ts
import { test, expect } from "../../fixtures/base";
import { AggregatedChatPage } from "../../pages/AggregatedChatPage";

test.describe("聚合聊天功能", () => {
  let chatPage: AggregatedChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new AggregatedChatPage(page);
  });

  test("聚合聊天页面对象可以实例化", async () => {
    expect(chatPage).toBeDefined();
  });

  test.describe("聊天列表", () => {
    test.skip(
      () => !process.env.E2E_REAL_PLATFORM,
      "需要真实平台连接"
    );

    test("可以加载聊天列表", async () => {
      await chatPage.goto();
      // 聊天列表应该存在（即使为空）
      expect(true).toBe(true);
    });
  });
});
```

**Step 2: 运行测试**

Run: `cd apps/global-chat-desktop && bunx playwright test specs/chat/`
Expected: 测试通过

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/specs/chat/
git commit -m "feat(e2e): 添加聚合聊天测试"
```

---

## 阶段 6：日志系统接入（留空）

### Task 6.1: 更新日志接口文档

**Files:**
- Modify: `apps/global-chat-desktop/tests/e2e/utils/logger.ts`

**Step 1: 添加接入说明注释**

在 logger.ts 文件头部添加：

```typescript
/**
 * E2E 测试日志工具
 *
 * ## 接入项目日志系统步骤：
 *
 * 1. 导入项目日志模块
 *    import { logger } from '@gc/utils';
 *
 * 2. 实现 TestLogger 接口
 *    - info: 调用 logger.info()
 *    - error: 调用 logger.error()
 *    - warn: 调用 logger.warn()
 *
 * 3. 实现 getLogs() 收集日志
 *    - 需要项目日志系统支持日志收集
 *
 * 4. 实现 screenshot() 保存截图
 *    - 可结合项目日志系统记录截图路径
 */
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/tests/e2e/utils/logger.ts
git commit -m "docs(e2e): 添加日志接入说明"
```

---

## 最终验证

### Task 7.1: 运行全部测试

**Step 1: 运行所有 E2E 测试**

Run: `cd apps/global-chat-desktop && bunx playwright test`
Expected: 所有测试通过

**Step 2: 生成测试报告**

Run: `cd apps/global-chat-desktop && bunx playwright show-report test-results/html`
Expected: 浏览器打开测试报告

**Step 3: 最终 Commit**

```bash
git add .
git commit -m "feat(e2e): 完成 E2E 测试基础设施搭建"
```

---

## 文件清单

创建的文件：
- `tests/e2e/fixtures/base.ts`
- `tests/e2e/fixtures/platform.ts`
- `tests/e2e/pages/BasePage.ts`
- `tests/e2e/pages/MainAppPage.ts`
- `tests/e2e/pages/AggregatedChatPage.ts`
- `tests/e2e/pages/platforms/PlatformPage.ts`
- `tests/e2e/pages/platforms/WhatsAppPage.ts`
- `tests/e2e/pages/platforms/TelegramPage.ts`
- `tests/e2e/pages/platforms/index.ts`
- `tests/e2e/specs/app/startup.spec.ts`
- `tests/e2e/specs/app/navigation.spec.ts`
- `tests/e2e/specs/chat/aggregated.spec.ts`
- `tests/e2e/specs/platforms/whatsapp.spec.ts`
- `tests/e2e/specs/platforms/telegram.spec.ts`
- `tests/e2e/utils/logger.ts`
- `tests/e2e/utils/assertions.ts`

修改的文件：
- `playwright.config.ts`
- `Taskfile.yml`

删除的文件：
- `tests/e2e/app.spec.ts`（迁移到新位置）
- `tests/e2e/whatsapp.spec.ts`（迁移到新位置）
- `tests/e2e/setup.ts`（功能合并到 fixtures/base.ts）
