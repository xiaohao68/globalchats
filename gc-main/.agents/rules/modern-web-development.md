# 现代 Web 开发规范

## 概述

你是 TypeScript、Node.js、Next.js 14 App Router、React、Supabase、GraphQL、Genql、Tailwind CSS、Radix UI 和 Shadcn UI 的专家开发者。

---

## 关键原则

- 编写简洁、技术性的回复，提供准确的 TypeScript 示例
- 使用函数式、声明式编程。避免使用类
- 优先使用迭代和模块化而非重复
- 使用描述性变量名加助动词（如 `isLoading`, `hasError`）
- 目录使用小写加破折号（如 `components/auth-wizard`）
- 组件使用命名导出
- 使用 RORO（Receive an Object, Return an Object）模式

---

## JavaScript/TypeScript

- 纯函数使用 `function` 关键字。不使用分号
- 所有代码使用 TypeScript。优先使用接口而非类型
- 文件结构：导出的组件、子组件、辅助函数、静态内容、类型
- 条件语句中避免不必要的花括号
- 单行语句的条件判断省略花括号
- 简单条件语句使用简洁的单行语法（如 `if (condition) doSomething()`）

---

## 错误处理和验证

- 优先处理错误和边缘情况
- 在函数开头处理错误和边缘情况
- 使用 early returns 避免深层嵌套的 if 语句
- 快乐路径放在最后以提高可读性
- 避免不必要的 else 语句；使用 if-return 模式
- 使用 guard clauses 提前处理前置条件和无效状态
- 实现适当的错误日志和用户友好的错误消息
- 考虑使用自定义错误类型或错误工厂实现一致的错误处理

---

## AI SDK 集成

- 使用 Vercel AI SDK UI 实现流式聊天 UI
- 使用 Vercel AI SDK Core 与语言模型交互
- 使用 Vercel AI SDK RSC 和 Stream Helpers 流式生成
- 为 AI 响应和模型切换实现适当的错误处理
- 为 AI 模型不可用时实现回退机制
- 优雅地处理速率限制和配额超出场景
- 为用户提供清晰的 AI 交互失败错误消息
- 在发送消息到 AI 模型之前对用户消息进行适当的输入清理
- 使用环境变量存储 API 密钥和敏感信息

---

## React/Next.js

- 使用函数组件和 TypeScript 接口
- 使用声明式 JSX
- 组件使用 `function`，而非 `const`
- 使用 Shadcn UI、Radix 和 Tailwind CSS 进行组件和样式
- 使用 Tailwind CSS 实现响应式设计。移动优先方法
- 将静态内容和接口放在文件末尾
- 使用内容变量存储渲染函数外的静态内容
- 最小化 `use client`、`useEffect` 和 `setState`。优先使用 React Server Components (RSC)
- 使用 Zod 进行表单验证
- 使用 Suspense 包装客户端组件并设置 fallback
- 对非关键组件使用动态加载
- 优化图片：WebP 格式、尺寸数据、懒加载
- 将预期错误建模为返回值：避免在 Server Actions 中使用 try/catch 处理预期错误
- 使用错误边界处理意外错误：使用 `error.tsx` 和 `global-error.tsx` 实现错误边界
- 将 react-hook-form 与 useActionState 用于表单验证
- services/ 目录中的代码始终抛出用户友好的错误，这些错误可以被捕获并显示给用户
- 对所有 server actions 使用 next-safe-action
- 实现类型安全的 server actions 和适当的验证
- 优雅地处理错误并返回适当的响应

---

## GraphQL（项目适配）

- 使用 Apollo Client 进行 GraphQL 交互（项目使用）
- 优化 GraphQL 查询只获取必要的数据
- 实现适当的身份验证和授权

---

## 关键约定

1. 依靠 Next.js App Router 进行状态更改和路由
2. 优先考虑 Web Vitals (LCP, CLS, FID)
3. 最小化 `use client` 使用：
   - 优先使用服务器组件和 Next.js SSR 功能
   - 只在需要访问 Web API 的小组件中使用 `use client`
   - 避免在数据获取或状态管理中使用 `use client`
4. 遵循 monorepo 结构：
   - 共享代码放在 `packages` 目录
   - 应用特定代码放在 workspace packages
5. 使用 pnpm 脚本进行开发和部署任务
6. 遵循定义的数据库模式

---

## 命名约定

- 布尔值：使用助动词如 `does`、`has`、`is`、`should`（如 `isDisabled`、`hasError`）
- 文件名：使用小写加破折号（如 `auth-wizard.tsx`）
- 文件扩展名：适当使用 `.config.ts`、`.test.ts`、`.context.tsx`、`.type.ts`、`.hook.ts`

---

## 组件结构

- 将组件分解为具有最少 props 的较小部分
- 为组件建议微文件夹结构
- 使用组合构建复杂组件
- 遵循顺序：组件声明、样式组件（如果有）、TypeScript 类型

---

## 数据获取和状态管理

- 尽可能使用 React Server Components 进行数据获取
- 实现 preload 模式防止瀑布流
- 使用 Zustand 进行状态管理（项目使用）
- 使用 React Hook Form + Zod 进行表单验证

---

## 样式

- 使用 Tailwind CSS 进行样式，遵循 Utility First 方法
- 使用 Class Variance Authority (CVA) 管理组件变体

---

## 测试

- 为工具函数和 hooks 实现单元测试
- 为复杂组件和页面使用集成测试
- 为关键用户流程实现端到端测试

---

## 可访问性

- 确保界面可键盘导航
- 为组件实现适当的 ARIA 标签和角色
- 确保颜色对比度符合 WCAG 可读性标准

---

## 文档

- 为复杂逻辑提供清晰简洁的注释
- 使用 JSDoc 注释为函数和组件提供 IDE 智能提示
- 保持 README 文件更新，包含设置说明和项目概述

---

## 项目适配

本项目是一个 pnpm monorepo，包含：

**后端 (gc-api)：**
- NestJS 10.x
- GraphQL (@nestjs/graphql)
- TypeORM + SQLite
- JWT 认证
- OpenAI SDK + Anthropic SDK

**前端 (gc-webapp)：**
- Next.js 16.1.6 (App Router)
- React 19
- Tailwind CSS 4
- Radix UI
- Apollo Client (GraphQL)
- Zustand（状态管理）
- React Hook Form + Zod

**公共网站 (gc-www)：**
- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4

注意：
- 后端运行在端口 3301
- Webapp 运行在端口 3302
- 网站运行在端口 3300
- 使用 `pnpm dev` 运行所有服务
