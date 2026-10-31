# 全方面测试计划

**日期**: 2026-02-19
**目标**: 全方面测试项目（代码质量 + 单元测试 + E2E + IMTP 新功能）

## 测试范围

### 1. 代码质量检查
- TypeScript 类型检查 (`turbo run check-types`)
- ESLint 检查 (`turbo run lint`)
- 代码格式检查 (Prettier)

### 2. 单元测试
- 所有包的 Vitest 单元测试
- 覆盖率检查
- **新增 IMTP 功能测试**:
  - `SyncEngine.ts` - 同步引擎
  - `imtpBackend.ts` - IMTP 后端
  - `syncStore.ts` - 同步状态管理
  - `chatStore.ts` - 聊天状态管理

### 3. E2E 测试 (Playwright)
- 应用启动测试
- 导航测试
- 聚合聊天测试
- 平台测试 (Telegram, WhatsApp)
- UI 交互测试

### 4. 问题修复
- 修复测试中发现的问题
- 确保所有测试通过

## 测试命令

```bash
# 代码质量
bun run check-types
bun run lint

# 单元测试
bun run test
bun run test:coverage

# E2E 测试
task test:e2e

# 单独运行
cd packages/gc-engine && bun run test
cd apps/global-chat-desktop && bun playwright test
```

## 预期结果

所有测试必须通过，无阻塞性问题。
