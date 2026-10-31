import { describe, expect, it } from "vitest";
import { withRetry } from "../retry/retry.ts";

describe("withRetry", () => {
  it("retries retryable errors and succeeds", async () => {
    let attempts = 0;

    const value = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("temporary");
        }
        return "ok";
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 1,
        jitterRatio: 0,
        shouldRetry: () => true,
      },
    );

    expect(value).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry non-retryable errors", async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error("fatal");
        },
        {
          maxAttempts: 5,
          baseDelayMs: 1,
          maxDelayMs: 1,
          jitterRatio: 0,
          shouldRetry: () => false,
        },
      ),
    ).rejects.toThrow("fatal");

    expect(attempts).toBe(1);
  });
});
