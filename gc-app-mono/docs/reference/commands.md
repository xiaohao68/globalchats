# 命令速查

本文档列出 Global Chats 开发中常用的命令。

## 开发命令

### Desktop App（需 cd apps/global-chat-desktop）

```bash
# 一键启动开发环境（前端 + Tauri）
task dev:all

# 分别启动
task dev       # 仅启动前端 (Port 1420)
task tauri     # 仅启动 Tauri

# 构建
task build:test   # 测试构建
task build:prod   # 生产构建
```

### 根目录

```bash
# 开发
bun run dev      # 启动开发服务器
bun run build    # 生产构建
bun run lint     # 代码检查
```

## 测试命令

```bash
# E2E 测试（Playwright）
task test:e2e           # 运行所有 E2E 测试
task test:e2e:headed    # 有头模式（可视化调试）

# 单元测试（Vitest）
bun run test            # 运行单元测试
bun run test:watch      # 监听模式
```

## 日志命令

```bash
# 查询错误日志
bun run logs:errors --since=1h

# 实时查看日志
tail -f logs/current/rust.log
tail -f logs/current/main.log
```

## 快捷键

### InjectJS 热重载

| 平台 | 快捷键 |
|------|--------|
| macOS | `Cmd + Shift + R` |
| Windows | `Ctrl + Shift + R` |

修改 `src-preload/` 下的代码后使用，无需重启应用。

## Git 命令（需明确指令）

> ⚠️ Claude Code 禁止自动执行 git 命令，以下仅供参考。

```bash
# 提交（中文 Commit Message）
git commit -m "feat(module): 添加新功能"
git commit -m "fix(module): 修复 xxx 问题"
git commit -m "docs: 更新文档"
git commit -m "refactor(module): 重构 xxx"
git commit -m "chore: 杂项更新"
```

## 相关文档

- [开发工具](../development/dev-tools.md)
- [技术栈](./tech-stack.md)
