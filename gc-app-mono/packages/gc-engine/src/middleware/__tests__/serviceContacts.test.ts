import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware.getContacts", () => {
  it("returns items from backend", async () => {
    const backend = createMockBackend({
      getContacts: async () => ({
        items: [
          { contactId: "c1", nickname: "Bob", version: 1, updatedAt: 1 },
          { contactId: "c2", nickname: "Eve", version: 1, updatedAt: 1 },
        ],
        hasMore: false,
      }),
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    const res = await middleware.getContacts({ limit: 2 });
    expect(res.status).toBe("success");
    expect(res.data?.items).toHaveLength(2);
  });
});
