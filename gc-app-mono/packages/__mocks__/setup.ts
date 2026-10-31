import { vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock requestIdleCallback
globalThis.requestIdleCallback = vi.fn((cb) => {
  return setTimeout(
    () =>
      cb({
        didTimeout: false,
        timeRemaining: () => 50,
      }),
    0,
  ) as unknown as number;
});
globalThis.cancelIdleCallback = vi.fn((id) => clearTimeout(id));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
