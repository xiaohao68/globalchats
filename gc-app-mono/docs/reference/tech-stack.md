# 技术栈

本文档列出 Global Chats 使用的主要技术和版本。

## 核心技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 桌面框架 | Tauri | 2.9.5 | 跨平台桌面应用框架 |
| UI 框架 | React | 19.0.0 | 前端 UI 库 |
| 状态管理 | Zustand | 5.0.8 | 轻量级状态管理 |
| 样式 | TailwindCSS | 4.1.16 | 原子化 CSS 框架 |
| 构建工具 | Turborepo | 2.7.2 | Monorepo 构建 |
| 包管理 | Bun | 1.3.5 | 运行时和包管理器 |
| 打包工具 | rolldown-vite | 7.2.1 | 构建打包（非标准 Vite） |

## 运行时要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 24 | JavaScript 运行时 |
| Bun | 1.3.5 | 包管理和脚本执行 |
| Rust | latest | Tauri 后端构建 |
| macOS | >= 14.0 | 开发环境 |

## 注意事项

### rolldown-vite

项目使用 `rolldown-vite 7.2.1` 而非标准 Vite，通过 `package.json` 的 `overrides` 配置替换：

```json
{
  "overrides": {
    "vite": "npm:rolldown-vite@7.2.1"
  }
}
```

### React 19

使用 React 19 + 对应的类型定义：

```json
{
  "dependencies": {
    "react": "19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0"
  }
}
```

### Zod 版本

使用 **Zod 3.25**，不要升级到 Zod 4（存在兼容性问题）。

### TailwindCSS 4.x

使用 TailwindCSS 4.x，配置方式与 3.x 有所不同。

## 测试框架

| 工具 | 用途 |
|------|------|
| Vitest | 单元测试、组件测试 |
| Playwright | E2E 测试 |

## 相关文档

- [命令速查](./commands.md)
- [架构概览](../architecture/overview.md)
