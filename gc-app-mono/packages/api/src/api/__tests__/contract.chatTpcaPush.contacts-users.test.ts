import { describe, expect, it } from "vitest";
import { gqlRequest, shouldRunContractTests } from "./contractTestUtils.ts";

describe("contract: chatTpcaPush", () => {
  it.skipIf(!shouldRunContractTests())("exists on Mutation", async () => {
    const data = await gqlRequest<{
      __type: { fields: Array<{ name: string }> } | null;
    }>(
      `query IntrospectMutation { __type(name: "Mutation") { fields { name } } }`,
    );

    expect(data.__type).not.toBeNull();
    const names = new Set(data.__type!.fields.map((f) => f.name));
    expect(names.has("chatTpcaPush")).toBe(true);
  });
});
