# 自动化验证架构调研对比报告

**日期**: 2026-01-29
**目标**: 让 Claude 能够自动运行和验证应用，查看主 Renderer 和 WebView 日志，实现自主功能验证和 Bug 定位修复

---

## 一、需求分析

### 1.1 核心需求

| 需求 | 描述 |
|------|------|
| **UI 交互验证** | 点击按钮、输入文本、验证界面元素显示 |
| **WebView 通信验证** | 主应用与各平台 WebView 消息传递验证 |
| **数据流验证** | Store 状态变化、API 请求响应验证 |
| **日志查看** | 主 Renderer 和 WebView 的 console.log 捕获 |
| **自动化执行** | Claude 可通过命令行启动、操作、验证应用 |

### 1.2 当前项目现状

| 组件 | 现状 | 问题 |
|------|------|------|
| **Rust 后端日志** | ✅ tauri-plugin-log，输出到 `~/Library/Logs/` | 完善 |
| **前端日志** | ❌ 直接使用 console.log | 无统一管理，无法持久化 |
| **WebView 日志** | ❌ 各平台独立实现 | 无法统一捕获 |
| **E2E 测试** | ❌ 无 | 缺失 |
| **单元测试** | ✅ Vitest，35 个测试文件 | 覆盖良好 |

---

## 二、技术方案对比

### 方案 A：tauri-driver + WebdriverIO

**原理**: 使用 Tauri 官方的 WebDriver 服务器，通过标准 WebDriver 协议控制应用

```
┌─────────────┐     WebDriver      ┌──────────────┐     Native     ┌─────────────┐
│  WebdriverIO │ ──────────────────▶│ tauri-driver │ ──────────────▶│  Tauri App  │
│  (Node.js)   │     Protocol       │  (Port 4444) │     Driver     │  (macOS)    │
└─────────────┘                     └──────────────┘                └─────────────┘
```

**优点**:
- ✅ Tauri 官方支持
- ✅ 标准 WebDriver 协议，生态成熟
- ✅ 可操作真实应用 UI
- ✅ 支持截图、元素定位

**缺点**:
- ❌ macOS 依赖 safaridriver（需要 Safari）
- ❌ 无法直接捕获 WebView console.log
- ❌ 配置复杂，需要构建 release 版本
- ❌ 执行速度较慢

**实现复杂度**: ⭐⭐⭐⭐ (高)

**代码示例**:
```javascript
// wdio.conf.js
export const config = {
  runner: 'local',
  specs: ['./test/e2e/**/*.spec.js'],
  capabilities: [{
    'tauri:options': {
      application: './src-tauri/target/release/bundle/macos/Global Chats.app'
    }
  }],
  services: ['tauri'],
  framework: 'mocha',
};
```

---

### 方案 B：统一日志系统 + CLI 验证工具

**原理**: 构建统一的日志收集系统，所有日志（主 Renderer、WebView、Rust）汇聚到文件，Claude 通过 CLI 工具查询

```
┌─────────────────────────────────────────────────────────────────┐
│                         Tauri App                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Main Render │  │  WebView 1  │  │  WebView N  │              │
│  │  (React)    │  │ (Telegram)  │  │ (WhatsApp)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │   @gc/logger (统一)    │                          │
│              │   - info/warn/error   │                          │
│              │   - 来源标识           │                          │
│              └───────────┬───────────┘                          │
│                          │ Tauri Event                          │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │   Rust Log Collector  │                          │
│              │   tauri-plugin-log    │                          │
│              └───────────┬───────────┘                          │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
              ┌───────────────────────┐
              │   ~/Library/Logs/     │
              │   gc-app.log          │
              │   (JSON Lines 格式)    │
              └───────────────────────┘
                           │
                           ▼
              ┌───────────────────────┐
              │   gc-log CLI 工具      │
              │   - gc-log tail       │
              │   - gc-log query      │
              │   - gc-log filter     │
              └───────────────────────┘
```

**优点**:
- ✅ 实现简单，基于现有 tauri-plugin-log
- ✅ 所有日志统一格式，便于查询
- ✅ 支持实时 tail 和历史查询
- ✅ 可区分日志来源（主 Renderer/各 WebView）
- ✅ 开发模式即可使用，无需构建

**缺点**:
- ❌ 无法直接操作 UI（需配合其他方案）
- ❌ 需要修改现有代码添加日志
- ❌ WebView 日志需要通过 Tauri Event 传递

**实现复杂度**: ⭐⭐ (低)

**代码示例**:
```typescript
// packages/logger/src/index.ts
import { info as tauriInfo, warn as tauriWarn, error as tauriError } from '@tauri-apps/plugin-log';

type LogSource = 'main' | 'telegram' | 'whatsapp' | 'instagram' | /* ... */;

export const createLogger = (source: LogSource) => ({
  info: (msg: string, data?: object) =>
    tauriInfo(JSON.stringify({ source, msg, data, ts: Date.now() })),
  warn: (msg: string, data?: object) =>
    tauriWarn(JSON.stringify({ source, msg, data, ts: Date.now() })),
  error: (msg: string, data?: object) =>
    tauriError(JSON.stringify({ source, msg, data, ts: Date.now() })),
});

// 使用
const log = createLogger('whatsapp');
log.info('User logged in', { userId: '123' });
```

---

### 方案 C：Playwright + Vite Dev Server（仅前端）

**原理**: 使用 Playwright 测试前端 UI，Mock Tauri API

```
┌─────────────┐                    ┌─────────────┐
│  Playwright │ ──────────────────▶│ Vite Server │
│  (Chromium) │     HTTP :1420     │  (React)    │
└─────────────┘                    └──────┬──────┘
                                          │
                                   Mock Tauri API
                                          │
                                   ┌──────▼──────┐
                                   │ @tauri-apps │
                                   │ /api/mocks  │
                                   └─────────────┘
```

**优点**:
- ✅ Playwright 生态成熟，功能强大
- ✅ 支持截图、视频录制、Trace
- ✅ 执行速度快
- ✅ 可测试 UI 交互

**缺点**:
- ❌ 无法测试真实 Tauri API 调用
- ❌ 无法测试 WebView（第三方平台）
- ❌ 需要 Mock 所有 Tauri 调用
- ❌ 与真实应用行为可能有差异

**实现复杂度**: ⭐⭐⭐ (中)

---

### 方案 D：混合方案（推荐）

**原理**: 结合方案 B（日志系统）+ 方案 C（Playwright）+ 自定义验证命令

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              验证架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │  Layer 1: 日志   │   │  Layer 2: UI    │   │  Layer 3: E2E   │           │
│  │  统一日志系统    │   │  Playwright     │   │  tauri-driver   │           │
│  │  (方案 B)       │   │  (方案 C)       │   │  (方案 A)       │           │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│                    ┌─────────────────────────┐                              │
│                    │    gc-verify CLI 工具    │                              │
│                    │                         │                              │
│                    │  gc-verify log tail     │  ← 实时日志                   │
│                    │  gc-verify log query    │  ← 日志查询                   │
│                    │  gc-verify ui test      │  ← UI 测试                    │
│                    │  gc-verify e2e test     │  ← E2E 测试                   │
│                    │  gc-verify health       │  ← 健康检查                   │
│                    └─────────────────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**优点**:
- ✅ 分层验证，覆盖全面
- ✅ 日志系统实现简单，立即可用
- ✅ UI 测试可快速迭代
- ✅ E2E 测试保证真实性
- ✅ 统一 CLI 接口，Claude 易于使用

**缺点**:
- ❌ 需要维护多套测试
- ❌ 初期投入较大

**实现复杂度**: ⭐⭐⭐ (中)

---

## 三、方案对比矩阵

| 维度 | 方案 A | 方案 B | 方案 C | 方案 D |
|------|--------|--------|--------|--------|
| **UI 交互验证** | ✅ 完整 | ❌ 无 | ✅ 完整 | ✅ 完整 |
| **WebView 通信** | ⚠️ 有限 | ✅ 日志可见 | ❌ Mock | ✅ 日志+E2E |
| **数据流验证** | ⚠️ 有限 | ✅ 日志可见 | ⚠️ Mock | ✅ 完整 |
| **日志捕获** | ❌ 无 | ✅ 完整 | ❌ 无 | ✅ 完整 |
| **实现复杂度** | 高 | 低 | 中 | 中 |
| **执行速度** | 慢 | 快 | 快 | 中 |
| **真实性** | 高 | 中 | 低 | 高 |
| **Claude 可用性** | 中 | 高 | 高 | 高 |

---

## 四、推荐方案：方案 D（混合方案）

### 4.1 实施路线图

**Phase 1: 统一日志系统（1-2 天）**
1. 创建 `@gc/logger` 包
2. 集成 `@tauri-apps/plugin-log` 前端 API
3. 替换现有 console.log 调用
4. 创建 `gc-log` CLI 工具

**Phase 2: Playwright UI 测试（2-3 天）**
1. 配置 Playwright
2. 创建 Tauri API Mock 层
3. 编写核心 UI 测试用例
4. 集成到 `gc-verify ui test`

**Phase 3: E2E 测试（可选，3-5 天）**
1. 配置 tauri-driver
2. 编写 E2E 测试用例
3. 集成到 `gc-verify e2e test`

### 4.2 日志格式设计

```json
{
  "ts": 1706520000000,
  "level": "info",
  "source": "whatsapp",
  "category": "sdk",
  "message": "User logged in",
  "data": {
    "userId": "123456",
    "nickname": "John"
  },
  "file": "WhatsappSDK.ts",
  "line": 42
}
```

### 4.3 CLI 工具设计

```bash
# 日志相关
gc-verify log tail                    # 实时查看日志
gc-verify log tail --source=whatsapp  # 过滤特定来源
gc-verify log query --level=error     # 查询错误日志
gc-verify log query --since=5m        # 最近 5 分钟日志

# UI 测试
gc-verify ui test                     # 运行所有 UI 测试
gc-verify ui test --grep="login"      # 运行匹配的测试

# 健康检查
gc-verify health                      # 检查应用状态
gc-verify health --wait               # 等待应用就绪
```

---

## 五、技术细节

### 5.1 tauri-plugin-log 前端 API

项目已安装 `@tauri-apps/plugin-log@2.7.1`，提供以下 API：

```typescript
import {
  trace, debug, info, warn, error,  // 日志方法
  attachLogger,                      // 监听日志
  attachConsole,                     // 输出到控制台
  LogLevel
} from '@tauri-apps/plugin-log';

// 记录日志
await info('User logged in', { file: 'auth.ts', line: 42 });

// 监听所有日志
const unlisten = await attachLogger((payload) => {
  console.log(`[${payload.level}] ${payload.message}`);
});
```

### 5.2 WebView 日志捕获方案

由于 WebView 运行在独立进程，需要通过 Tauri Event 传递日志：

```typescript
// WebView 中 (src-preload)
import { emit } from '@tauri-apps/api/event';

const originalConsoleLog = console.log;
console.log = (...args) => {
  originalConsoleLog(...args);
  emit('webview-log', {
    source: 'telegram',
    level: 'info',
    message: args.map(String).join(' '),
    ts: Date.now()
  });
};

// 主应用中
import { listen } from '@tauri-apps/api/event';
import { info } from '@tauri-apps/plugin-log';

listen('webview-log', (event) => {
  const { source, level, message } = event.payload;
  info(JSON.stringify({ source, level, message }));
});
```

### 5.3 日志文件位置

- **macOS**: `~/Library/Logs/com.socialsmart.globalchats.app/Global Chats.log`
- **Windows**: `%APPDATA%/com.socialsmart.globalchats.app/logs/`
- **Linux**: `~/.local/share/com.socialsmart.globalchats.app/logs/`

---

## 六、参考资源

- [Tauri WebDriver 测试文档](https://v2.tauri.app/develop/tests/webdriver/example/selenium/)
- [WebdriverIO 官方文档](https://webdriver.io/docs/bestpractices/)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)
- [@tauri-apps/plugin-log NPM](https://www.npmjs.com/package/@tauri-apps/plugin-log)
- [tauri-plugin-log GitHub](https://github.com/tauri-apps/tauri-plugin-log)

---

## 七、下一步行动

1. **确认方案选择** - 是否采用推荐的混合方案 D？
2. **优先级确认** - 先实现日志系统还是 UI 测试？
3. **开始实施** - 创建实施计划并开始编码
