# E2E 测试框架架构

本文档描述 Global Chats 的自动化测试体系设计。

## 概述

采用 **Playwright 全栈方案**，覆盖前端 UI、核心包、InjectJS 注入脚本和第三方平台集成。

## 测试架构

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
│  │                    测试目标层                              │  │
│  │  ┌───────┐  ┌─────────┐  ┌──────────┐  ┌─────────────┐   │  │
│  │  │主应用  │  │ 核心包   │  │ InjectJS │  │ 第三方平台   │   │  │
│  │  │ UI    │  │packages │  │ WebView  │  │ TG/WA/IG   │   │  │
│  │  └───────┘  └─────────┘  └──────────┘  └─────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 需求配置

| 维度 | 选择 |
|------|------|
| **目标** | 完整测试体系（功能验证 + 回归防护） |
| **环境** | 本地 + CI/CD |
| **覆盖** | 前端 UI + 核心包 + InjectJS + Rust 后端 |
| **第三方平台** | 真实平台连接（已登录状态） |
| **触发方式** | 手动触发 |

## 目录结构

```
apps/global-chat-desktop/tests/
├── e2e/                          # E2E 测试（Playwright）
│   ├── fixtures/                 # 测试夹具
│   │   ├── base.ts              # 基础 fixture
│   │   └── platform.ts          # 平台相关 fixture
│   │
│   ├── pages/                    # Page Object Model
│   │   ├── BasePage.ts          # 页面基类
│   │   ├── MainAppPage.ts       # 主应用页面
│   │   ├── AggregatedChatPage.ts # 聚合聊天页面
│   │   └── platforms/           # 各平台页面对象
│   │       ├── TelegramPage.ts
│   │       ├── WhatsAppPage.ts
│   │       └── ...
│   │
│   ├── specs/                    # 测试用例
│   │   ├── app/                  # 主应用测试
│   │   ├── chat/                 # 聊天功能测试
│   │   └── platforms/           # 各平台测试
│   │
│   └── utils/                    # 测试工具
│
└── unit/                         # 组件单元测试（Vitest）
```

## 核心测试用例

### 主应用测试

| 用例 | 描述 | 验证点 |
|------|------|--------|
| 应用启动 | 验证应用正常启动 | 主窗口加载、侧边栏显示 |
| 导航切换 | 切换不同平台标签 | URL 变化、WebView 加载 |
| 设置保存 | 修改并保存设置 | 持久化生效、重启后保留 |

### 平台测试

每个平台需测试：

| 用例 | 验证点 |
|------|--------|
| 平台加载 | 登录状态保持、页面完整 |
| 消息获取 | 消息格式正确、内容完整 |
| 消息发送 | 发送成功、状态反馈 |
| 翻译注入 | 样式正确、位置准确 |

## Page Object Model

```typescript
// 页面基类
export abstract class BasePage {
  constructor(protected page: Page) {}
  abstract waitForReady(): Promise<void>;
}

// 平台页面基类
export abstract class PlatformPage extends BasePage {
  abstract readonly platform: EPlatform;

  async getMessages(limit?: number): Promise<Message[]> {
    return this.executeInjectScript(`
      window.gcEngine.${this.platform}.getMessages(${limit})
    `);
  }
}
```

## 运行命令

```bash
# 运行所有 E2E 测试
task test:e2e

# 有头模式（可视化调试）
task test:e2e:headed

# 运行特定项目
bunx playwright test --project=app
bunx playwright test --project=platforms
```

## 注意事项

1. **真实平台测试**: 测试账号需要保持登录状态
2. **并行限制**: 平台测试需串行执行，避免状态冲突
3. **超时设置**: 真实平台响应可能较慢，超时设置为 60 秒

## 相关文档

- [设计文档](../plans/2026-02-04-e2e-testing-design.md)
- [实现计划](../plans/2026-02-04-e2e-testing-implementation.md)
