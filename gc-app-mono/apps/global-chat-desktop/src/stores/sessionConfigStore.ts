import { create } from "zustand";
import { EPlatform, EProtocol } from "@gc/model";
import { webviewManger } from "@gc/webview";
import { userStore } from "@gc/store";
import {
  DEFAULT_FINGERPRINT,
  type FingerprintPreset,
} from "@/constants/fingerprintPresets";

export interface ProxyConfig {
  proxyId: string;
  protocol: EProtocol;
  host: string;
  port: string;
}

export interface FingerprintConfig {
  presetId: string | null;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
}

interface SessionConfigState {
  isOpen: boolean;
  mode: "create" | "edit";
  editingAppId: string | null;

  selectedPlatform: EPlatform | null;

  proxyConfig: ProxyConfig | null;
  fingerprintConfig: FingerprintConfig;

  openForCreate: (platform: EPlatform) => Promise<void>;
  openForEdit: (appId: string) => Promise<void>;
  close: () => void;
  cancel: () => Promise<void>;
  setProxyConfig: (config: ProxyConfig | null) => void;
  setFingerprintConfig: (config: Partial<FingerprintConfig>) => void;
  applyFingerprintPreset: (preset: FingerprintPreset) => void;
  reset: () => void;
}

const DEFAULT_FINGERPRINT_CONFIG: FingerprintConfig = {
  presetId: DEFAULT_FINGERPRINT.id,
  userAgent: DEFAULT_FINGERPRINT.userAgent,
  platform: DEFAULT_FINGERPRINT.platform,
  screenWidth: DEFAULT_FINGERPRINT.screenWidth,
  screenHeight: DEFAULT_FINGERPRINT.screenHeight,
};

export const useSessionConfigStore = create<SessionConfigState>((set, get) => ({
  isOpen: false,
  mode: "create",
  editingAppId: null,
  selectedPlatform: null,
  proxyConfig: null,
  fingerprintConfig: DEFAULT_FINGERPRINT_CONFIG,

  openForCreate: async (platform) => {
    await webviewManger.hideCurrentWebview();

    set({
      isOpen: true,
      mode: "create",
      selectedPlatform: platform,
      editingAppId: null,
      proxyConfig: null,
      fingerprintConfig: DEFAULT_FINGERPRINT_CONFIG,
    });
  },

  openForEdit: async (appId) => {
    await webviewManger.hideCurrentWebview();

    const config = userStore.getThirdAppConfigById(appId);

    set({
      isOpen: true,
      mode: "edit",
      editingAppId: appId,
      selectedPlatform: config?.platform || null,
      proxyConfig: config?.proxy?.enable
        ? {
            proxyId: config.proxy.proxyId || "",
            protocol: config.proxy.protocol,
            host: config.proxy.host,
            port: config.proxy.port,
          }
        : null,
      fingerprintConfig: config?.fingerprint || DEFAULT_FINGERPRINT_CONFIG,
    });
  },

  close: () => {
    set({ isOpen: false });
  },

  cancel: async () => {
    set({ isOpen: false });
    await webviewManger.showLastActiveWebview();
  },

  setProxyConfig: (config) => set({ proxyConfig: config }),

  setFingerprintConfig: (config) =>
    set((state) => ({
      fingerprintConfig: { ...state.fingerprintConfig, ...config },
    })),

  applyFingerprintPreset: (preset) =>
    set({
      fingerprintConfig: {
        presetId: preset.id,
        userAgent: preset.userAgent,
        platform: preset.platform,
        screenWidth: preset.screenWidth,
        screenHeight: preset.screenHeight,
      },
    }),

  reset: () =>
    set({
      isOpen: false,
      mode: "create",
      editingAppId: null,
      selectedPlatform: null,
      proxyConfig: null,
      fingerprintConfig: DEFAULT_FINGERPRINT_CONFIG,
    }),
}));
