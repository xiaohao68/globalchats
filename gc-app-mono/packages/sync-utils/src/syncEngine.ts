import { SyncableEntity, SyncResult } from "./types";
import { compareVersion } from "./versionCompare";

export class SyncEngine {
  compareData<T extends SyncableEntity & { id: string }>(
    local: T[],
    remote: T[],
  ): SyncResult<T> {
    const result: SyncResult<T> = {
      toUpload: [],
      toUpdate: [],
      conflicts: [],
    };

    const remoteMap = new Map(remote.map((item) => [item.id, item]));
    const localMap = new Map(local.map((item) => [item.id, item]));

    for (const localItem of local) {
      const remoteItem = remoteMap.get(localItem.id);
      if (!remoteItem) {
        result.toUpload.push(localItem);
      } else {
        const comparison = compareVersion(localItem, remoteItem);
        if (comparison === "remote") {
          result.toUpdate.push(remoteItem);
        } else if (comparison === "conflict") {
          result.conflicts.push(localItem);
        }
      }
    }

    for (const remoteItem of remote) {
      if (!localMap.has(remoteItem.id)) {
        result.toUpdate.push(remoteItem);
      }
    }

    return result;
  }

  mergeData<T extends SyncableEntity & { id: string }>(
    local: T[],
    remote: T[],
  ): T[] {
    const merged = new Map<string, T>();

    for (const item of local) {
      merged.set(item.id, item);
    }

    for (const remoteItem of remote) {
      const localItem = merged.get(remoteItem.id);
      if (!localItem) {
        merged.set(remoteItem.id, remoteItem);
      } else {
        const comparison = compareVersion(localItem, remoteItem);
        if (comparison === "remote") {
          merged.set(remoteItem.id, remoteItem);
        }
      }
    }

    return Array.from(merged.values());
  }
}
