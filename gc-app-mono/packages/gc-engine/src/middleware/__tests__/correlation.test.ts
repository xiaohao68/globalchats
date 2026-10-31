import { describe, expect, it } from "vitest";
import { generateCorrelationId } from "../observability/correlation.ts";

describe("generateCorrelationId", () => {
  it("returns a non-empty string", () => {
    expect(generateCorrelationId()).toBeTypeOf("string");
    expect(generateCorrelationId().length).toBeGreaterThan(0);
  });

  it("returns different values for consecutive calls", () => {
    const a = generateCorrelationId();
    const b = generateCorrelationId();
    expect(a).not.toBe(b);
  });
});
