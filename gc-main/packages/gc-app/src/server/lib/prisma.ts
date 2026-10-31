import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";

ensureDatabaseUrl();

const globalForPrisma = globalThis as typeof globalThis & {
  __globalchatsPrisma__?: PrismaClient;
};

export const prisma =
  globalForPrisma.__globalchatsPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__globalchatsPrisma__ = prisma;
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return;
  }

  for (const envPath of resolveEnvFileCandidates()) {
    if (!existsSync(envPath)) {
      continue;
    }

    loadEnvFile(envPath);

    if (process.env.DATABASE_URL) {
      return;
    }
  }
}

function resolveEnvFileCandidates() {
  const cwd = process.cwd();

  return [
    resolve(cwd, ".env.local"),
    resolve(cwd, ".env"),
    resolve(cwd, "packages/gc-app/.env.local"),
    resolve(cwd, "packages/gc-app/.env"),
  ];
}
