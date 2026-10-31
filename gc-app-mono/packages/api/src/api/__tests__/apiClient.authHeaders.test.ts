import { describe, expect, it } from "vitest";
import {
  getRequestAuthMode,
  shouldAttachUinHeader,
} from "../auth/requestAuthMode.ts";

describe("apiClient auth headers", () => {
  it("returns null when auth mode header is missing", () => {
    const mode = getRequestAuthMode({ headers: {} });
    expect(mode).toBeNull();
  });

  it("skips auth when x-gc-auth-mode header is set to skip", () => {
    const mode = getRequestAuthMode({
      headers: { "x-gc-auth-mode": "skip" },
    });
    expect(mode).toBe("skip");
    expect(shouldAttachUinHeader(mode)).toBe(false);
  });

  it("requires auth when x-gc-auth-mode header is set to require", () => {
    const mode = getRequestAuthMode({
      headers: { "x-gc-auth-mode": "require" },
    });
    expect(mode).toBe("require");
    expect(shouldAttachUinHeader(mode)).toBe(true);
  });
});
