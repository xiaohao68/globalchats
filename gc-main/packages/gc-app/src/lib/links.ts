const CONSOLE_BASE_PATH = "/console";
const LEGACY_WELCOME_PATHS = new Set(["/welcome", "/console/welcome"]);

export function getAppUrl(path: string = "/dashboard"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (LEGACY_WELCOME_PATHS.has(normalizedPath)) {
    return `${CONSOLE_BASE_PATH}/login`;
  }

  if (normalizedPath.startsWith(CONSOLE_BASE_PATH)) {
    return normalizedPath;
  }

  return `${CONSOLE_BASE_PATH}${normalizedPath}`;
}

export function isDevEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}
