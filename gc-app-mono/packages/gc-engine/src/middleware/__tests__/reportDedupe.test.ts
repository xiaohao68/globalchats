import { describe, expect, it } from "vitest";
import { DedupeStore } from "../dedupe/dedupeStore.ts";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware dedupe", () => {
  it("dedupes messages by messageId", async () => {
    const backend = createMockBackend({
      pushMessages: async (_scope, messages) => ({
        acceptedCount: messages.length,
      }),
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      {
        backend,
        dedupeStore: new DedupeStore({
          windowMs: 60_000,
          maxKeysPerScope: 100,
        }),
        now: () => 1000,
      },
    );

    const first = await middleware.reportMessages([
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
    expect(first.acceptedCount).toBe(1);

    const second = await middleware.reportMessages([
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
    expect(second.acceptedCount).toBe(0);
    expect(second.dedupedCount).toBe(1);
  });

  it("dedupes events by eventId (or type+occurredAt)", async () => {
    let pushed = 0;

    const backend = createMockBackend({
      pushEvents: async (_scope, events) => {
        pushed += events.length;
        return { acceptedCount: events.length };
      },
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      {
        backend,
        dedupeStore: new DedupeStore({
          windowMs: 60_000,
          maxKeysPerScope: 100,
        }),
        now: () => 1000,
      },
    );

    await middleware.reportEvents([
      {
        eventId: "e1",
        type: "friend_request",
        occurredAt: 111,
        version: 1,
        updatedAt: 1,
      },
    ]);
    await middleware.reportEvents([
      {
        eventId: "e1",
        type: "friend_request",
        occurredAt: 111,
        version: 1,
        updatedAt: 1,
      },
    ]);

    expect(pushed).toBe(1);
  });
});
