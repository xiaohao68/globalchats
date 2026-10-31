import { describe, expect, it, vi } from "vitest";
import {
  reduceString,
  sleep,
  nextTickByTimeout,
  makeUUID,
  makeUUIDByHash,
  noopBoolean,
  hasChinese,
} from "../helper.ts";

describe("reduceString", () => {
  it("concatenates multiple strings", () => {
    expect(reduceString("a", "b", "c")).toBe("abc");
  });

  it("handles null and undefined values", () => {
    expect(reduceString("a", null, "b", undefined, "c")).toBe("abc");
  });

  it("returns empty string when no arguments", () => {
    expect(reduceString()).toBe("");
  });

  it("handles single string", () => {
    expect(reduceString("hello")).toBe("hello");
  });
});

describe("sleep", () => {
  it("resolves after specified time", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
  });

  it("resolves immediately with 0ms", async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("resolves immediately with no argument", async () => {
    await expect(sleep()).resolves.toBeUndefined();
  });
});

describe("nextTickByTimeout", () => {
  it("calls callback after timeout", async () => {
    const callback = vi.fn();
    nextTickByTimeout(callback, 10);

    expect(callback).not.toHaveBeenCalled();
    await sleep(20);
    expect(callback).toHaveBeenCalled();
  });

  it("calls callback with default 0ms timeout", async () => {
    const callback = vi.fn();
    nextTickByTimeout(callback);

    await sleep(10);
    expect(callback).toHaveBeenCalled();
  });
});

describe("makeUUID", () => {
  it("returns a valid UUID string", () => {
    const uuid = makeUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns unique UUIDs", () => {
    const uuid1 = makeUUID();
    const uuid2 = makeUUID();
    expect(uuid1).not.toBe(uuid2);
  });
});

describe("makeUUIDByHash", () => {
  it("returns consistent UUID for same hash", () => {
    const uuid1 = makeUUIDByHash("test-hash");
    const uuid2 = makeUUIDByHash("test-hash");
    expect(uuid1).toBe(uuid2);
  });

  it("returns different UUIDs for different hashes", () => {
    const uuid1 = makeUUIDByHash("hash1");
    const uuid2 = makeUUIDByHash("hash2");
    expect(uuid1).not.toBe(uuid2);
  });

  it("returns a valid UUID v5 string", () => {
    const uuid = makeUUIDByHash("test");
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("noopBoolean", () => {
  it("returns function that returns false by default", () => {
    const fn = noopBoolean();
    expect(fn()).toBe(false);
  });

  it("returns function that returns true when passed true", () => {
    const fn = noopBoolean(true);
    expect(fn()).toBe(true);
  });

  it("returns function that returns false when passed false", () => {
    const fn = noopBoolean(false);
    expect(fn()).toBe(false);
  });
});

describe("hasChinese", () => {
  it("returns true for string containing Chinese characters", () => {
    expect(hasChinese("你好")).toBe(true);
    expect(hasChinese("Hello 世界")).toBe(true);
  });

  it("returns false for string without Chinese characters", () => {
    expect(hasChinese("Hello World")).toBe(false);
    expect(hasChinese("12345")).toBe(false);
  });

  it("returns true for array where all strings contain Chinese", () => {
    expect(hasChinese(["你好", "世界"])).toBe(true);
  });

  it("returns false for array where not all strings contain Chinese", () => {
    expect(hasChinese(["你好", "Hello"])).toBe(false);
  });

  it("handles empty string", () => {
    expect(hasChinese("")).toBe(false);
  });
});
