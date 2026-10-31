export function resolveSafeNextPath(nextPath: string | null | undefined): string {
  if (!nextPath) {
    return "/console/dashboard";
  }
  if (!nextPath.startsWith("/")) {
    return "/console/dashboard";
  }
  if (nextPath.startsWith("//")) {
    return "/console/dashboard";
  }
  if (nextPath === "/console" || nextPath === "/welcome" || nextPath === "/console/welcome") {
    return "/console/dashboard";
  }
  if (
    nextPath === "/console/login" ||
    nextPath === "/console/register" ||
    nextPath.startsWith("/console/login?") ||
    nextPath.startsWith("/console/register?")
  ) {
    return "/console/dashboard";
  }
  return nextPath;
}

export function toLoginPathWithNext(currentPath: string): string {
  const safeCurrentPath = currentPath.startsWith("/console") ? currentPath : "/console/dashboard";
  return `/console/login?next=${encodeURIComponent(safeCurrentPath)}`;
}
