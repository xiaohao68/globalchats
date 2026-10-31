# 文档结构重组设计

**日期**: 2026-02-05
**状态**: 待实施
**目标**: 同步最新功能、重组目录结构、提升可发现性

---

## 背景

### 当前问题

1. **结构不匹配**: CLAUDE.md 描述的目录结构与实际不符
   - `docs/architecture/` — 不存在
   - `docs/development/` — 不存在
   - `docs/reference/` — 不存在

2. **功能未同步**: 最近实现的功能未反映到文档
   - E2E 自动化测试框架
   - 统一日志系统
   - 聚合聊天实数据同步
   - 玻璃拟态 UI 设计

3. **可发现性差**: 缺少按功能/意图的索引

---

## 目标结构

```
docs/
├── README.md                         ← 文档索引（重构）
├── architecture-replication-guide.md ← 核心架构（保留）
├── core-technologies-deep-dive.md    ← 核心技术（保留）
│
├── architecture/                     ← 模块架构（新建）
│   ├── overview.md                   ← 架构概览
│   ├── store-architecture.md         ← 三层 Store 详解
│   ├── aggregated-chat.md            ← 聚合聊天模块架构
│   ├── logging-system.md             ← 统一日志系统架构
│   └── e2e-testing.md                ← E2E 测试框架架构
│
├── development/                      ← 开发指南（新建）
│   ├── dev-tools.md                  ← 开发工具（热重载等）
│   └── file-structure.md             ← 文件结构详解
│
├── reference/                        ← 技术参考（新建）
│   ├── commands.md                   ← 命令速查
│   └── tech-stack.md                 ← 技术栈版本
│
└── plans/                            ← 实施计划（保留）
```

---

## 文件清单

### 需要创建的文件（9 个）

| 文件 | 内容来源 |
|------|----------|
| `architecture/overview.md` | CLAUDE.md 架构章节扩展 |
| `architecture/store-architecture.md` | core-technologies-deep-dive.md 第4节 |
| `architecture/aggregated-chat.md` | plans/2026-02-02-aggregated-chat-real-data-design.md 提炼 |
| `architecture/logging-system.md` | plans/2026-02-04-unified-logging-system-design.md 提炼 |
| `architecture/e2e-testing.md` | plans/2026-02-04-e2e-testing-design.md 提炼 |
| `development/dev-tools.md` | apps/global-chat-desktop/DEV_TOOLS_README.md 迁移 |
| `development/file-structure.md` | CLAUDE.md 文件结构章节扩展 |
| `reference/commands.md` | CLAUDE.md 常用命令章节 |
| `reference/tech-stack.md` | CLAUDE.md 技术栈章节 |

### 需要更新的文件（2 个）

| 文件 | 变更内容 |
|------|----------|
| `CLAUDE.md` | 精简内容，修复链接（约 220→150 行） |
| `docs/README.md` | 重构为快速入口 + 功能索引 |

---

## CLAUDE.md 变更

### 精简原则

- 移除详细内容，用链接指向子文档
- 保留：项目概述、重要规则、必须遵守
- 精简：架构图、技术栈、文件结构、命令

### 修复的链接

| 原链接（不存在） | 新链接 |
|------------------|--------|
| `docs/architecture/overview.md` | ✅ 创建 |
| `docs/architecture/store-architecture.md` | ✅ 创建 |
| `docs/development/file-structure.md` | ✅ 创建 |
| `docs/development/dev-tools.md` | ✅ 创建 |
| `docs/reference/commands.md` | ✅ 创建 |
| `docs/reference/tech-stack.md` | ✅ 创建 |

---

## docs/README.md 重构

### 新结构

```markdown
# Global Chats 项目文档

## 🚀 快速入口

| 我想... | 去看 |
|---------|------|
| 了解整体架构 | [架构复刻指南](./architecture-replication-guide.md) |
| 深入技术细节 | [核心技术深度解析](./core-technologies-deep-dive.md) |
| 启动开发环境 | [开发工具](./development/dev-tools.md) |
| 查命令 | [命令速查](./reference/commands.md) |

## 📁 目录结构

- **核心文档** — 入门必读，在 docs/ 根目录
- **architecture/** — 模块架构设计
- **development/** — 开发指南
- **reference/** — 技术参考
- **plans/** — 实施计划

## 🔍 按功能查找

### 聚合聊天
- 架构: architecture/aggregated-chat.md
- 计划: plans/2026-02-02-aggregated-chat-*.md

### 日志系统
- 架构: architecture/logging-system.md
- 计划: plans/2026-02-04-unified-logging-*.md

### E2E 测试
- 架构: architecture/e2e-testing.md
- 计划: plans/2026-02-04-e2e-testing-*.md
```

---

## 实施步骤

1. **创建目录结构**
   - `mkdir -p docs/architecture docs/development docs/reference`

2. **创建 architecture/ 文件**
   - overview.md
   - store-architecture.md
   - aggregated-chat.md
   - logging-system.md
   - e2e-testing.md

3. **创建 development/ 文件**
   - dev-tools.md
   - file-structure.md

4. **创建 reference/ 文件**
   - commands.md
   - tech-stack.md

5. **更新现有文件**
   - docs/README.md
   - CLAUDE.md

6. **验证**
   - 检查所有链接有效
   - 确保无重复内容

---

## 设计原则

1. **核心文档保留根目录** — 架构复刻指南和技术深度解析是入门必读
2. **不重复内容** — 子文档是详细版，CLAUDE.md 保持精简并链接
3. **plans/ 保留原位** — architecture/ 是提炼后的稳定版本
4. **按意图导航** — README.md 提供"我想做X"的快速入口
