FROM node:24-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/gc-app/package.json ./packages/gc-app/package.json
RUN pnpm install --frozen-lockfile --filter gc-app...

FROM node:24-bookworm-slim AS builder
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/gc-app/node_modules ./packages/gc-app/node_modules
COPY . .
RUN pnpm --filter gc-app build

FROM node:24-bookworm-slim AS runner
ARG GC_VERSION
ENV GC_VERSION=${GC_VERSION:-}
ENV NODE_ENV=production
ENV PORT=3300
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd --system --create-home --uid 1001 nextjs
COPY --from=deps --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nextjs /app/packages/gc-app/node_modules ./packages/gc-app/node_modules
COPY --from=builder --chown=nextjs:nextjs /app/packages/gc-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/packages/gc-app/.next/static ./packages/gc-app/.next/static
COPY --from=builder --chown=nextjs:nextjs /app/packages/gc-app/public ./packages/gc-app/public
COPY --from=builder --chown=nextjs:nextjs /app/packages/gc-app/prisma ./packages/gc-app/prisma
USER nextjs
EXPOSE 3300
CMD ["sh", "-c", "node packages/gc-app/prisma/run-migrations.mjs && node packages/gc-app/server.js"]
