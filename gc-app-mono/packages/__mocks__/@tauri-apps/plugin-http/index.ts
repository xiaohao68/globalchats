import { vi } from "vitest";

export const fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    data: {},
    headers: new Map(),
  }),
);
