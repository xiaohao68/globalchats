# E2E 自动化测试设计方案

> 创建日期：2026-02-04
> 状态：待实施

## 概述

本文档描述 Global Chats 桌面应用的自动化测试体系设计，采用 **Playwright 全栈方案**，覆盖前端 UI、核心包、InjectJS 注入脚本和第三方平台集成。

## 需求总结

| 维度 | 选择 |
|------|------|
| **目标** | 完整测试体系（功能验证 + 回归防护） |
| **环境** | 本地 + CI/CD |
| **覆盖** | 前端 UI + 核心包 + InjectJS + Rust 后端 |
| **第三方平台** | 真实平台连接（已登录状态） |
| **触发方式** | 手动触发 |

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    自动化测试架构（Playwright 全栈）              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    测试执行层                              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │ 单元测试    │  │ 组件测试    │  │ E2E 测试           │  │  │
│  │  │ (Vitest)   │  │ (Vitest)   │  │ (Playwright)       │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    测试工具层                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ 页面操作  │  │ 断言工具  │  │ 截图对比  │  │ 日志收集  │  │  │
│  │  │ POM      │  │ Expect   │  │ Compare  │  │ (留空)   │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    测试目标层                              │  │
│  │  ┌───────┐  ┌─────────┐  ┌──────────┐  ┌─────────────┐   │  │
│  │  │主应用  │  │ 核心包   │  │ InjectJS │  │ 第三方平台   │   │  │
│  │  │ UI    │  │packages │  │ WebView  │  │ TG/WA/IG   │   │  │
│  │  └───────┘  └─────────┘  └──────────┘  └─────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**核心设计原则**：
- **Playwright 主导 E2E**：操作真实页面，连接真实平台
- **Vitest 保留**：单元测试和组件测试继续使用现有框架
- **日志收集留空**：预留接口，后续接入项目日志系统
- **Page Object Model**：页面操作封装，提高可维护性

## 目录结构

```
apps/global-chat-desktop/
├── tests/
│   ├── e2e/                          # E2E 测试（Playwright）
│   │   ├── fixtures/                 # 测试夹具
│   │   │   ├── base.ts              # 基础 fixture（扩展 Playwright）
│   │   │   └── platform.ts          # 平台相关 fixture
│   │   │
│   │   ├── pages/                    # Page Object Model
│   │   │   ├── BasePage.ts          # 页面基类
│   │   │   ├── MainAppPage.ts       # 主应用页面
│   │   │   ├── AggregatedChatPage.ts # 聚合聊天页面
│   │   │   └── platforms/           # 各平台页面对象
│   │   │       ├── TelegramPage.ts
│   │   │       ├── WhatsAppPage.ts
│   │   │       ├── InstagramPage.ts
│   │   │       └── ...
│   │   │
│   │   ├── specs/                    # 测试用例
│   │   │   ├── app/                  # 主应用测试
│   │   │   │   ├── navigation.spec.ts
│   │   │   │   └── settings.spec.ts
│   │   │   ├── chat/                 # 聊天功能测试
│   │   │   │   ├── aggregated.spec.ts
│   │   │   │   └── translation.spec.ts
│   │   │   └── platforms/           # 各平台测试
│   │   │       ├── telegram.spec.ts
│   │   │       ├── whatsapp.spec.ts
│   │   │       └── ...
│   │   │
│   │   ├── utils/                    # 测试工具
│   │   │   ├── assertions.ts        # 自定义断言
│   │   │   ├── screenshot.ts        # 截图工具
│   │   │   └── logger.ts            # 日志工具（留空接口）
│   │   │
│   │   └── setup.ts                  # 全局 setup
│   │
│   └── unit/                         # 组件单元测试（Vitest）
│       ├── components/
│       └── hooks/
│
├── playwright.config.ts              # Playwright 配置（已有，需扩展）
└── vitest.config.ts                  # Vitest 配置（已有）
```

## 核心测试用例

### 1. 主应用测试（app/）

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 应用启动 | 验证应用正常启动 | 主窗口加载、侧边栏显示 |
| 导航切换 | 切换不同平台标签 | URL 变化、WebView 加载 |
| 设置保存 | 修改并保存设置 | 持久化生效、重启后保留 |

### 2. 聊天功能测试（chat/）

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 聚合消息列表 | 显示所有平台消息 | 消息数量、来源标识 |
| 实时翻译 | 翻译消息内容 | 翻译结果显示、语言正确 |
| 消息发送 | 通过聚合界面发送 | 消息到达、状态更新 |

### 3. 平台测试（platforms/）

每个平台需测试：

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 平台加载 | WebView 加载平台页面 | 登录状态保持、页面完整 |
| 消息获取 | InjectJS 抓取消息 | 消息格式正确、内容完整 |
| 消息发送 | 通过平台发送消息 | 发送成功、状态反馈 |
| 翻译注入 | 翻译结果显示在平台内 | 样式正确、位置准确 |

### 4. InjectJS 测试

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 脚本注入 | 注入代码执行成功 | GCEngine 对象存在 |
| DOM 选择器 | 正确选中消息元素 | 元素数量、内容匹配 |
| 事件监听 | 新消息触发回调 | 事件触发、数据正确 |

## Page Object Model 设计

### BasePage（页面基类）

```typescript
// tests/e2e/pages/BasePage.ts
import { Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  // 等待页面加载完成
  abstract waitForReady(): Promise<void>;

  // 截图（用于调试和报告）
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }

  // 日志记录（留空接口，后续接入）
  protected log(level: 'info' | 'error', message: string): void {
    // TODO: 接入项目日志系统
  }
}
```

### PlatformPage（平台页面基类）

```typescript
// tests/e2e/pages/platforms/PlatformPage.ts
import { EPlatform } from '@gc/model';
import { BasePage } from '../BasePage';

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage?: Message;
}

export abstract class PlatformPage extends BasePage {
  abstract readonly platform: EPlatform;

  // 通用平台操作
  async waitForLogin(): Promise<void> {
    // 等待登录状态确认
  }

  async getMessages(limit?: number): Promise<Message[]> {
    return this.executeInjectScript(`
      window.gcEngine.${this.platform.toLowerCase()}.getMessages(${limit || 50})
    `);
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    await this.executeInjectScript(`
      window.gcEngine.${this.platform.toLowerCase()}.sendMessage('${chatId}', '${text}')
    `);
  }

  async getConversations(): Promise<Conversation[]> {
    return this.executeInjectScript(`
      window.gcEngine.${this.platform.toLowerCase()}.getConversations()
    `);
  }

  // InjectJS 交互
  async executeInjectScript<T>(script: string): Promise<T> {
    return this.page.evaluate(script) as Promise<T>;
  }

  async waitForGCEngine(): Promise<void> {
    await this.page.waitForFunction(() => typeof window.gcEngine !== 'undefined');
  }
}
```

### 具体平台实现示例

```typescript
// tests/e2e/pages/platforms/TelegramPage.ts
import { EPlatform } from '@gc/model';
import { PlatformPage } from './PlatformPage';

export class TelegramPage extends PlatformPage {
  readonly platform = EPlatform.Telegram;

  async waitForReady(): Promise<void> {
    await this.page.waitForSelector('.chat-list');
    await this.waitForGCEngine();
  }

  // Telegram 特有操作
  async openChat(chatName: string): Promise<void> {
    await this.page.click(`text=${chatName}`);
    await this.page.waitForSelector('.message-list');
  }

  async searchChat(keyword: string): Promise<void> {
    await this.page.fill('.search-input', keyword);
    await this.page.waitForSelector('.search-results');
  }
}
```

## 配置

### Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/specs',

  // 超时设置（真实平台可能较慢）
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // 重试策略
  retries: process.env.CI ? 2 : 0,

  // 并行配置（平台测试不并行，避免冲突）
  fullyParallel: false,
  workers: 1,

  // 报告
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // 项目配置
  projects: [
    {
      name: 'app',
      testMatch: /app\/.*\.spec\.ts/,
    },
    {
      name: 'platforms',
      testMatch: /platforms\/.*\.spec\.ts/,
      dependencies: ['app'],
    },
  ],

  // 开发服务器
  webServer: {
    command: 'bun run dev:renderer',
    url: 'http://localhost:1420',
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
```

### 运行命令

```json
{
  "test:e2e": "playwright test",
  "test:e2e:app": "playwright test --project=app",
  "test:e2e:platforms": "playwright test --project=platforms",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

### Taskfile 集成

```yaml
# Taskfile.yml
test:e2e:
  desc: 运行 E2E 测试
  cmds:
    - bunx playwright test

test:e2e:headed:
  desc: 有头模式运行（可视化调试）
  cmds:
    - bunx playwright test --headed

test:all:
  desc: 运行所有测试
  cmds:
    - task: test
    - task: test:e2e
```

## 日志系统接口（留空）

```typescript
// tests/e2e/utils/logger.ts
import { Page } from '@playwright/test';

export interface LogEntry {
  level: 'info' | 'error' | 'warn';
  message: string;
  timestamp: number;
  data?: unknown;
}

export interface TestLogger {
  info(message: string, data?: unknown): void;
  error(message: string, error?: Error): void;
  screenshot(name: string, page: Page): Promise<void>;

  // 获取测试运行期间的日志（用于断言）
  getLogs(): LogEntry[];

  // 清空日志（每个测试开始时调用）
  clear(): void;
}

// 空实现，后续接入项目日志系统
export const testLogger: TestLogger = {
  info: () => {},
  error: () => {},
  screenshot: async () => {},
  getLogs: () => [],
  clear: () => {},
};
```

## 实施计划

### 阶段划分

| 阶段 | 内容 | 交付物 |
|------|------|--------|
| **阶段 1** | 基础设施搭建 | 目录结构、配置文件、BasePage |
| **阶段 2** | 主应用测试 | app/*.spec.ts、MainAppPage |
| **阶段 3** | 平台测试框架 | PlatformPage 基类、fixtures |
| **阶段 4** | 各平台实现 | 8 个平台的 Page + spec |
| **阶段 5** | 聊天功能测试 | chat/*.spec.ts |
| **阶段 6** | 日志接入 | 对接项目日志系统 |

### 阶段 1 详细任务（基础设施）

1. 创建目录结构
2. 扩展 `playwright.config.ts`
3. 实现 `BasePage.ts`
4. 实现 `tests/e2e/utils/logger.ts`（接口留空）
5. 更新 `Taskfile.yml` 添加测试命令

### 阶段 4 平台实现顺序

建议按使用频率排序：
1. **WhatsApp** - 已有基础测试
2. **Telegram** - 主流平台
3. **Instagram** - 主流平台
4. **Messenger** - Facebook 系
5. **Facebook** - Facebook 系
6. **TikTok**
7. **LinkedIn**
8. **Teams**

## 注意事项

1. **真实平台测试**：测试账号需要保持登录状态，测试前确认
2. **日志系统**：logger.ts 仅定义接口，具体实现待项目日志系统对接
3. **并行限制**：平台测试需串行执行，避免状态冲突
4. **超时设置**：真实平台响应可能较慢，超时设置为 60 秒
