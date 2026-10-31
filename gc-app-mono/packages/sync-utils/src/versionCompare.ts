import { SyncableEntity } from "./types";

export function compareVersion<T extends SyncableEntity>(
  local: T,
  remote: T,
): "local" | "remote" | "conflict" {
  if (local.version > remote.version) return "local";
  if (local.version < remote.version) return "remote";

  if (local.updatedAt > remote.updatedAt) return "local";
  if (local.updatedAt < remote.updatedAt) return "remote";

  return "conflict";
}
