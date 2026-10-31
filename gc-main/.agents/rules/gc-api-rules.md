# NestJS 后端开发规范（gc-api）

## 概述

你是一位资深 TypeScript 程序员，熟悉 NestJS 框架，偏好整洁的编程风格和设计模式。生成的代码、修复和重构应符合基本原则和命名规范。

---

## TypeScript 通用指南

### 基本原则

- 所有代码和文档使用英文
- 为每个变量和函数声明类型（参数和返回值）
- 避免使用 `any`
- 创建必要的类型
- 使用 JSDoc 文档化公共类和方法
- 函数内部不要留空行
- 每个文件一个导出

### 命名规范

| 类型 | 规则 |
|------|------|
| 类 | PascalCase |
| 变量、函数、方法 | camelCase |
| 文件和目录 | kebab-case |
| 环境变量 | UPPERCASE |
| 布尔变量 | 使用动词如 `isLoading`, `hasError`, `canDelete` |
| 函数 | 以动词开头 |

- 避免魔法数字，定义常量
- 使用完整单词而非缩写（API、URL 等标准缩写除外）
- 例外：`i, j` 用于循环，`err` 用于错误，`req, res, next` 用于中间件

### 函数

- 编写单一职责的短函数（少于 20 条指令）
- 使用动词和描述性名称命名函数
- 如果返回布尔值，使用 `isX`, `hasX`, `canX`
- 如果不返回任何值，使用 `executeX`, `saveX` 等
- 使用 early returns 避免嵌套代码块
- 使用高阶函数（map, filter, reduce）
- 简单函数（< 3 行）使用箭头函数
- 复杂函数使用命名函数
- 使用默认参数值代替空值检查
- 使用 RO-RO 模式：传入多个参数作为对象，返回结果作为对象

### 数据

- 不要滥用原始类型，将数据封装在复合类型中
- 使用内部验证的类而不是在函数中验证
- 优先使用不可变性：使用 `readonly` 和 `as const`

### 类

- 遵循 SOLID 原则
- 优先使用组合而非继承
- 使用接口定义契约
- 编写小而单一的类：< 200 条指令，< 10 个公共方法，< 10 个属性

### 异常

- 使用异常处理意外错误
- 如果捕获异常，应该是为了修复预期问题或添加上下文
- 否则使用全局处理器

### 测试

- 遵循 Arrange-Act-Assert 约定
- 清晰地命名测试变量：`inputX`, `mockX`, `actualX`, `expectedX`
- 为每个公共函数编写单元测试
- 使用测试替身模拟依赖
- 为每个模块编写验收测试（Given-When-Then）

---

## NestJS 特定指南

### 模块化架构

- 每个主域/路由一个模块
- 一个控制器负责其路由，其他控制器负责次要路由
- `models/` 文件夹存放数据类型
- 使用 class-validator 验证 DTO
- Services 模块存放业务逻辑和持久化
- 使用 TypeORM（项目使用）
- 每个实体一个 Service

### NestJS 核心组件

- **全局过滤器**：异常处理
- **全局中间件**：请求管理
- **守卫**：权限管理
- **拦截器**：请求/响应转换
- **共享模块**：共享服务
- **工具类**：共享业务逻辑

### NestJS 测试

- 使用 Jest 框架
- 为每个控制器和服务编写测试
- 为每个 API 模块编写 E2E 测试
- 为每个控制器添加 admin/test 方法作为冒烟测试

---

## 项目适配

本项目使用：

- NestJS 10.x
- TypeORM + SQLite
- GraphQL (@nestjs/graphql)
- JWT 认证

注意：

- 实体使用 TypeORM 装饰器
- GraphQL code-first 方式自动生成类型
- 使用 @nestjs/jwt + passport-jwt 进行认证

---

## 目录结构规范（gc-api）

### 1. 适用范围与优先级

#### 适用范围

- 仅适用于 `packages/gc-api/src` 下的目录结构、依赖方向、命名和文件组织。
- 本规则关注"结构与边界"，不替代业务实现规则。

#### 与现有规则的关系

- 测试开发流程仍以 [.agents/rules/test-driven-development.md](.agents/rules/test-driven-development.md) 为准。
- GraphQL 三态传值仍以 [.agents/rules/graphql-value-handling.md](.agents/rules/graphql-value-handling.md) 为准。

#### 优先级

- 当"结构约束"和"实现便利"冲突时，优先满足结构约束。
- 若存在历史遗留冲突，按"历史豁免清单"执行，且仅可减少，不可新增。

---

### 2. 目标架构（保留混合架构，收敛边界）

`gc-api` 采用混合架构：

- `common/`: 通用能力层（decorators/filters/logger/utils/constants），不承载业务语义。
- `database/`: 基础设施层（连接管理、迁移执行、初始化编排）。
- `domains/`: 业务域层（实体、业务服务、域内 resolver、域迁移）。
- `modules/`: 横切应用层（auth/graphql/admin/agent/health）。

`app.module.ts` 仅负责模块装配，不承载业务逻辑。

---

### 3. 标准目录模板

#### Domain 模板（按复杂度裁剪）

```text
domains/<domain>/
  <domain>.module.ts
  <domain>.service.ts            # 或 services/
  <domain>.resolver.ts           # 可选，GraphQL domain 可放这里
  dto/
  entities/
  database/
    migrations/
  guards/                        # 可选
  policies/                      # 可选
  index.ts                       # domain 公共边界导出
```

#### Domain 内部扁平化（强制）

- `domains/` 顶层只允许保留领域目录：`core/`, `im/`, `workspace/`。
- 在 `domains/<domain>/` 内，禁止新增"业务子领域目录"二次嵌套（例如 `domains/core/user/`, `domains/im/im-whatsapp/`, `domains/workspace/model/`）。
- `domains/<domain>/` 下仅允许以下技术型子目录：`database/`, `dto/`, `entities/`, `guards/`, `policies/`, `services/`, `enums/`。
- `<feature>.module.ts`、`<feature>.service.ts`、`<feature>.resolver.ts` 应直接放在 `domains/<domain>/` 根目录（或按技术分层放入 `services/`），不得再包一层 `<feature>/`。
- 触达旧代码时，若发现子领域目录，必须在当前改动范围内迁移为扁平结构；禁止新增或扩散历史嵌套。

#### Module 模板（横切能力）

```text
modules/<module>/
  <module>.module.ts
  <module>.service.ts
  <module>.resolver.ts           # GraphQL
  <module>.controller.ts         # REST
  guards/                        # 可选
  inputs/                        # 可选
  types/                         # 可选
  decorators/                    # 可选
```

---

### 4. 命名与文件组织强约束

#### 命名规则

- 目录与普通文件使用 `kebab-case`。
- 类名使用 `PascalCase`。
- 变量、函数、方法使用 `camelCase`。

#### 测试文件规则

- 单元测试必须与被测文件同目录放置，命名为 `*.spec.ts`。
- 禁止新增 `__tests__/` 目录。
- 历史 `__tests__/` 文件可以保留，但触达时优先迁移为 colocated `*.spec.ts`。

#### Migration 文件规则

- 新 migration 文件名必须为：`YYYYMMDDHHmmss-<action>-<target>.migration.ts`。
- `<action>`、`<target>` 仅允许小写字母、数字、连字符。
- 历史 PascalCase migration 不要求一次性改名，见"历史豁免清单"。

#### UUID 规范（强制）

- 所有表的主键 `id` 必须使用 UUID v7。
- 涉及 UUID 的实现（实体字段、DTO、输入参数、默认值生成、工具函数、测试数据等），若无明确例外要求，默认使用 UUID v7。

---

### 5. 依赖方向与禁止项（核心）

#### 依赖方向总则

- 允许：`modules -> domains -> common`。
- `database` 为基础设施层，不承载业务 API，不作为业务边界入口。
- `domains` 默认禁止反向依赖 `modules`。

#### 允许依赖矩阵

| From | Allowed Imports |
|------|------------------|
| `modules/*` | `domains/*`, `common/*`, `database/*` |
| `domains/*` | `domains/core/*`, `common/*`, `database/*` |
| `database/*` | `domains/*`, `common/*`（仅基础设施用途） |
| `common/*` | Node/NPM 三方依赖、`common/*` |

#### 禁止项

- 禁止新增 `domains/* -> modules/*` 依赖。
- 禁止跨 domain 深层导入内部实现（例如 `domains/x/services/*`、`domains/x/entities/*`）。
- 禁止在 `domains/<domain>/` 下新增业务子领域目录（例如 `domains/<domain>/<feature>/`）。
- 跨 domain 访问应优先通过对方 `domains/<domain>/index.ts` 边界导出，或本规则明确允许的子入口。

---

### 6. Barrel（index.ts）策略

#### 允许位置

- `domains/<domain>/index.ts`
- `domains/<domain>/dto/index.ts`（可选）
- `domains/<domain>/entities/index.ts`（可选）
- `domains/<domain>/database/index.ts`（可选）

#### 约束规则

- `index.ts` 仅用于"边界导出"，不用于隐藏内部依赖链。
- 禁止跨层 `export *` 把内部实现无差别透传到外部边界。
- 外部模块应依赖边界导出，不应反向穿透目录层级。

---

### 7. 增量迁移策略（强制）

#### 执行策略

- 新增代码必须满足本规则。
- 修改旧代码遵循"触达即治理"：至少不引入新增违规，并优先修复触达范围内违规。
- 不做全仓一次性重构。

#### 违规分级

- `P0`：新增反向依赖（如新增 `domains/* -> modules/*`）或新增 `domains` 业务子领域嵌套目录，阻断合并。
- `P1`：新增命名/路径不规范，需在当前 PR 修复或附带明确整改计划。
- `P2`：历史遗留问题，登记 backlog，按触达逐步清理。

---

### 8. 当前状态基线（2026-02-28）

以下是规则制定时仓库现状，用于避免规则与当前代码冲突。

#### 顶层结构基线

- `packages/gc-api/src` 当前含：`common/`, `database/`, `domains/`, `modules/`, `app.module.ts`, `main.ts`。

#### 反向依赖基线

- 当前存在 `domains/* -> modules/graphql/*` 的历史依赖（如 `GqlAuthGuard`, `OptionalGqlAuthGuard`, `JSONScalar`, `CurrentUser` 等）。
- 该类依赖进入"临时豁免清单"，规则生效后仅可减少、不可新增。

#### 测试布局基线

- 当前存在 `domains/im/im-whatsapp/__tests__/` 历史目录。
- 规则生效后禁止新增新的 `__tests__/`。

---

### 9. PR 检查清单（必须逐项核对）

- [ ] 是否新增 `domains -> modules` 反向依赖。
- [ ] 是否新增 `domains/<domain>/<feature>/` 业务子领域目录嵌套。
- [ ] 是否新增跨 domain 深层导入（未走边界入口）。
- [ ] 新增测试是否 colocated 为 `*.spec.ts`。
- [ ] 是否新增了 `__tests__/` 目录。
- [ ] 新 migration 是否满足 `^[0-9]{14}-[a-z0-9-]+\.migration\.ts$`。
- [ ] 所有新增/修改表的主键 `id` 是否使用 UUID v7；涉及 UUID 的地方在无明确例外时是否默认 UUID v7。
- [ ] `index.ts` 是否只用于边界层导出。

---

### 10. 验收场景（规则落地验证）

#### 场景 1：新增 domain 子功能

- 在 `domains/<domain>/` 下按模板落位（`dto/entities/database/migrations` 等）。
- 新功能文件应直接落在 `domains/<domain>/` 根或技术型子目录，不得创建 `domains/<domain>/<feature>/`。
- 不引入新的自由目录命名或跨层依赖。

#### 场景 2：新增 GraphQL 相关变更

- `modules/graphql/*` 的改动不得要求新增 `domains/* -> modules/*` 反向依赖。
- 若必须沿用历史豁免路径，只能复用已存在模式，不得扩大范围。

#### 场景 3：新增 migration

- 文件名必须符合 `YYYYMMDDHHmmss-<action>-<target>.migration.ts`。
- 文件放在对应 domain 的 `database/migrations/` 下。

---

### 11. 示例（真实路径）

#### 示例 A：domain 新功能目录

```text
packages/gc-api/src/domains/workspace/
  workspace-invite.module.ts
  workspace-invite.service.ts
  workspace-invite.resolver.ts
  dto/
  entities/
  database/
    migrations/
  index.ts
```

#### 示例 D：扁平化反例（禁止）

- 错误：`packages/gc-api/src/domains/workspace/invite/workspace-invite.service.ts`
- 错误：`packages/gc-api/src/domains/im/im-whatsapp/services/im-whatsapp-message.service.ts`
- 正确：`packages/gc-api/src/domains/workspace/workspace-invite.service.ts`
- 正确：`packages/gc-api/src/domains/im/services/im-whatsapp-message.service.ts`

#### 示例 B：GraphQL 变更边界

- 推荐：`modules/graphql/guards/gql-auth.guard.ts` 被 `modules/*` 或既有豁免点复用。
- 禁止：新增 `domains/new-domain/*` 首次依赖 `modules/graphql/*`。

#### 示例 C：migration 命名

- 正确：`packages/gc-api/src/domains/im/database/migrations/20260301153000-add-im-user-index.migration.ts`
- 错误：`packages/gc-api/src/domains/im/database/migrations/AddImUserIndex.ts`

---

## GraphQL 传值规则

### 概述

在 GraphQL 请求中正确处理三种值类型：有值、null、undefined。

### 值处理规则

| 值类型 | 处理方式 | 说明 |
|--------|----------|------|
| 有值 | 使用该值 | 正常传递到 GraphQL 请求 |
| null | 设置为 null | 显式设置为 null |
| undefined | 不做操作 | 不出现在请求中 |

### 实现示例

#### TypeScript 类型定义

```typescript
type GqlValue<T> = T | null | undefined;
```

#### 过滤函数

```typescript
/**
 * 过滤 undefined 值，仅保留有值和 null 的字段
 * 用于 GraphQL 传参
 */
function filterUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
```

#### 使用示例

```typescript
interface UpdateUserInput {
  name?: string | null;
  email?: string | null;
  age?: number | null;
}

function buildUpdateUserInput(input: UpdateUserInput) {
  // name: "John" -> 传入 "John"
  // name: null -> 传入 null
  // name: undefined -> 不传入
  return filterUndefined(input);
}
```

### 常见场景

#### 创建时

```typescript
const createInput = filterUndefined({
  name: form.name, // undefined 时不传
  email: form.email === '' ? null : form.email, // 仅空字符串转为 null
});
```

#### 更新时

```typescript
// 仅更新传入的字段，null 表示显式设为 null
const updateInput = filterUndefined({
  name: updateData.name, // undefined 不传；null 显式清空
  status: updateData.status,
});
```

### 注意事项

- GraphQL 中 `null` 和不传字段是不同语义
- 使用 `filterUndefined` 过滤后，剩余字段中 `null` 会显式设置为 null
- 前端传空字符串时需根据业务决定转为 null 还是忽略
