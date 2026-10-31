#!/usr/bin/env bun
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const LOGS_DIR = join(__dirname, "..", "logs", "current");

interface LogEntry {
  ts?: number;
  timestamp?: string;
  level: string;
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      options[key] = value;
      if (value !== "true") i++;
    }
  }

  return options;
}

function readLogFile(source: string): LogEntry[] {
  const filePath = join(LOGS_DIR, `${source}.log`);
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return {
          timestamp: new Date().toISOString(),
          level: "INFO",
          source,
          message: line,
        };
      }
    });
}

function listSources(): string[] {
  if (!existsSync(LOGS_DIR)) {
    return [];
  }

  return readdirSync(LOGS_DIR)
    .filter((f) => f.endsWith(".log"))
    .map((f) => f.replace(".log", ""));
}

function formatTime(entry: LogEntry): string {
  if (entry.ts) {
    return new Date(entry.ts).toISOString();
  }
  return entry.timestamp || new Date().toISOString();
}

function main() {
  const args = parseArgs();

  if (args.help || args.h) {
    console.log(`
Usage: bun run logs [options]

Options:
  --source <name>     Filter by source (main, telegram, whatsapp, rust, etc.)
  --level <level>     Filter by level (trace, debug, info, warn, error)
  --since <time>      Filter by time (1h, 1d, 30m)
  --tail <n>          Show last n entries (default: 50)
  --follow            Follow log output (like tail -f)
  --list              List available log sources

Examples:
  bun run logs --source rust --level error
  bun run logs --tail 100 --since 1h
  bun run logs --list
`);
    return;
  }

  if (args.list) {
    console.log("Available log sources:");
    const sources = listSources();
    if (sources.length === 0) {
      console.log("  (no logs found)");
    } else {
      sources.forEach((s) => console.log(`  - ${s}`));
    }
    return;
  }

  const sources = args.source ? [args.source] : listSources();
  const level = args.level?.toUpperCase();
  const tail = parseInt(args.tail || "50", 10);

  let allEntries: LogEntry[] = [];

  for (const source of sources) {
    const entries = readLogFile(source);
    allEntries.push(...entries);
  }

  // 级别过滤
  if (level) {
    allEntries = allEntries.filter((e) => e.level.toUpperCase() === level);
  }

  // 时间过滤
  if (args.since) {
    const now = Date.now();
    const match = args.since.match(/(\d+)([mhd])/);
    if (match) {
      const [, num, unit] = match;
      const multiplier = unit === "m" ? 60 * 1000 : unit === "h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const since = now - parseInt(num) * multiplier;
      allEntries = allEntries.filter((e) => {
        const ts = e.ts || new Date(e.timestamp || 0).getTime();
        return ts >= since;
      });
    }
  }

  // 排序
  allEntries.sort((a, b) => {
    const tsA = a.ts || new Date(a.timestamp || 0).getTime();
    const tsB = b.ts || new Date(b.timestamp || 0).getTime();
    return tsA - tsB;
  });

  // 取最后 n 条
  allEntries = allEntries.slice(-tail);

  // 输出
  for (const entry of allEntries) {
    const color =
      entry.level === "ERROR" ? "\x1b[31m" :
      entry.level === "WARN" ? "\x1b[33m" :
      entry.level === "INFO" ? "\x1b[32m" :
      "\x1b[36m";

    const time = formatTime(entry);
    console.log(
      `${color}[${entry.level}]\x1b[0m ${time} ${entry.source}: ${entry.message}`
    );
  }
}

main();
