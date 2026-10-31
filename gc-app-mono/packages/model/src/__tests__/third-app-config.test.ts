import { describe, expect, it } from "vitest";
import {
  EPlatform,
  defaultPlatformConfigList,
  makeEmptyChatUserConfig,
  makeEmptyThirdAppUserInfo,
} from "../data/config/third-app-config.ts";

describe("EPlatform", () => {
  it("contains all expected platforms", () => {
    expect(EPlatform.Telegram).toBe("Telegram");
    expect(EPlatform.Whatsapp).toBe("WhatsApp");
    expect(EPlatform.Messenger).toBe("Messenger");
    expect(EPlatform.Instagram).toBe("Instagram");
    expect(EPlatform.Tiktok).toBe("Tiktok");
    expect(EPlatform.Facebook).toBe("Facebook");
    expect(EPlatform.Linkedin).toBe("Linkedin");
    expect(EPlatform.Teams).toBe("Teams");
    expect(EPlatform.Fingerprint).toBe("Fingerprint");
    expect(EPlatform.Aggregated).toBe("Aggregated");
  });
});

describe("defaultPlatformConfigList", () => {
  it("is an array of platform configs", () => {
    expect(Array.isArray(defaultPlatformConfigList)).toBe(true);
    expect(defaultPlatformConfigList.length).toBeGreaterThan(0);
  });

  it("each config has required properties", () => {
    defaultPlatformConfigList.forEach((config) => {
      expect(config).toHaveProperty("id");
      expect(config).toHaveProperty("platform");
      expect(config).toHaveProperty("url");
      expect(config).toHaveProperty("support");
    });
  });

  it("contains Telegram config with correct URL", () => {
    const telegramConfig = defaultPlatformConfigList.find(
      (c) => c.id === EPlatform.Telegram,
    );
    expect(telegramConfig).toBeDefined();
    expect(telegramConfig?.url).toBe("https://web.telegram.org/a/");
    expect(telegramConfig?.support).toBe(true);
  });

  it("contains WhatsApp config with correct URL", () => {
    const whatsappConfig = defaultPlatformConfigList.find(
      (c) => c.id === EPlatform.Whatsapp,
    );
    expect(whatsappConfig).toBeDefined();
    expect(whatsappConfig?.url).toBe("https://web.whatsapp.com/");
    expect(whatsappConfig?.support).toBe(true);
  });
});

describe("makeEmptyThirdAppUserInfo", () => {
  it("returns object with empty default values", () => {
    const userInfo = makeEmptyThirdAppUserInfo();

    expect(userInfo.id).toBe("");
    expect(userInfo.nickname).toBe("");
    expect(userInfo.avatar).toBe("");
    expect(userInfo.isGroup).toBe(false);
  });

  it("returns a new object each time", () => {
    const userInfo1 = makeEmptyThirdAppUserInfo();
    const userInfo2 = makeEmptyThirdAppUserInfo();

    expect(userInfo1).not.toBe(userInfo2);
    expect(userInfo1).toEqual(userInfo2);
  });
});

describe("makeEmptyChatUserConfig", () => {
  it("returns object with translate config", () => {
    const config = makeEmptyChatUserConfig();

    expect(config).toHaveProperty("translate");
    expect(config.translate).toBeDefined();
  });

  it("returns a new object each time", () => {
    const config1 = makeEmptyChatUserConfig();
    const config2 = makeEmptyChatUserConfig();

    expect(config1).not.toBe(config2);
  });
});
