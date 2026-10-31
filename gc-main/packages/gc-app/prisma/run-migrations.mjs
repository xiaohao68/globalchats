import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..", "..");
const prismaSchemaPath = resolve(appRoot, "prisma", "schema.prisma");
const migrationsRoot = resolve(appRoot, "prisma", "migrations");
const prismaCliCandidates = [
  resolve(appRoot, "node_modules", ".bin", "prisma"),
  resolve(repoRoot, "node_modules", ".bin", "prisma"),
  resolve(repoRoot, "node_modules", "prisma", "build", "index.js"),
];
const managedTableNames = [
  "configs",
  "email_verifications",
  "im_command_outbox",
  "im_event_outbox",
  "im_whatsapp_accounts",
  "im_whatsapp_conversations",
  "im_whatsapp_messages",
  "im_whatsapp_participants",
  "login_attempts",
  "models",
  "password_reset_tokens",
  "user_workspaces",
  "users",
  "workspace_attachments",
  "workspace_members",
  "workspace_translation_entries",
  "workspaces",
];

await main();

async function main() {
  ensureDatabaseUrl();
  await baselineExistingSchemaIfNeeded();
  runPrismaMigrateDeploy();
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const cwd = process.cwd();
  const envCandidates = [
    resolve(cwd, ".env.local"),
    resolve(cwd, ".env"),
    resolve(cwd, "packages/gc-app/.env.local"),
    resolve(cwd, "packages/gc-app/.env"),
    resolve(appRoot, ".env.local"),
    resolve(appRoot, ".env"),
  ];

  for (const envPath of envCandidates) {
    if (!existsSync(envPath)) {
      continue;
    }

    loadEnvFile(envPath);

    if (process.env.DATABASE_URL) {
      return;
    }
  }

  throw new Error("DATABASE_URL is not set.");
}

async function baselineExistingSchemaIfNeeded() {
  const migrationNames = resolveMigrationNames();
  if (migrationNames.length === 0) {
    return;
  }

  const prisma = new PrismaClient({ log: ["error"] });

  try {
    const migrationsTableExists = await tableExists(prisma, "_prisma_migrations");
    if (migrationsTableExists) {
      return;
    }

    const existingTables = await prisma.$queryRaw`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;
    const existingTableNames = new Set(existingTables.map((row) => String(row.tablename)));
    const matchedTables = managedTableNames.filter((name) => existingTableNames.has(name));

    if (matchedTables.length === 0) {
      return;
    }

    if (matchedTables.length !== managedTableNames.length) {
      throw new Error(
        `Detected a partially initialized database without Prisma migration history (${matchedTables.length}/${managedTableNames.length} core tables found).`,
      );
    }

    const baselineMigrationName = migrationNames[0];
    const baselineMigrationSql = readFileSync(
      resolve(migrationsRoot, baselineMigrationName, "migration.sql"),
      "utf8",
    );
    const checksum = createHash("sha256").update(baselineMigrationSql).digest("hex");
    const now = new Date();

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
      )
    `);

    const existingBaseline = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "_prisma_migrations"
      WHERE migration_name = ${baselineMigrationName}
    `;

    if ((existingBaseline[0]?.count ?? 0) > 0) {
      return;
    }

    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (
        id,
        checksum,
        finished_at,
        migration_name,
        started_at,
        applied_steps_count
      ) VALUES (
        ${randomUUID()},
        ${checksum},
        ${now},
        ${baselineMigrationName},
        ${now},
        1
      )
    `;

    console.log(`Baselined existing database with migration ${baselineMigrationName}.`);
  } finally {
    await prisma.$disconnect();
  }
}

async function tableExists(prisma, tableName) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;

  return Boolean(rows[0]?.exists);
}

function resolveMigrationNames() {
  if (!existsSync(migrationsRoot)) {
    return [];
  }

  return readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function runPrismaMigrateDeploy() {
  const prismaCliPath = prismaCliCandidates.find((candidate) => existsSync(candidate));
  if (!prismaCliPath) {
    throw new Error(`Prisma CLI not found. Checked: ${prismaCliCandidates.join(", ")}`);
  }

  const isNodeScript = prismaCliPath.endsWith(".js");
  const command = isNodeScript ? process.execPath : prismaCliPath;
  const args = isNodeScript
    ? [prismaCliPath, "migrate", "deploy", "--schema", prismaSchemaPath]
    : ["migrate", "deploy", "--schema", prismaSchemaPath];

  const result = spawnSync(command, args, {
    cwd: appRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
