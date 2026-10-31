import { describe, expect, it } from "vitest";
import { GCEngineMiddleware } from "../GCEngineMiddleware.ts";
import { createMockBackend } from "./mockBackend.ts";

describe("GCEngineMiddleware.reportContacts", () => {
  it("calls backend.pushContacts and returns acceptedCount", async () => {
    let accepted = 0;

    const backend = createMockBackend({
      pushContacts: async (_scope, contacts) => {
        accepted = contacts.length;
        return { acceptedCount: contacts.length };
      },
    });

    const middleware = new GCEngineMiddleware(
      { appId: "a1", platform: "Telegram" as any, webviewId: "w1" },
      { backend },
    );

    const result = await middleware.reportContacts([
      {
        contactId: "c1",
        nickname: "Bob",
        version: 1,
        updatedAt: 1,
      },
      {
        contactId: "c2",
        nickname: "Eve",
        version: 1,
        updatedAt: 1,
      },
    ]);

    expect(result.status).toBe("success");
    expect(result.acceptedCount).toBe(2);
    expect(accepted).toBe(2);
  });
});
