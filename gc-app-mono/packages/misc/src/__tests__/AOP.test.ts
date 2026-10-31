import { describe, expect, it, vi } from "vitest";
import {
  implAOP,
  beforeAOP,
  afterAOP,
  implAOPAsync,
  beforeAOPAsync,
  afterAOPAsync,
} from "../AOP.ts";

describe("AOP", () => {
  describe("implAOP", () => {
    it("executes before, target, and after functions in order", () => {
      const order: string[] = [];
      const beforeFn = vi.fn(() => {
        order.push("before");
        return "beforeResult";
      });
      const targetFn = vi.fn(() => {
        order.push("target");
        return "targetResult";
      });
      const afterFn = vi.fn(() => {
        order.push("after");
      });

      const wrappedFn = implAOP(beforeFn, afterFn)(targetFn);
      const result = wrappedFn("arg1", "arg2");

      expect(order).toEqual(["before", "target", "after"]);
      expect(result).toBe("targetResult");
      expect(beforeFn).toHaveBeenCalledWith("arg1", "arg2");
      expect(targetFn).toHaveBeenCalledWith("arg1", "arg2");
      expect(afterFn).toHaveBeenCalledWith(
        "beforeResult",
        "targetResult",
        "arg1",
        "arg2",
      );
    });
  });

  describe("beforeAOP", () => {
    it("executes before function before target", () => {
      const order: string[] = [];
      const beforeFn = vi.fn(() => order.push("before"));
      const targetFn = vi.fn(() => {
        order.push("target");
        return "result";
      });

      const wrappedFn = beforeAOP(beforeFn)(targetFn);
      const result = wrappedFn("arg");

      expect(order).toEqual(["before", "target"]);
      expect(result).toBe("result");
    });
  });

  describe("afterAOP", () => {
    it("executes after function after target", () => {
      const order: string[] = [];
      const afterFn = vi.fn(() => order.push("after"));
      const targetFn = vi.fn(() => {
        order.push("target");
        return "result";
      });

      const wrappedFn = afterAOP(afterFn)(targetFn);
      const result = wrappedFn("arg");

      expect(order).toEqual(["target", "after"]);
      expect(result).toBe("result");
    });
  });

  describe("implAOPAsync", () => {
    it("executes async before, target, and after functions in order", async () => {
      const order: string[] = [];
      const beforeFn = vi.fn(async () => {
        order.push("before");
        return "beforeResult";
      });
      const targetFn = vi.fn(async () => {
        order.push("target");
        return "targetResult";
      });
      const afterFn = vi.fn(async () => {
        order.push("after");
      });

      const wrappedFn = implAOPAsync(beforeFn, afterFn)(targetFn);
      const result = await wrappedFn("arg1", "arg2");

      expect(order).toEqual(["before", "target", "after"]);
      expect(result).toBe("targetResult");
    });
  });

  describe("beforeAOPAsync", () => {
    it("executes async before function before target", async () => {
      const order: string[] = [];
      const beforeFn = vi.fn(async () => order.push("before"));
      const targetFn = vi.fn(async () => {
        order.push("target");
        return "result";
      });

      const wrappedFn = beforeAOPAsync(beforeFn)(targetFn);
      const result = await wrappedFn("arg");

      expect(order).toEqual(["before", "target"]);
      expect(result).toBe("result");
    });
  });

  describe("afterAOPAsync", () => {
    it("executes async after function after target", async () => {
      const order: string[] = [];
      const afterFn = vi.fn(async () => order.push("after"));
      const targetFn = vi.fn(async () => {
        order.push("target");
        return "result";
      });

      const wrappedFn = afterAOPAsync(afterFn)(targetFn);
      const result = await wrappedFn("arg");

      expect(order).toEqual(["target", "after"]);
      expect(result).toBe("result");
    });
  });
});
