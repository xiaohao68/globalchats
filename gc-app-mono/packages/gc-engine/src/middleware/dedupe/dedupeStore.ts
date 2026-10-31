import type { SourceScope, TimestampMs } from "../types.ts";

export type DedupeStoreOptions = {
  windowMs: number;
  maxKeysPerScope: number;
};

type ScopeKey = string;

function makeScopeKey(scope: SourceScope): ScopeKey {
  return `${scope.platform}:${scope.appId}:${scope.webviewId}`;
}

export class DedupeStore {
  readonly #windowMs: number;
  readonly #maxKeysPerScope: number;
  readonly #store = new Map<ScopeKey, Map<string, TimestampMs>>();

  constructor(options: DedupeStoreOptions) {
    this.#windowMs = Math.max(1, options.windowMs);
    this.#maxKeysPerScope = Math.max(1, options.maxKeysPerScope);
  }

  checkAndMark(scope: SourceScope, key: string, now: TimestampMs): boolean {
    const scopeKey = makeScopeKey(scope);
    const scopeMap =
      this.#store.get(scopeKey) ?? new Map<string, TimestampMs>();
    this.#store.set(scopeKey, scopeMap);

    this.pruneScope(scopeMap, now);

    if (scopeMap.has(key)) {
      return false;
    }

    scopeMap.set(key, now);

    if (scopeMap.size > this.#maxKeysPerScope) {
      const firstKey = scopeMap.keys().next().value as string | undefined;
      if (firstKey) scopeMap.delete(firstKey);
    }

    return true;
  }

  prune(now: TimestampMs): void {
    for (const scopeMap of this.#store.values()) {
      this.pruneScope(scopeMap, now);
    }
  }

  private pruneScope(
    scopeMap: Map<string, TimestampMs>,
    now: TimestampMs,
  ): void {
    const threshold = now - this.#windowMs;
    for (const [key, ts] of scopeMap.entries()) {
      if (ts < threshold) {
        scopeMap.delete(key);
      } else {
        break;
      }
    }
  }
}
