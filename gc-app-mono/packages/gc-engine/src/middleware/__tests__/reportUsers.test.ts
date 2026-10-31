import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware.reportCurrentUser", () => {
  it("calls backend.pushCurrentUser and returns success", async () => {
    const calls: unknown[] = [];

    const backend = createMockBackend({
      pushCurrentUser: async (_scope, user) => {
        calls.push(user);
        return { acceptedCount: 1 };
      },
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      {
        backend,
        now: () => 1234,
      },
    );

    const result = await middleware.reportCurrentUser({
      id: "u1",
      nickname: "Alice",
      avatar: "x",
      isGroup: false,
    });

    expect(result.status).toBe("success");
    expect(result.acceptedCount).toBe(1);
    expect(calls).toHaveLength(1);
  });
});
