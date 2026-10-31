# 迁移到新登录接口 (imLogin) 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将登录功能从旧接口 `chatUserLogin` 迁移到新接口 `imLogin`

**Architecture:** 创建新的 GraphQL mutation 文件，运行 codegen 生成 TypeScript 类型，更新 apiSignIn 函数和 mapper，保持前端 SignInForm 组件不变

**Tech Stack:** GraphQL, TypeScript, graphql-codegen

---

## Task 1: 创建新的 GraphQL Mutation 文件

**Files:**
- Create: `packages/api/src/gql/mutation/ImLogin.graphql`

**Step 1: 创建 GraphQL mutation 文件**

创建文件 `packages/api/src/gql/mutation/ImLogin.graphql`，内容：

```graphql
mutation ImLogin($input: ImLoginInput!) {
  imLogin(input: $input) {
    imUsers {
      accessToken
      imUser {
        id
        username
        name
        memberId
        loginAt
        loginIp
        position
        createdAt
        updatedAt
        deletedAt
      }
    }
  }
}
```

**Step 2: 导出 mutation**

修改 `packages/api/src/gql/index.ts`，在第 26 行后添加：
```typescript
export { ImLogin } from "./mutation/ImLogin.graphql";
```

**Step 3: Commit**

```bash
git add packages/api/src/gql/mutation/ImLogin.graphql packages/api/src/gql/index.ts
git commit -m "feat(api): 添加 imLogin GraphQL mutation"
```

---

## Task 2: 运行 Codegen 生成 TypeScript 类型

**Files:**
- Generated: `packages/api/src/gen/graphql.ts` (自动更新)

**Step 1: 启动 GraphQL 服务器**

确保后端服务运行在 http://localhost:3301/graphql

Run: `curl http://localhost:3301/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'`
Expected: `{"data":{"__typename":"Query"}}`

**Step 2: 运行 codegen**

Run: `cd apps/global-chat-desktop && bun run codegen`
Expected: 成功生成类型，无错误

**Step 3: 验证生成的类型**

检查 `packages/api/src/gen/graphql.ts` 是否包含：
- `ImLoginInput` 类型
- `ImLoginMutation` 类型
- `ImLoginMutationVariables` 类型
- `ImUser` 类型（包含 accessToken, imUser 字段）

Run: `grep -n "ImLogin\|ImUser" packages/api/src/gen/graphql.ts | head -30`
Expected: 显示相关类型定义

**Step 4: Commit**

```bash
git add packages/api/src/gen/
git commit -m "chore(api): 运行 codegen 生成 imLogin 类型"
```

---

## Task 3: 创建新的 Mapper 函数

**Files:**
- Create: `packages/api/src/api/mappers/mapImLoginToUser.ts`

**Step 1: 创建 mapper 文件**

创建 `packages/api/src/api/mappers/mapImLoginToUser.ts`：

```typescript
import type { IUser } from "@gc/model";
import type { ImLoginMutation } from "../../gen/graphql.ts";

type ImUserOutput = NonNullable<
  NonNullable<ImLoginMutation["imLogin"]>["imUsers"]
>[number];

export const mapImLoginToUser = (imUserData: ImUserOutput): IUser => {
  const imUser = imUserData.imUser;
  return {
    id: imUser.id,
    name: imUser.name || imUser.username,
    blocked: false,
    // 保留 uin 字段兼容性，新接口没有该字段
    uin: imUser.id,
  };
};
```

**Step 2: Commit**

```bash
git add packages/api/src/api/mappers/mapImLoginToUser.ts
git commit -m "feat(api): 添加 imLogin 到 IUser 的 mapper"
```

---

## Task 4: 更新 apiSignIn 函数

**Files:**
- Modify: `packages/api/src/api/apiSignIn.ts`

**Step 1: 更新导入**

替换文件内容：

```typescript
import { gqlClient } from "../apiClient.ts";
import { IUser } from "@gc/model";
import { ImLoginMutation, ImLoginMutationVariables } from "../gen/graphql.ts";
import { ImLogin } from "../gql/index.ts";
import { mapImLoginToUser } from "./mappers/mapImLoginToUser.ts";

interface RequestData {
  email: string;
  password: string;
}

export const apiSignIn = async (data: RequestData): Promise<IUser> => {
  const res = await gqlClient<ImLoginMutation, ImLoginMutationVariables>(
    {
      query: ImLogin,
      variables: {
        input: {
          email: data.email,
          password: data.password,
          captchaToken: null,
        },
      },
    },
    {},
    { authMode: "skip" },
  );

  const imUsers = res.data.data.imLogin?.imUsers;
  const imUserData = imUsers?.[0];
  if (!imUserData) {
    throw new Error("User not found");
  }
  return mapImLoginToUser(imUserData);
};
```

**Step 2: 验证编译**

Run: `cd packages/api && bun run typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add packages/api/src/api/apiSignIn.ts
git commit -m "feat(api): 更新 apiSignIn 使用 imLogin 接口"
```

---

## Task 5: 清理旧代码（可选）

**Files:**
- Delete: `packages/api/src/gql/mutation/ChatUserLogin.graphql`
- Delete: `packages/api/src/api/mappers/mapChatUserLoginToUser.ts`

**Step 1: 删除旧文件**

```bash
rm packages/api/src/gql/mutation/ChatUserLogin.graphql
rm packages/api/src/api/mappers/mapChatUserLoginToUser.ts
```

**Step 2: 更新 gql/index.ts**

删除第 19 行：
```typescript
export { ChatUserLogin } from "./mutation/ChatUserLogin.graphql";
```

**Step 3: Commit**

```bash
git add packages/api/src/gql/index.ts
git commit -m "chore(api): 移除旧的 chatUserLogin 相关代码"
```

---

## Task 6: 端到端测试

**Files:**
- Test: 通过 SignInForm 组件进行集成测试

**Step 1: 启动开发环境**

Run: `cd apps/global-chat-desktop && task dev:all`

**Step 2: 测试登录功能**

1. 访问登录页面
2. 输入有效的邮箱和密码
3. 点击登录按钮
4. 验证：
   - 登录成功，跳转到聊天页面
   - 用户信息正确存储到 globalStore
   - accessToken 被正确处理（如果后端返回）

**Step 3: Commit（如需要修复）**

如有修复，单独提交。

---

## 完成总结

改动内容：
1. 创建 `ImLogin.graphql` mutation 文件
2. 运行 codegen 生成新类型
3. 创建 `mapImLoginToUser.ts` mapper
4. 更新 `apiSignIn.ts` 使用新接口
5. （可选）清理旧代码

API 变化：
- 接口从 `chatUserLogin(email, password)` 变为 `imLogin(input: {email, password, captchaToken})`
- 返回数据从 `users` 变为 `imUsers`，包含 `accessToken` 和 `imUser`
- 前端 SignInForm 组件无需修改，保持向后兼容
