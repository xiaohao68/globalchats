import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware.getCurrentUser / getUserById", () => {
  it("getCurrentUser returns fatal_error when provider is missing", () => {
    const backend = createMockBackend();

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    const res = middleware.getCurrentUser();
    expect(res.status).toBe("fatal_error");
    expect(res.error?.category).toBe("sdk");
  });

  it("getCurrentUser returns success when provider returns user", () => {
    const backend = createMockBackend();

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      {
        backend,
        getCurrentUser: () => ({
          id: "u1",
          nickname: "Alice",
          avatar: "x",
          isGroup: false,
        }),
      },
    );

    const res = middleware.getCurrentUser();
    expect(res.status).toBe("success");
    expect(res.data?.id).toBe("u1");
  });

  it("getUserById falls back to backend when not current user", async () => {
    const backend = createMockBackend({
      getUserById: async (_scope, userId) => {
        if (userId !== "u2") return null;
        return {
          id: "u2",
          nickname: "Bob",
          avatar: "",
          isGroup: false,
          version: 1,
          updatedAt: 1,
        };
      },
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      {
        backend,
        getCurrentUser: () => ({
          id: "u1",
          nickname: "Alice",
          avatar: "x",
          isGroup: false,
        }),
      },
    );

    const res = await middleware.getUserById("u2");
    expect(res.status).toBe("success");
    expect(res.data?.id).toBe("u2");
  });
});
