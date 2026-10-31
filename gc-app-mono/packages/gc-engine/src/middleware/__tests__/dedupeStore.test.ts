import { describe, expect, it } from "vitest";
import type { EPlatform } from "@gc/model";
import { DedupeStore } from "../dedupe/dedupeStore.ts";

describe("DedupeStore", () => {
  it("dedupes within the window per scope", () => {
    const store = new DedupeStore({ windowMs: 1000, maxKeysPerScope: 10 });
    const scope = {
      appId: "a1",
      platform: "Telegram" as EPlatform,
      webviewId: "w1",
    };

    expect(store.checkAndMark(scope, "k1", 1000)).toBe(true);
    expect(store.checkAndMark(scope, "k1", 1100)).toBe(false);
  });

  it("allows the same key after the window passes", () => {
    const store = new DedupeStore({ windowMs: 1000, maxKeysPerScope: 10 });
    const scope = {
      appId: "a1",
      platform: "Telegram" as EPlatform,
      webviewId: "w1",
    };

    expect(store.checkAndMark(scope, "k1", 1000)).toBe(true);
    expect(store.checkAndMark(scope, "k1", 2500)).toBe(true);
  });
});
