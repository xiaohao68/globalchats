import {
  trace as tauriTrace,
  debug as tauriDebug,
  info as tauriInfo,
  warn as tauriWarn,
  error as tauriError,
} from "@tauri-apps/plugin-log";
import { invoke } from "@tauri-apps/api/core";
import type { ILogger, LogEntry, LoggerOptions, LogLevel, LogSource } from "./types";

class Logger implements ILogger {
  private source: LogSource;
  private category?: string;

  constructor(options: LoggerOptions) {
    this.source = options.source;
    this.category = options.category;
  }

  private formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const entry: LogEntry = {
      ts: Date.now(),
      level,
      source: this.source,
      category: this.category,
      message,
      data,
    };
    return JSON.stringify(entry);
  }

  private async writeToWorkspace(level: LogLevel, formatted: string): Promise<void> {
    try {
      // 通过 Tauri 命令写入工作区日志目录
      await invoke("write_log", {
        source: this.source,
        level: level.toLowerCase(),
        message: formatted,
      });
    } catch (e) {
      // 静默失败，不影响主流程
      console.error("Failed to write log to workspace:", e);
    }
  }

  trace(message: string, data?: Record<string, unknown>): void {
    const formatted = this.formatEntry("trace", message, data);
    tauriTrace(formatted).catch(console.error);
    this.writeToWorkspace("trace", formatted).catch(() => {});
  }

  debug(message: string, data?: Record<string, unknown>): void {
    const formatted = this.formatEntry("debug", message, data);
    tauriDebug(formatted).catch(console.error);
    this.writeToWorkspace("debug", formatted).catch(() => {});
  }

  info(message: string, data?: Record<string, unknown>): void {
    const formatted = this.formatEntry("info", message, data);
    tauriInfo(formatted).catch(console.error);
    this.writeToWorkspace("info", formatted).catch(() => {});
  }

  warn(message: string, data?: Record<string, unknown>): void {
    const formatted = this.formatEntry("warn", message, data);
    tauriWarn(formatted).catch(console.error);
    this.writeToWorkspace("warn", formatted).catch(() => {});
  }

  error(message: string, data?: Record<string, unknown>): void {
    const formatted = this.formatEntry("error", message, data);
    tauriError(formatted).catch(console.error);
    this.writeToWorkspace("error", formatted).catch(() => {});
  }
}

export function createLogger(source: LogSource, category?: string): ILogger {
  return new Logger({ source, category });
}

export const mainLogger = createLogger("main");
export const preloadLogger = createLogger("preload");
