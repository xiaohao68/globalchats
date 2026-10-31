import { Command } from "commander";
import chalk from "chalk";
import { spawn } from "child_process";
import { createReadStream, existsSync, statSync } from "fs";
import { createInterface } from "readline";
import { homedir } from "os";
import { join } from "path";

const LOG_PATH = join(
  homedir(),
  "Library/Logs/com.socialsmart.globalchats.app/Global Chats.log"
);

interface LogEntry {
  timestamp?: string;
  level?: string;
  source?: string;
  message?: string;
  raw?: string;
}

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const levelColors: Record<LogLevel, (text: string) => string> = {
  DEBUG: chalk.gray,
  INFO: chalk.blue,
  WARN: chalk.yellow,
  ERROR: chalk.red,
};

function parseLogLine(line: string): LogEntry {
  try {
    const parsed = JSON.parse(line);
    return {
      timestamp: parsed.timestamp || parsed.time,
      level: parsed.level?.toUpperCase(),
      source: parsed.source || parsed.module || parsed.component,
      message: parsed.message || parsed.msg,
    };
  } catch {
    const match = line.match(
      /^\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\]\s*\[(\w+)\]\s*(?:\[([^\]]+)\])?\s*(.*)$/
    );
    if (match) {
      return {
        timestamp: match[1],
        level: match[2]?.toUpperCase(),
        source: match[3],
        message: match[4],
      };
    }
    return { raw: line };
  }
}

function formatLogEntry(entry: LogEntry): string {
  if (entry.raw) {
    return entry.raw;
  }

  const level = entry.level as LogLevel;
  const colorFn = levelColors[level] || chalk.white;
  const timestamp = entry.timestamp
    ? chalk.dim(`[${entry.timestamp}]`)
    : "";
  const levelStr = level ? colorFn(`[${level}]`) : "";
  const source = entry.source ? chalk.cyan(`[${entry.source}]`) : "";
  const message = entry.message || "";

  return `${timestamp} ${levelStr} ${source} ${message}`.trim();
}

function matchesFilter(
  entry: LogEntry,
  options: { source?: string; level?: string }
): boolean {
  if (options.source && entry.source !== options.source) {
    return false;
  }
  if (options.level) {
    const levels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
    const minLevelIndex = levels.indexOf(options.level.toUpperCase() as LogLevel);
    const entryLevelIndex = levels.indexOf(entry.level as LogLevel);
    if (entryLevelIndex < minLevelIndex) {
      return false;
    }
  }
  return true;
}

function checkLogFileExists(): boolean {
  if (!existsSync(LOG_PATH)) {
    console.error(chalk.red(`日志文件不存在: ${LOG_PATH}`));
    console.error(chalk.yellow("请确保 Global Chats 应用已运行过"));
    return false;
  }
  return true;
}

async function tailLog(options: {
  source?: string;
  level?: string;
  lines?: number;
}): Promise<void> {
  if (!checkLogFileExists()) {
    process.exit(1);
  }

  const initialLines = options.lines || 20;
  console.log(chalk.green(`正在监听日志文件: ${LOG_PATH}`));
  console.log(chalk.dim("按 Ctrl+C 退出\n"));

  const tail = spawn("tail", ["-n", String(initialLines), "-f", LOG_PATH]);

  tail.stdout.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      const entry = parseLogLine(line);
      if (matchesFilter(entry, options)) {
        console.log(formatLogEntry(entry));
      }
    }
  });

  tail.stderr.on("data", (data: Buffer) => {
    console.error(chalk.red(data.toString()));
  });

  tail.on("close", (code) => {
    if (code !== 0) {
      console.error(chalk.red(`tail 进程退出，代码: ${code}`));
    }
  });

  process.on("SIGINT", () => {
    tail.kill();
    process.exit(0);
  });
}

async function queryLog(options: {
  source?: string;
  level?: string;
  since?: string;
  limit?: number;
  grep?: string;
}): Promise<void> {
  if (!checkLogFileExists()) {
    process.exit(1);
  }

  const limit = options.limit || 100;
  let sinceDate: Date | null = null;

  if (options.since) {
    const sinceMatch = options.since.match(/^(\d+)([smhd])$/);
    if (sinceMatch) {
      const value = parseInt(sinceMatch[1], 10);
      const unit = sinceMatch[2];
      const now = Date.now();
      const multipliers: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
      };
      sinceDate = new Date(now - value * multipliers[unit]);
    } else {
      sinceDate = new Date(options.since);
      if (isNaN(sinceDate.getTime())) {
        console.error(chalk.red(`无效的时间格式: ${options.since}`));
        console.error(chalk.yellow("支持格式: 10m, 1h, 2d 或 ISO 日期"));
        process.exit(1);
      }
    }
  }

  const fileStream = createReadStream(LOG_PATH);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const results: LogEntry[] = [];

  for await (const line of rl) {
    if (!line.trim()) continue;

    const entry = parseLogLine(line);

    if (!matchesFilter(entry, options)) continue;

    if (sinceDate && entry.timestamp) {
      const entryDate = new Date(entry.timestamp);
      if (entryDate < sinceDate) continue;
    }

    if (options.grep) {
      const searchText = entry.message || entry.raw || "";
      if (!searchText.toLowerCase().includes(options.grep.toLowerCase())) {
        continue;
      }
    }

    results.push(entry);
  }

  const output = results.slice(-limit);

  if (output.length === 0) {
    console.log(chalk.yellow("没有找到匹配的日志"));
    return;
  }

  console.log(chalk.green(`找到 ${output.length} 条日志:\n`));
  for (const entry of output) {
    console.log(formatLogEntry(entry));
  }
}

export const logCommand = new Command("log")
  .description("日志查询和监控");

logCommand
  .command("tail")
  .description("实时查看日志")
  .option("-s, --source <source>", "按来源过滤")
  .option("-l, --level <level>", "最低日志级别 (DEBUG, INFO, WARN, ERROR)")
  .option("-n, --lines <number>", "初始显示行数", "20")
  .action(async (options) => {
    await tailLog({
      source: options.source,
      level: options.level,
      lines: parseInt(options.lines, 10),
    });
  });

logCommand
  .command("query")
  .description("查询历史日志")
  .option("-s, --source <source>", "按来源过滤")
  .option("-l, --level <level>", "最低日志级别 (DEBUG, INFO, WARN, ERROR)")
  .option("--since <time>", "时间范围 (例如: 10m, 1h, 2d)")
  .option("--limit <number>", "返回条数限制", "100")
  .option("-g, --grep <pattern>", "搜索关键词")
  .action(async (options) => {
    await queryLog({
      source: options.source,
      level: options.level,
      since: options.since,
      limit: parseInt(options.limit, 10),
      grep: options.grep,
    });
  });

logCommand
  .command("path")
  .description("显示日志文件路径")
  .action(() => {
    console.log(LOG_PATH);
    if (existsSync(LOG_PATH)) {
      const stats = statSync(LOG_PATH);
      console.log(chalk.dim(`文件大小: ${(stats.size / 1024).toFixed(2)} KB`));
      console.log(chalk.dim(`最后修改: ${stats.mtime.toISOString()}`));
    } else {
      console.log(chalk.yellow("日志文件不存在"));
    }
  });
