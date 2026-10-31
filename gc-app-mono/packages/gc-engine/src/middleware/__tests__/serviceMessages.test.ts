import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware.getMessages", () => {
  it("returns messages from backend", async () => {
    const backend = createMockBackend({
      getMessages: async () => ({
        items: [
          {
            messageId: "m1",
            chatId: "chat1",
            senderId: "u1",
            content: "hi",
            timestamp: 1,
            messageType: "text",
            version: 1,
            updatedAt: 1,
          },
        ],
        hasMore: false,
      }),
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    const res = await middleware.getMessages({
      conversationId: "chat1",
      limit: 10,
    });
    expect(res.status).toBe("success");
    expect(res.data?.items).toHaveLength(1);
  });
});
