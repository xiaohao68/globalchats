import { vi } from "vitest";

export const Webview = {
  getCurrent: vi.fn(() => ({ label: "main" })),
};

export const getCurrentWebview = vi.fn(() => ({ label: "main" }));
