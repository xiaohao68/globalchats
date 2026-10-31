# AGENTS.md

## Project Overview

GC is now a pnpm workspace with a single merged app package:
- `packages/gc-app` - unified Next.js 16 application

## Runtime Layout

Inside `packages/gc-app`:
- Marketing site: `/`
- Console: `/console/*`
- GraphQL API: `/graphql`
- Prisma + PostgreSQL data layer

## Development Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Working Rules

- Implement application changes in `packages/gc-app`.
- Use Prisma for all data access.
- Keep console routes under `/console`.
- Keep marketing pages at root.
- Keep Node.js version aligned with `.nvmrc`.
