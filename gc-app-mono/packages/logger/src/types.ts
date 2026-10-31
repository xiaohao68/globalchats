export type LogSource =
  | "main"
  | "telegram"
  | "whatsapp"
  | "instagram"
  | "messenger"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "teams"
  | "aggregated-chat"
  | "preload"
  | "unknown";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: number;
  level: LogLevel;
  source: LogSource;
  category?: string;
  message: string;
  data?: Record<string, unknown>;
  file?: string;
  line?: number;
}

export interface LoggerOptions {
  source: LogSource;
  category?: string;
}

export interface ILogger {
  trace(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}
