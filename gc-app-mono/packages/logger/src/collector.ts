import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { info as tauriInfo } from "@tauri-apps/plugin-log";
import { LOG_EVENT_NAME } from "./webview-bridge";
import type { LogEntry } from "./types";

export class LogCollector {
  private unlisten: UnlistenFn | null = null;

  async start(): Promise<void> {
    if (this.unlisten) {
      return;
    }

    this.unlisten = await listen<LogEntry>(LOG_EVENT_NAME, (event) => {
      const entry = event.payload;
      tauriInfo(JSON.stringify(entry)).catch(console.error);
    });
  }

  stop(): void {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
  }
}

export const logCollector = new LogCollector();
