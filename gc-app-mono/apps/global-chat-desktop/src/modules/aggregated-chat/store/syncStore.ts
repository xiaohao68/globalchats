import { create } from "zustand";
import { createLogger } from "@gc/logger";
import { syncEngine } from "../services/SyncEngine";

const logger = createLogger("aggregated-chat", "sync-store");

interface SyncState {
  isPolling: boolean;
  lastSyncAt: number | null;
  pollInterval: number;
  error: string | null;
  errorCount: number;

  // Actions
  setIsPolling: (isPolling: boolean) => void;
  setLastSyncAt: (timestamp: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  initialLoad: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  syncNow: () => Promise<void>;
  resetError: () => void;
  poll: () => void;
}

const initialState = {
  isPolling: false,
  lastSyncAt: null,
  pollInterval: 5000,
  error: null,
  errorCount: 0,
};

export const useSyncStore = create<SyncState>((set, get) => ({
  ...initialState,

  setIsPolling: (isPolling) => set({ isPolling }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setError: (error) =>
    set((state) => ({
      error,
      errorCount: error ? state.errorCount + 1 : 0,
    })),
  reset: () => set(initialState),

  async initialLoad() {
    try {
      logger.info("Initial load starting");
      set({ error: null });
      await syncEngine.initialLoad();
      set({ lastSyncAt: Date.now(), errorCount: 0 });
      logger.info("Initial load completed");
    } catch (error) {
      logger.error("Initial load failed", { error: String(error) });
      set({
        error: error instanceof Error ? error.message : "初始加载失败",
      });
    }
  },

  startPolling() {
    if (get().isPolling) {
      logger.debug("Polling already running");
      return;
    }
    logger.info("Starting polling");
    syncEngine.startPolling();
  },

  stopPolling() {
    logger.info("Stopping polling");
    syncEngine.stopPolling();
  },

  async syncNow() {
    logger.info("Manual sync triggered");
    syncEngine.stopPolling();
    await syncEngine.initialLoad();
    syncEngine.startPolling();
  },

  resetError() {
    set({ error: null, errorCount: 0, pollInterval: 5000 });
  },

  poll() {
    logger.info("Manual poll triggered");
    syncEngine.stopPolling();
    syncEngine.initialLoad().then(() => {
      if (get().isPolling) {
        syncEngine.startPolling();
      }
    });
  },
}));
