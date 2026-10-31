import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware contact operations", () => {
  it("returns not_supported when backend does not support add/remove", async () => {
    const backend = createMockBackend();

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    expect((await middleware.addContact("c1")).status).toBe("not_supported");
    expect((await middleware.removeContact("c1")).status).toBe("not_supported");
  });

  it("searchContacts returns results when backend supports it", async () => {
    const backend = createMockBackend({
      searchContacts: async () => ({
        items: [{ contactId: "c1", nickname: "Bob", version: 1, updatedAt: 1 }],
        hasMore: false,
      }),
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    const res = await middleware.searchContacts({ query: "bo" });
    expect(res.status).toBe("success");
    expect(res.data?.items[0]?.contactId).toBe("c1");
  });
});
