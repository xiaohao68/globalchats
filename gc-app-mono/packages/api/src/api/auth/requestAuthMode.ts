type RequestAuthMode = "skip" | "require";

export const AUTH_MODE_HEADER = "x-gc-auth-mode";

const readHeader = (headers: unknown, name: string): string | null => {
  if (!headers) return null;

  if (typeof (headers as { get?: unknown }).get === "function") {
    const v = (headers as { get: (n: string) => unknown }).get(name);
    return typeof v === "string" ? v : null;
  }

  if (typeof headers === "object") {
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      if (k.toLowerCase() !== name.toLowerCase()) continue;
      return typeof v === "string" ? v : null;
    }
  }

  return null;
};

export const getRequestAuthMode = (input: {
  headers?: unknown;
}): RequestAuthMode | null => {
  const explicit = readHeader(input.headers, AUTH_MODE_HEADER);
  if (explicit === "skip" || explicit === "require") return explicit;
  return null;
};

export const shouldAttachUinHeader = (mode: RequestAuthMode): boolean => {
  return mode === "require";
};
