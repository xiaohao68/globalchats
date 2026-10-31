import type { ErrorCategory, ErrorInfo } from "../types.ts";

function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function getMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || error.name;
  const objectValue = asObject(error);
  if (objectValue && typeof objectValue.message === "string") {
    return objectValue.message;
  }
  return "Unknown error";
}

function detectCategory(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "network";
  }

  const objectValue = asObject(error);
  if (!objectValue) return "unknown";

  const code = objectValue.code;
  if (typeof code === "string") {
    if (code.includes("ECONN") || code.includes("ETIMEDOUT")) return "network";
    if (code.includes("401") || code.includes("403")) return "auth";
    if (code.includes("429")) return "ratelimit";
  }

  const status = objectValue.status ?? objectValue.statusCode;
  if (typeof status === "number") {
    if (status === 401 || status === 403) return "auth";
    if (status === 429) return "ratelimit";
    if (status >= 500) return "backend";
    if (status >= 400) return "validation";
  }

  return "unknown";
}

export function normalizeError(error: unknown): ErrorInfo {
  const objectValue = asObject(error);
  const retryAfterMs =
    objectValue && typeof objectValue.retryAfterMs === "number"
      ? objectValue.retryAfterMs
      : undefined;

  return {
    category: detectCategory(error),
    message: getMessage(error),
    retryAfterMs,
  };
}
