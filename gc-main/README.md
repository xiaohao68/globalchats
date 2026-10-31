# GC

合并后的单应用位于 `packages/gc-app`。

## 应用结构

- 代码目录：`packages/gc-app`
- 营销站：`/`
- 控制台：`/console/*`
- GraphQL：`/graphql`
- 数据层：Prisma + PostgreSQL

## 常用命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:reset
pnpm db:seed
```

## 环境变量

先复制：

```bash
cp packages/gc-app/.env.example packages/gc-app/.env
```

关键变量：
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`

## Docker PostgreSQL

- 开发库使用固定镜像版本：`postgres:18.3-alpine3.22`
- `db` 服务已配置为 `restart: "no"`，系统或 Docker 重启后不会自动启动
- `app` 服务默认仅作为 Compose 配置示例，已放到 `example` profile，下不会在本机默认启动
- 手动启动数据库：`docker compose -f docker/docker-compose.yml up -d db`
- 查看状态：`docker compose -f docker/docker-compose.yml ps`
- 手动停止数据库：`docker compose -f docker/docker-compose.yml stop db`
- 如需显式启动示例 `app`：`docker compose -f docker/docker-compose.yml --profile example up -d app`

## 数据库迁移

- 开发时生成新迁移：`pnpm db:migrate`
- 启动服务前自动检查数据库迁移版本，并执行未应用的迁移
- 手动执行部署型迁移：`pnpm db:deploy`
- 重置开发数据库并重新应用迁移：`pnpm db:reset`
