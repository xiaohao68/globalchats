# 文件结构

本文档描述 Global Chats 项目的文件组织结构。

## 顶层结构

```
gc-app-mono/
├── apps/                    # 应用
│   └── global-chat-desktop/ # 桌面应用
├── packages/                # 共享包
├── docs/                    # 文档
├── logs/                    # 日志（运行时生成）
├── CLAUDE.md                # Claude Code 指引
└── package.json             # 根配置
```

## 桌面应用 (apps/global-chat-desktop)

```
apps/global-chat-desktop/
├── src/                     # 主应用（React, Port 1420）
│   ├── components/          # 通用组件
│   ├── modules/             # 功能模块
│   │   ├── aggregated-chat/ # 聚合聊天模块
│   │   │   ├── components/  # UI 组件（chat/conversation/message/sidebar/layout）
│   │   │   ├── store/       # chatStore / syncStore / uiStore
│   │   │   ├── services/    # SyncEngine / notificationService
│   │   │   ├── hooks/       # useNetworkStatus / useMessageListHooks
│   │   │   ├── adapters/    # 数据适配层
│   │   │   └── types/       # 类型定义
│   │   ├── settings/        # 设置模块
│   │   └── ...
│   ├── hooks/               # 自定义 Hooks
│   ├── utils/               # 工具函数
│   └── App.tsx              # 应用入口
│
├── src-preload/             # InjectJS 入口
│   ├── index.ts             # 主入口
│   └── platforms/           # 各平台注入脚本
│
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── main.rs          # 应用入口
│   │   ├── commands/        # Tauri 命令
│   │   └── lib.rs           # 库定义
│   ├── Cargo.toml           # Rust 依赖
│   └── tauri.conf.json      # Tauri 配置
│
├── tests/                   # 测试
│   ├── e2e/                 # E2E 测试 (Playwright)
│   └── unit/                # 单元测试 (Vitest)
│
├── Taskfile.yml             # Task 命令定义
└── package.json             # 应用配置
```

## 共享包 (packages/)

```
packages/
├── gc-engine/               # ⭐ 核心引擎
│   ├── src/
│   │   ├── apps/            # 8 个平台实现
│   │   │   ├── telegram/
│   │   │   ├── whatsapp/
│   │   │   ├── instagram/
│   │   │   └── ...
│   │   ├── abstract/        # 抽象基类
│   │   └── index.ts
│   └── package.json
│
├── store/                   # 三层 Store
│   ├── src/
│   │   ├── globalStore.ts   # 持久化层
│   │   ├── userStore.ts     # 配置层
│   │   ├── appStore.ts      # 运行时层
│   │   └── helper/          # 辅助函数
│   └── package.json
│
├── channel/                 # WebView 通信
│   ├── src/
│   │   └── webviewChannel.ts
│   └── package.json
│
├── api/                     # GraphQL API 客户端
│   ├── src/
│   │   ├── gql/             # GraphQL 查询
│   │   └── api/             # API 函数
│   └── package.json
│
├── model/                   # 共享类型定义
│   ├── src/
│   │   ├── platform.ts      # EPlatform 枚举
│   │   └── ...
│   └── package.json
│
└── utils/                   # 工具函数
    └── package.json
```

## 文档 (docs/)

```
docs/
├── README.md                         # 文档索引
├── architecture-replication-guide.md # 核心架构文档
├── core-technologies-deep-dive.md    # 核心技术深度解析
│
├── architecture/                     # 模块架构
│   ├── overview.md
│   ├── store-architecture.md
│   ├── aggregated-chat.md
│   ├── logging-system.md
│   └── e2e-testing.md
│
├── development/                      # 开发指南
│   ├── dev-tools.md
│   └── file-structure.md
│
├── reference/                        # 技术参考
│   ├── commands.md
│   └── tech-stack.md
│
└── plans/                            # 实施计划
    └── YYYY-MM-DD-*.md
```

## 路径别名

```typescript
// packages/* 包
import { appStore } from "@gc/store";
import { EPlatform } from "@gc/model";
import { gcEngine } from "@gc/gc-engine";
import { webviewChannel } from "@gc/channel";

// src/* 应用内
import { Component } from "@/components";
import { useXxx } from "@/hooks";
```

## 相关文档

- [开发工具](./dev-tools.md)
- [架构概览](../architecture/overview.md)
