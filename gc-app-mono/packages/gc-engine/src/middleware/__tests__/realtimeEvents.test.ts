import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware realtime events", () => {
  it("onNewMessage receives published messages", () => {
    const backend = createMockBackend();

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    const received: string[] = [];
    const off = middleware.onNewMessage((m) => received.push(m.messageId));

    middleware.publishNewMessages([
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
    ]);

    off();
    expect(received).toEqual(["m1"]);
  });
});
