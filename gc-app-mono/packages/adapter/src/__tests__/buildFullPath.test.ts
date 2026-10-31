import { describe, expect, it } from "vitest";
import { buildFullPath } from "../axios-tauri-api-adapter/buildFullPath.ts";

describe("buildFullPath", () => {
  it("returns requestedURL when it is absolute", () => {
    expect(buildFullPath("https://base.com", "https://other.com/path")).toBe(
      "https://other.com/path",
    );
  });

  it("returns requestedURL when baseURL is empty", () => {
    expect(buildFullPath("", "/path")).toBe("/path");
  });

  it("combines baseURL and relative requestedURL", () => {
    expect(buildFullPath("https://base.com", "path")).toBe(
      "https://base.com/path",
    );
  });

  it("handles baseURL with trailing slash", () => {
    expect(buildFullPath("https://base.com/", "path")).toBe(
      "https://base.com/path",
    );
  });

  it("handles requestedURL with leading slash", () => {
    expect(buildFullPath("https://base.com", "/path")).toBe(
      "https://base.com/path",
    );
  });

  it("handles both trailing and leading slashes", () => {
    expect(buildFullPath("https://base.com/", "/path")).toBe(
      "https://base.com/path",
    );
  });

  it("returns baseURL when requestedURL is empty", () => {
    expect(buildFullPath("https://base.com", "")).toBe("https://base.com");
  });

  it("handles protocol-relative URLs as absolute", () => {
    expect(buildFullPath("https://base.com", "//other.com/path")).toBe(
      "//other.com/path",
    );
  });

  it("handles undefined parameters", () => {
    expect(buildFullPath(undefined, undefined)).toBe("");
    expect(buildFullPath("https://base.com", undefined)).toBe("https://base.com");
  });
});
