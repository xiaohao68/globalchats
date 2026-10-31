# Global Chats 项目文档

> 📚 本目录包含 Global Chats 项目的完整技术文档

## 🚀 快速入口

| 我想... | 去看 |
|---------|------|
| 了解整体架构 | [架构复刻指南](./architecture-replication-guide.md) |
| 深入技术细节 | [核心技术深度解析](./core-technologies-deep-dive.md) |
| 启动开发环境 | [开发工具](./development/dev-tools.md) |
| 查命令 | [命令速查](./reference/commands.md) |
| 了解文件结构 | [文件结构](./development/file-structure.md) |
| 排查常见问题 | [疑难排查](./development/troubleshooting.md) |

---

## 📁 目录结构

```
docs/
├── 核心文档（入门必读）
│   ├── architecture-replication-guide.md  # 架构复刻指南
│   └── core-technologies-deep-dive.md     # 核心技术深度解析
│
├── architecture/    # 模块架构设计
│   ├── overview.md            # 架构概览
│   ├── store-architecture.md  # 三层 Store 架构
│   ├── aggregated-chat.md     # 聚合聊天模块
│   ├── logging-system.md      # 统一日志系统
│   └── e2e-testing.md         # E2E 测试框架
│
├── development/     # 开发指南
│   ├── dev-tools.md           # 开发工具（热重载等）
│   ├── troubleshooting.md     # 疑难排查手册
│   └── file-structure.md      # 文件结构详解
│
├── reference/       # 技术参考
│   ├── commands.md            # 命令速查
│   └── tech-stack.md          # 技术栈版本
│
└── plans/           # 实施计划
    └── YYYY-MM-DD-*.md        # 各功能设计/实施文档
```

---

## 🔍 按功能查找

### 聚合聊天

- 架构: [architecture/aggregated-chat.md](./architecture/aggregated-chat.md)
- 设计: [plans/2026-02-02-aggregated-chat-real-data-design.md](./plans/2026-02-02-aggregated-chat-real-data-design.md)
- 同步: [plans/2026-02-03-aggregated-chat-sync-implementation.md](./plans/2026-02-03-aggregated-chat-sync-implementation.md)
- 通知: [plans/2026-03-04-notification-system-design.md](./plans/2026-03-04-notification-system-design.md)

### 日志系统

- 架构: [architecture/logging-system.md](./architecture/logging-system.md)
- 设计: [plans/2026-02-04-unified-logging-system-design.md](./plans/2026-02-04-unified-logging-system-design.md)
- 实现: [plans/2026-02-04-unified-logging-implementation.md](./plans/2026-02-04-unified-logging-implementation.md)

### E2E 测试

- 架构: [architecture/e2e-testing.md](./architecture/e2e-testing.md)
- 设计: [plans/2026-02-04-e2e-testing-design.md](./plans/2026-02-04-e2e-testing-design.md)
- 实现: [plans/2026-02-04-e2e-testing-implementation.md](./plans/2026-02-04-e2e-testing-implementation.md)

### Store 状态管理

- 架构: [architecture/store-architecture.md](./architecture/store-architecture.md)
- 深度解析: [core-technologies-deep-dive.md#4-三层-store-架构](./core-technologies-deep-dive.md#4-三层-store-架构)

### 多代理/多开

- 设计: [plans/2026-01-30-multi-proxy-aggregated-chat-design.md](./plans/2026-01-30-multi-proxy-aggregated-chat-design.md)
- 实现: [plans/2026-01-30-multi-proxy-implementation.md](./plans/2026-01-30-multi-proxy-implementation.md)

---

## 🛠️ 新开发者上手流程

1. **了解架构** → 阅读 [架构复刻指南](./architecture-replication-guide.md)
2. **掌握核心技术** → 阅读 [核心技术深度解析](./core-technologies-deep-dive.md)
3. **配置开发环境** → 参考 [开发工具](./development/dev-tools.md)
4. **了解文件结构** → 阅读 [文件结构](./development/file-structure.md)

---

## 📝 文档维护规则

### 重要原则

1. **用户不写代码** - 所有代码由 Claude Code 实现
2. **文档是核心** - 用户通过文档指导开发方向
3. **及时更新** - 完成功能后必须更新 `docs/` 文档
4. **保持同步** - CLAUDE.md 与 docs/ 文档内容保持一致

### 文档更新流程

```
完成功能实现
    ↓
更新或创建对应文档（docs/）
    ↓
更新 CLAUDE.md 中的引用链接（如有必要）
    ↓
更新本 README.md 索引（如有必要）
```

---

## 📚 相关资源

- [CLAUDE.md](../CLAUDE.md) - Claude Code 项目指引文件
- [package.json](../package.json) - 项目依赖和脚本
- [Tauri 配置](../apps/global-chat-desktop/src-tauri/tauri.conf.json)

---

**文档版本**: 2026-03-04
**维护者**: Claude Code
