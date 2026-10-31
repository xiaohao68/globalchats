# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 重要规则（必须遵守）

1. **用户不会写代码** - 所有代码由 Claude 编写和维护
2. **文档是核心** - 用户通过文档指导开发，开发前先查阅 `docs/` 目录
3. **完成功能必更新文档** - 代码变更后确保 `docs/` 反映最新状态
4. **中文** - 文档与协作沟通使用中文
5. **禁止自动 git** - 未获明确指令时不得执行任何 `git` 命令
6. **禁止跨包深层导入** - 使用 `@gc/*` 包的 `exports` 暴露的 API
7. **TypeScript strict** - 避免 `any` / `@ts-ignore`
8. **启动清日志** - 每次 Tauri init（`lib.rs` → `clear_logs_before_init()`）清除所有旧日志文件（`app.log` + `logs/current/*.log`），确保每次运行只保留当次日志

**文档索引**: [docs/README.md](docs/README.md)

---

## 项目概述

**Global Chats** (v1.3.0) - Tauri 桌面应用，集成 8 个社交通讯平台（Telegram、WhatsApp、Instagram、Messenger、Facebook、TikTok、LinkedIn、Teams），为跨境电商/社交运营人员提供统一消息聚合和实时翻译。

**技术实现**：Tauri Rust 后端创建 WebView 加载社交平台网页版，通过 `src-preload` 注入 InjectJS 到 WebView 中，实现消息获取和翻译功能扩展。

---

## 常用命令

### 开发（在 `apps/global-chat-desktop/` 下执行）

```bash
task dev:all          # 一键启动前端 + Tauri（推荐）
task dev              # 仅启动前端 (port 1420)
task tauri            # 仅启动 Tauri
task install          # bun install + graphql-codegen
task doctor           # 检查开发环境
task clean            # 清理 dist/ + cargo cache
```

**热重载 InjectJS**（修改 `src-preload/` 后无需重启）：macOS `Cmd+Shift+R` / Windows `Ctrl+Shift+R`

### 构建

```bash
task build:test       # 测试版本 (debug)
task build:prod       # 生产版本 (release)
task build:macos      # 仅 macOS
task build:windows    # 仅 Windows (交叉编译)
```

### 单元测试（Vitest）

```bash
# 根目录 - 运行所有包的测试
bun run test
bun run test:watch
bun run test:coverage

# 单个包
cd packages/gc-engine && bun run test

# 单个文件
cd packages/gc-engine && bunx vitest run src/middleware/__tests__/dedupeStore.test.ts

# 按名称过滤
cd packages/gc-engine && bunx vitest dedupeStore
```

测试文件命名：`*.test.ts`，放在 `__tests__/` 目录或与源文件同级。

### E2E 测试（Playwright）

```bash
task test:e2e         # 运行所有 E2E 测试
task test:e2e:app     # 仅应用测试
task test:e2e:chat    # 仅聊天测试
task test:e2e:platforms # 仅平台测试
task test:e2e:ui      # Playwright UI 模式
task test:e2e:headed  # 可见浏览器模式
task test:e2e:report  # 查看测试报告
```

### GraphQL Codegen

```bash
cd apps/global-chat-desktop && bun graphql-codegen
```

配置：`apps/global-chat-desktop/codegen.ts`，输出到 `packages/api/src/gen/`。

### Turbo 命令（根目录）

```bash
bun run build         # turbo run build
bun run lint          # turbo run lint
bun run check-types   # turbo run check-types
bun run test          # turbo run test
```

---

## 核心架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Tauri Desktop App                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────────────────────────┐    │
│  │ 主应用 (src/) :1420 │  │      第三方平台 WebViews (InjectJS)    │    │
│  │ 状态源 / 持久化写入  │  │  TG | WA | IG | MSG | FB | TT | LI   │    │
│  └────────┬───────────┘  └──────────────┬─────────────────────────┘    │
│           ↓                              ↓                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │            WebView Channel (Tauri Event API)                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                      Rust Backend (src-tauri)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 三层 Store

`globalStore (持久化)` → `userStore (配置)` → `appStore (运行时)`

### GC Engine 中间件层

`packages/gc-engine/` 是核心引擎，采用中间件架构：

- **apps/** - 8 个平台实现（WhatsApp 采用六边形架构：core → application → adapters → sdk）
- **middleware/** - 核心抽象层，屏蔽各平台 SDK 差异
  - `backendApi.ts` - Backend 接口定义（push/poll 两类操作）
  - `imtpBackend.ts` - IMTP 协议实现（WhatsApp 专用，REST API）
  - `tpcaBackend.ts` - TPCA 协议实现（其他平台，GraphQL）
  - `dedupe/` - 去重、`retry/` - 重试、`errors/` - 错误归一化、`realtime/` - 事件总线

### 两种后端协议

- **TPCA** (Third-Party Chat Aggregation) - GraphQL，用于大多数平台
- **IMTP** (Instant Messaging Transport Protocol) - REST API，用于 WhatsApp

### 聚合聊天模块

`apps/global-chat-desktop/src/modules/aggregated-chat/` - 分层架构：

- `store/` - chatStore（会话/消息）、syncStore（同步状态）、uiStore（UI 状态）
- `services/` - SyncEngine（同步引擎）、pollingService（轮询）
- `adapters/` - 数据适配层（ChatTpca → EPlatform）
- `components/` - UI 组件

### InjectJS

`src-preload/index.ts` - 单文件入口，构建为 IIFE 注入到各平台 WebView。通过 `gcEngine.mount()` 启动平台引擎。构建配置：`vite.preload.config.ts`。

---

## Monorepo 包结构

| 包名 | 说明 |
|------|------|
| `@gc/gc-engine` | 核心引擎（8 个平台实现 + 中间件） |
| `@gc/store` | 三层状态管理 |
| `@gc/api` | API 客户端 + GraphQL codegen 生成代码 |
| `@gc/channel` | WebView 通信通道 |
| `@gc/model` | 类型定义和数据模型 |
| `@gc/adapter` | HTTP 适配器层 |
| `@gc/logger` | 统一日志系统 |
| `@gc/ui` | UI 组件库（Radix UI + shadcn/ui） |
| `@gc/i18n` | 国际化 |
| `@gc/utils` | 通用工具函数 |
| `@gc/misc` | 杂项工具（AOP、Observer） |
| `@gc/webview` | WebView 工具 |
| `@gc/app-init` | 应用初始化 |
| `@gc/sync-utils` | 同步工具 |
| `@gc/typescript-config` | 共享 TS 配置 |

### 路径别名

```typescript
import { appStore } from "@gc/store";      // packages/*
import { EPlatform } from "@gc/model";
import { gcEngine } from "@gc/gc-engine";
import { Component } from "@/components";  // src/*
```

---

## 技术栈约束

| 技术 | 版本 | 注意事项 |
|------|------|----------|
| Tauri | 2.x | Rust 后端 |
| React | 19 | + @types/react@19 |
| Zustand | 5.x | 状态管理 |
| TailwindCSS | 4.x | 样式 |
| rolldown-vite | 7.2.1 | **非标准 Vite**，通过 `overrides` 替换 |
| Zod | 3.25 | **不要升级到 Zod 4** |
| Vitest | 4.x | 单元测试 |
| Playwright | 1.58 | E2E 测试 |
| Node.js | >= 24 | |
| Bun | 1.3.5 | 包管理器 |
| Turborepo | 2.7 | Monorepo 构建编排 |

### Git Commit 规范

```
<type>(<scope>): <short summary>
类型：feat / fix / docs / refactor / chore
```

---

## 文档索引

**完整文档**: [docs/README.md](docs/README.md)

| 文档 | 说明 |
|------|------|
| [架构概览](docs/architecture/overview.md) | 系统架构、核心模块 |
| [Store 架构](docs/architecture/store-architecture.md) | 三层状态管理 |
| [聚合聊天](docs/architecture/aggregated-chat.md) | 聚合聊天模块架构 |
| [日志系统](docs/architecture/logging-system.md) | 统一日志系统 |
| [E2E 测试](docs/architecture/e2e-testing.md) | 自动化测试框架 |
| [开发工具](docs/development/dev-tools.md) | 热重载、调试 |
| [疑难排查](docs/development/troubleshooting.md) | 典型问题与解决方案 |
| [文件结构](docs/development/file-structure.md) | 项目文件组织 |
| [命令速查](docs/reference/commands.md) | 常用命令 |
| [技术栈](docs/reference/tech-stack.md) | 技术版本 |
| [架构复刻指南](docs/architecture-replication-guide.md) | 核心架构复刻 |
| [核心技术深度解析](docs/core-technologies-deep-dive.md) | 技术深度解析 |
