import { describe, expect, it } from "vitest";
import { normalizeError } from "../errors/normalizeError.ts";

describe("normalizeError", () => {
  it("keeps string message", () => {
    expect(normalizeError("oops")).toEqual({
      category: "unknown",
      message: "oops",
      retryAfterMs: undefined,
    });
  });

  it("detects AbortError as network", () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    expect(normalizeError(error).category).toBe("network");
  });

  it("detects status 429 as ratelimit", () => {
    const res = normalizeError({ status: 429, message: "too many" });
    expect(res.category).toBe("ratelimit");
    expect(res.message).toBe("too many");
  });
});
