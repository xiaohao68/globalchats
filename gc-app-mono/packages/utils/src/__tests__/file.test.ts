import { describe, expect, it } from "vitest";
import {
  computesSHA256ByFile,
  makeMultipartFormData,
  getExtensionByContentType,
  makeObjectToSearchQuery,
} from "../file.ts";

describe("computesSHA256ByFile", () => {
  it("computes SHA256 hash of ArrayBuffer", () => {
    const buffer = new TextEncoder().encode("test content").buffer;
    const hash = computesSHA256ByFile(buffer);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns consistent hash for same content", () => {
    const buffer1 = new TextEncoder().encode("same content").buffer;
    const buffer2 = new TextEncoder().encode("same content").buffer;

    expect(computesSHA256ByFile(buffer1)).toBe(computesSHA256ByFile(buffer2));
  });

  it("returns different hash for different content", () => {
    // Create distinct ArrayBuffers with different content
    const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
    const arr2 = new Uint8Array([5, 4, 3, 2, 1]);

    const hash1 = computesSHA256ByFile(arr1.buffer);
    const hash2 = computesSHA256ByFile(arr2.buffer);

    // Both should be valid hashes
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash2).toMatch(/^[a-f0-9]{64}$/);
    // And they should be different
    expect(hash1).not.toBe(hash2);
  });
});

describe("makeMultipartFormData", () => {
  it("creates multipart form data with boundary", () => {
    const file = new TextEncoder().encode("file content").buffer;
    const result = makeMultipartFormData(file, "test.txt");

    expect(result).toHaveProperty("body");
    expect(result).toHaveProperty("boundary");
    expect(result.boundary).toMatch(/^----WebKitFormBoundary/);
  });

  it("includes filename in form data", () => {
    const file = new TextEncoder().encode("content").buffer;
    const result = makeMultipartFormData(file, "myfile.pdf");

    const bodyString = new TextDecoder().decode(result.body);
    expect(bodyString).toContain('filename="myfile.pdf"');
  });

  it("includes file content in body", () => {
    const content = "test file content";
    const file = new TextEncoder().encode(content).buffer;
    const result = makeMultipartFormData(file, "test.txt");

    const bodyString = new TextDecoder().decode(result.body);
    expect(bodyString).toContain(content);
  });
});

describe("getExtensionByContentType", () => {
  it("returns extension for known content types", () => {
    // Extensions include the dot prefix
    expect(getExtensionByContentType("image/jpeg")).toBe(".jpg");
    expect(getExtensionByContentType("image/png")).toBe(".png");
    expect(getExtensionByContentType("application/pdf")).toBe(".pdf");
  });

  it("returns empty string for unknown content type", () => {
    expect(getExtensionByContentType("unknown/type")).toBe("");
  });
});

describe("makeObjectToSearchQuery", () => {
  it("converts object to query string", () => {
    const result = makeObjectToSearchQuery({ foo: "bar", baz: "qux" });
    expect(result).toBe("foo=bar&baz=qux");
  });

  it("handles boolean values", () => {
    const result = makeObjectToSearchQuery({ active: true, disabled: false });
    expect(result).toContain("active=true");
    expect(result).toContain("disabled=false");
  });

  it("handles number values", () => {
    const result = makeObjectToSearchQuery({ count: 42, page: 1 });
    expect(result).toContain("count=42");
    expect(result).toContain("page=1");
  });

  it("handles empty object", () => {
    const result = makeObjectToSearchQuery({});
    expect(result).toBe("");
  });
});
