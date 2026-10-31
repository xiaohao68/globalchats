import type { RetryOptions } from "../types.ts";

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new Error("Aborted");
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (!signal) return;
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("Aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export type RetryContext = {
  attempt: number;
};

export type RetryPolicy = RetryOptions & {
  shouldRetry: (error: unknown) => boolean;
  signal?: AbortSignal;
  onRetry?: (
    context: RetryContext & { error: unknown; delayMs: number },
  ) => void;
};

export async function withRetry<T>(
  fn: (context: RetryContext) => Promise<T>,
  policy: RetryPolicy,
): Promise<T> {
  const maxAttempts = Math.max(1, policy.maxAttempts);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn({ attempt });
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt || !policy.shouldRetry(error)) {
        throw error;
      }

      const exponential = policy.baseDelayMs * 2 ** (attempt - 1);
      const capped = Math.min(policy.maxDelayMs, exponential);
      const jitter = capped * policy.jitterRatio * Math.random();
      const delayMs = Math.floor(capped + jitter);

      policy.onRetry?.({ attempt, error, delayMs });
      await sleep(delayMs, policy.signal);
    }
  }

  throw new Error("Unreachable");
}
