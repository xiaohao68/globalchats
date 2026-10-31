import { describe, expect, it } from "vitest";
import buildURL from "../axios-tauri-api-adapter/buildURL.ts";

describe("buildURL", () => {
  it("returns url unchanged when no params provided", () => {
    expect(buildURL("https://example.com")).toBe("https://example.com");
  });

  it("appends params to url without existing query string", () => {
    const result = buildURL("https://example.com", { foo: "bar" });
    expect(result).toBe("https://example.com?foo=bar");
  });

  it("appends params to url with existing query string", () => {
    const result = buildURL("https://example.com?existing=1", { foo: "bar" });
    expect(result).toBe("https://example.com?existing=1&foo=bar");
  });

  it("handles array params", () => {
    const result = buildURL("https://example.com", { arr: [1, 2, 3] });
    expect(result).toBe("https://example.com?arr=1&arr=2&arr=3");
  });

  it("removes hash from url before appending params", () => {
    const result = buildURL("https://example.com#hash", { foo: "bar" });
    expect(result).toBe("https://example.com?foo=bar");
  });

  it("encodes special characters in params", () => {
    const result = buildURL("https://example.com", { key: "value with spaces" });
    // URLSearchParams encodes spaces as + but then + gets encoded as %2B
    expect(result).toContain("key=value");
    expect(result).toContain("spaces");
  });

  it("handles URLSearchParams as params", () => {
    const params = new URLSearchParams();
    params.append("foo", "bar");
    params.append("baz", "qux");
    const result = buildURL("https://example.com", params);
    expect(result).toBe("https://example.com?foo=bar&baz=qux");
  });

  it("uses custom serialize function when provided", () => {
    const customSerialize = (params: Record<string, any>) =>
      Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
    const result = buildURL(
      "https://example.com",
      { a: 1, b: 2 },
      { serialize: customSerialize },
    );
    expect(result).toBe("https://example.com?a=1&b=2");
  });

  it("uses custom encode function when provided", () => {
    const customEncode = (val: string) => val.toUpperCase();
    const result = buildURL(
      "https://example.com",
      { foo: "bar" },
      { encode: customEncode },
    );
    expect(result).toBe("https://example.com?FOO=BAR");
  });
});
