import { emit } from "@tauri-apps/api/event";
import type { LogEntry, LogSource } from "./types";

export const LOG_EVENT_NAME = "gc-log-entry";

interface ConsoleInterceptorOptions {
  source: LogSource;
  interceptConsole?: boolean;
}

let bridgeInstalled = false;

export function setupWebviewLogBridge(options: ConsoleInterceptorOptions): () => void {
  const { source, interceptConsole = true } = options;

  if (!interceptConsole || bridgeInstalled) {
    return () => {};
  }
  bridgeInstalled = true;

  const originalConsole = {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  const createInterceptor = (level: "debug" | "info" | "warn" | "error", original: typeof console.log) => {
    return (...args: unknown[]) => {
      original.apply(console, args);

      const entry: LogEntry = {
        ts: Date.now(),
        level,
        source,
        message: args.map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg) : String(arg)
        ).join(" "),
      };

      emit(LOG_EVENT_NAME, entry).catch(() => {});
    };
  };

  console.log = createInterceptor("debug", originalConsole.log);
  console.debug = createInterceptor("debug", originalConsole.debug);
  console.info = createInterceptor("info", originalConsole.info);
  console.warn = createInterceptor("warn", originalConsole.warn);
  console.error = createInterceptor("error", originalConsole.error);

  // 全局错误监听
  const errorHandler = (event: ErrorEvent) => {
    const entry: LogEntry = {
      ts: Date.now(),
      level: "error",
      source,
      message: `[Uncaught Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
    };
    emit(LOG_EVENT_NAME, entry).catch(() => {});
  };

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? `${reason.message}\n${reason.stack}`
      : JSON.stringify(reason);
    const entry: LogEntry = {
      ts: Date.now(),
      level: "error",
      source,
      message: `[Unhandled Rejection] ${message}`,
    };
    emit(LOG_EVENT_NAME, entry).catch(() => {});
  };

  window.addEventListener("error", errorHandler);
  window.addEventListener("unhandledrejection", rejectionHandler);

  return () => {
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    window.removeEventListener("error", errorHandler);
    window.removeEventListener("unhandledrejection", rejectionHandler);
    bridgeInstalled = false;
  };
}
