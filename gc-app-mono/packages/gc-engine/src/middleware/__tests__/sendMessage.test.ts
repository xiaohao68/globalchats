import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware.sendMessage", () => {
  it("returns fatal_error when no current user", async () => {
    const backend = createMockBackend();

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    const res = await middleware.sendMessage({
      receiverId: "u2",
      content: "hi",
    });
    expect(res.status).toBe("fatal_error");
    expect(res.error?.category).toBe("sdk");
  });

  it("calls backend.sendMessage and returns message", async () => {
    const backend = createMockBackend({
      sendMessage: async (_scope, input) => ({
        messageId: "m1",
        chatId: input.receiverId,
        senderId: input.senderId,
        content: input.content,
        timestamp: 1,
        messageType: "text",
        version: 1,
        updatedAt: 1,
      }),
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      {
        backend,
        getCurrentUser: () => ({
          id: "u1",
          nickname: "Alice",
          avatar: "",
          isGroup: false,
        }),
      },
    );

    const res = await middleware.sendMessage({
      receiverId: "u2",
      content: "hi",
    });
    expect(res.status).toBe("success");
    expect(res.data?.senderId).toBe("u1");
    expect(res.data?.chatId).toBe("u2");
  });
});
