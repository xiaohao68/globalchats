import { describe, expect, it } from "vitest";
import { migrateStore, mergeStoredWithDefaults } from "../helper/migrate.ts";
import { makeEmptyGlobalStore } from "@gc/model";

describe("mergeStoredWithDefaults", () => {
  it("merges persisted state with defaults", () => {
    const persistedState = {
      ...makeEmptyGlobalStore(),
      currentSignInUserId: "user-123",
    };

    const result = mergeStoredWithDefaults(persistedState);

    expect(result.currentSignInUserId).toBe("user-123");
    expect(result.globalSetting).toBeDefined();
  });

  it("preserves user config list from persisted state", () => {
    const persistedState = {
      ...makeEmptyGlobalStore(),
      userConfigList: {
        "user-1": { id: "user-1" },
      },
    };

    const result = mergeStoredWithDefaults(persistedState as any);

    expect(result.userConfigList).toEqual({ "user-1": { id: "user-1" } });
  });

  it("uses default values when persisted values are missing", () => {
    const persistedState = {
      ...makeEmptyGlobalStore(),
      globalSetting: {
        ...makeEmptyGlobalStore().globalSetting,
        proxy: undefined,
      },
    };

    const result = mergeStoredWithDefaults(persistedState as any);

    expect(result.globalSetting.proxy).toBeDefined();
  });
});

describe("migrateStore", () => {
  it("returns merged state for current version", () => {
    const persistedState = makeEmptyGlobalStore();
    const result = migrateStore(persistedState, 2);

    expect(result).toBeDefined();
    expect(result.globalSetting).toBeDefined();
  });

  it("migrates from version < 1.5", () => {
    const persistedState = {
      ...makeEmptyGlobalStore(),
      globalSetting: {
        ...makeEmptyGlobalStore().globalSetting,
        signState: {
          type: "activationCode",
          activationCode: "old-code",
          keepSign: true,
        },
      },
    };

    const result = migrateStore(persistedState as any, 1);

    expect(result.globalSetting.signState).not.toHaveProperty("type");
    expect(result.globalSetting.signState).not.toHaveProperty("activationCode");
    expect(result.globalSetting.signState.keepSign).toBe(true);
  });

  it("preserves email login data during migration", () => {
    const persistedState = {
      ...makeEmptyGlobalStore(),
      globalSetting: {
        ...makeEmptyGlobalStore().globalSetting,
        signState: {
          type: "email",
          email: "test@example.com",
          password: "secret",
          keepSign: true,
        },
      },
    };

    const result = migrateStore(persistedState as any, 1);

    expect(result.globalSetting.signState.email).toBe("test@example.com");
    expect(result.globalSetting.signState.password).toBe("secret");
  });
});
