// apps/global-chat-desktop/tests/e2e/utils/logger.ts
/**
 * E2E 测试日志工具
 *
 * 已接入项目日志系统：
 * - 测试日志写入 logs/current/e2e_{date}.log
 * - 可读取 Rust 和前端日志 logs/current/*.log
 * - 支持过滤查询日志（按来源、级别、时间范围）
 */
import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * 日志条目类型（与 Rust export.rs 保持一致）
 */
export interface LogEntry {
  level: "trace" | "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: number;
  source?: string;
  data?: unknown;
}

/**
 * 解析后的日志文件条目
 */
export interface ParsedLogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  raw: string;
}

/**
 * 日志查询选项
 */
export interface LogQueryOptions {
  /** 日志来源过滤 */
  source?: string;
  /** 日志级别过滤 */
  level?: string;
  /** 开始时间戳（毫秒） */
  startTime?: number;
  /** 结束时间戳（毫秒） */
  endTime?: number;
  /** 最大返回条数 */
  limit?: number;
  /** 消息内容包含（模糊匹配） */
  messageContains?: string;
}

/**
 * 测试日志接口
 */
export interface TestLogger {
  info(message: string, data?: unknown): void;
  error(message: string, error?: Error): void;
  warn(message: string, data?: unknown): void;
  screenshot(name: string, page: Page): Promise<void>;

  /** 获取测试运行期间的内存日志（用于断言） */
  getLogs(): LogEntry[];

  /** 清空内存日志（每个测试开始时调用） */
  clear(): void;

  /** 读取项目日志文件（支持过滤） */
  queryProjectLogs(options?: LogQueryOptions): ParsedLogEntry[];

  /** 获取日志目录路径 */
  getLogDir(): string;
}

/**
 * 内部日志存储（内存中）
 */
const logs: LogEntry[] = [];

/**
 * 获取项目日志目录
 */
function getProjectLogDir(): string {
  // 从当前目录向上查找项目根目录
  let currentDir = process.cwd();

  while (currentDir !== path.parse(currentDir).root) {
    if (
      fs.existsSync(path.join(currentDir, ".git")) ||
      fs.existsSync(path.join(currentDir, "Cargo.toml"))
    ) {
      return path.join(currentDir, "logs", "current");
    }
    currentDir = path.dirname(currentDir);
  }

  // 回退到临时目录
  return path.join(
    process.env.TMPDIR || "/tmp",
    "global-chat-desktop",
    "logs"
  );
}

/**
 * 确保日志目录存在
 */
function ensureLogDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 写入日志到文件
 */
function writeToLogFile(level: string, message: string, data?: unknown): void {
  try {
    const logDir = getProjectLogDir();
    ensureLogDir(logDir);

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timestamp = now.toISOString().replace("T", " ").replace("Z", "");

    const logFile = path.join(logDir, `e2e_${dateStr}.log`);
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    const logLine = `[${timestamp}] [${level.toUpperCase()}] [e2e-test] ${message}${dataStr}\n`;

    fs.appendFileSync(logFile, logLine);
  } catch {
    // 静默失败，不影响测试
  }
}

/**
 * 解析日志行
 * 格式: [2024-01-15 10:30:45.123] [INFO] [source] message
 */
function parseLogLine(line: string): ParsedLogEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 解析时间戳 [YYYY-MM-DD HH:MM:SS.mmm]
  const timestampMatch = trimmed.match(/^\[([^\]]+)\]/);
  if (!timestampMatch) return null;
  const timestamp = timestampMatch[1];

  // 解析级别 [LEVEL]
  const afterTimestamp = trimmed.slice(timestampMatch[0].length).trim();
  const levelMatch = afterTimestamp.match(/^\[([^\]]+)\]/);
  if (!levelMatch) return null;
  const level = levelMatch[1];

  // 解析来源 [source]
  const afterLevel = afterTimestamp.slice(levelMatch[0].length).trim();
  const sourceMatch = afterLevel.match(/^\[([^\]]+)\]/);
  if (!sourceMatch) return null;
  const source = sourceMatch[1];

  // 解析消息
  const message = afterLevel.slice(sourceMatch[0].length).trim();

  return {
    timestamp,
    level,
    source,
    message,
    raw: trimmed,
  };
}

/**
 * 读取日志文件
 */
function readLogFile(filePath: string): ParsedLogEntry[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const entries: ParsedLogEntry[] = [];

    for (const line of lines) {
      const entry = parseLogLine(line);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * 解析时间戳为毫秒
 */
function parseTimestamp(ts: string): number {
  // 格式: 2024-01-15 10:30:45.123
  try {
    const isoStr = ts.replace(" ", "T") + "Z";
    return new Date(isoStr).getTime();
  } catch {
    return 0;
  }
}

/**
 * 查询项目日志
 */
function queryProjectLogs(options: LogQueryOptions = {}): ParsedLogEntry[] {
  const logDir = getProjectLogDir();

  if (!fs.existsSync(logDir)) {
    return [];
  }

  const allEntries: ParsedLogEntry[] = [];

  // 读取所有 .log 文件
  const files = fs.readdirSync(logDir).filter((f) => f.endsWith(".log"));
  for (const file of files) {
    const filePath = path.join(logDir, file);
    const entries = readLogFile(filePath);
    allEntries.push(...entries);
  }

  // 过滤
  let filtered = allEntries;

  if (options.source) {
    const sourceLower = options.source.toLowerCase();
    filtered = filtered.filter((e) =>
      e.source.toLowerCase().includes(sourceLower)
    );
  }

  if (options.level) {
    const levelUpper = options.level.toUpperCase();
    filtered = filtered.filter((e) => e.level.toUpperCase() === levelUpper);
  }

  if (options.startTime) {
    filtered = filtered.filter(
      (e) => parseTimestamp(e.timestamp) >= options.startTime!
    );
  }

  if (options.endTime) {
    filtered = filtered.filter(
      (e) => parseTimestamp(e.timestamp) <= options.endTime!
    );
  }

  if (options.messageContains) {
    const searchLower = options.messageContains.toLowerCase();
    filtered = filtered.filter((e) =>
      e.message.toLowerCase().includes(searchLower)
    );
  }

  // 按时间排序（最新的在前）
  filtered.sort(
    (a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)
  );

  // 限制数量
  if (options.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * 测试日志实现
 */
export const testLogger: TestLogger = {
  info: (message: string, data?: unknown) => {
    const entry: LogEntry = {
      level: "info",
      message,
      timestamp: Date.now(),
      source: "e2e-test",
      data,
    };
    logs.push(entry);
    writeToLogFile("info", message, data);
    console.log(`[E2E INFO] ${message}`);
  },

  error: (message: string, error?: Error) => {
    const entry: LogEntry = {
      level: "error",
      message,
      timestamp: Date.now(),
      source: "e2e-test",
      data: error
        ? { name: error.name, message: error.message, stack: error.stack }
        : undefined,
    };
    logs.push(entry);
    writeToLogFile("error", message, error?.message);
    console.error(`[E2E ERROR] ${message}`);
  },

  warn: (message: string, data?: unknown) => {
    const entry: LogEntry = {
      level: "warn",
      message,
      timestamp: Date.now(),
      source: "e2e-test",
      data,
    };
    logs.push(entry);
    writeToLogFile("warn", message, data);
    console.warn(`[E2E WARN] ${message}`);
  },

  screenshot: async (name: string, page: Page) => {
    const logDir = getProjectLogDir();
    const screenshotDir = path.join(logDir, "..", "screenshots");
    ensureLogDir(screenshotDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${timestamp}_${name}.png`;
    const filepath = path.join(screenshotDir, filename);

    await page.screenshot({ path: filepath });
    writeToLogFile("info", `Screenshot saved: ${filename}`);
    console.log(`[E2E] Screenshot saved: ${filepath}`);
  },

  getLogs: () => [...logs],

  clear: () => {
    logs.length = 0;
  },

  queryProjectLogs,

  getLogDir: getProjectLogDir,
};

/**
 * 日志断言辅助函数
 */
export const logAssertions = {
  /**
   * 断言日志中存在特定消息
   */
  hasMessage(logs: ParsedLogEntry[], messageContains: string): boolean {
    const lower = messageContains.toLowerCase();
    return logs.some((log) => log.message.toLowerCase().includes(lower));
  },

  /**
   * 断言日志中存在特定级别的消息
   */
  hasLevel(logs: ParsedLogEntry[], level: string): boolean {
    const upper = level.toUpperCase();
    return logs.some((log) => log.level.toUpperCase() === upper);
  },

  /**
   * 断言日志中不存在错误
   */
  hasNoErrors(logs: ParsedLogEntry[]): boolean {
    return !logs.some((log) => log.level.toUpperCase() === "ERROR");
  },

  /**
   * 获取特定来源的日志
   */
  filterBySource(logs: ParsedLogEntry[], source: string): ParsedLogEntry[] {
    const lower = source.toLowerCase();
    return logs.filter((log) => log.source.toLowerCase().includes(lower));
  },

  /**
   * 获取时间范围内的日志
   */
  filterByTimeRange(
    logs: ParsedLogEntry[],
    startMs: number,
    endMs: number
  ): ParsedLogEntry[] {
    return logs.filter((log) => {
      const ts = parseTimestamp(log.timestamp);
      return ts >= startMs && ts <= endMs;
    });
  },
};
