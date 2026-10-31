import { vi } from "vitest";

const createMockStore = () => ({
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
  load: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  keys: vi.fn(() => []),
  values: vi.fn(() => []),
  entries: vi.fn(() => []),
  length: vi.fn(() => 0),
  has: vi.fn(() => false),
  onKeyChange: vi.fn(() => Promise.resolve(() => {})),
  onChange: vi.fn(() => Promise.resolve(() => {})),
  close: vi.fn(),
});

export const Store = vi.fn(() => createMockStore());
export const load = vi.fn(() => Promise.resolve(createMockStore()));
