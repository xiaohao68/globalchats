import { vi } from "vitest";

export const emit = vi.fn();
export const listen = vi.fn(() => Promise.resolve(() => {}));
export const once = vi.fn(() => Promise.resolve(() => {}));
