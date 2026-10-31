/**
 * Tests for utils/helpers module
 *
 * @module utils.test
 */

import { describe, it, expect } from "vitest";
import {
  isGroupId,
  isIndividualId,
  getSerializedId,
  toThirdAppUserInfo,
  getPhoneFromWid,
} from "../utils/helpers";
import { createMockWid, createMockContact } from "./mocks/moduleLoader.mock";

describe("utils/helpers", () => {
  describe("isGroupId", () => {
    it("should return true for group IDs ending with @g.us", () => {
      expect(isGroupId("123456789012345@g.us")).toBe(true);
    });

    it("should return false for individual IDs ending with @c.us", () => {
      expect(isGroupId("1234567890@c.us")).toBe(false);
    });

    it("should return false for IDs without proper suffix", () => {
      expect(isGroupId("1234567890")).toBe(false);
      expect(isGroupId("1234567890@example.com")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isGroupId("")).toBe(false);
    });

    it("should handle IDs with special characters", () => {
      expect(isGroupId("123-456-789@g.us")).toBe(true);
      expect(isGroupId("123_456_789@c.us")).toBe(false);
    });
  });

  describe("isIndividualId", () => {
    it("should return true for individual IDs ending with @c.us", () => {
      expect(isIndividualId("1234567890@c.us")).toBe(true);
    });

    it("should return false for group IDs ending with @g.us", () => {
      expect(isIndividualId("123456789012345@g.us")).toBe(false);
    });

    it("should return false for IDs without proper suffix", () => {
      expect(isIndividualId("1234567890")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isIndividualId("")).toBe(false);
    });
  });

  describe("getSerializedId", () => {
    it("should return the _serialized property from WAWid", () => {
      const wid = createMockWid("1234567890", false);

      expect(getSerializedId(wid)).toBe("1234567890@c.us");
    });

    it("should return group ID correctly", () => {
      const wid = createMockWid("123456789012345", true);

      expect(getSerializedId(wid)).toBe("123456789012345@g.us");
    });
  });

  describe("toThirdAppUserInfo", () => {
    it("should convert WAContact to IThirdAppUserInfo", () => {
      const contact = createMockContact("1234567890@c.us", "Alice", {
        phone: "1234567890",
        avatar: "https://example.com/avatar.jpg",
      });

      const userInfo = toThirdAppUserInfo(contact);

      expect(userInfo.id).toBe("1234567890@c.us");
      expect(userInfo.nickname).toBe("Alice");
      expect(userInfo.avatar).toBe("https://example.com/avatar.jpg");
      expect(userInfo.isGroup).toBe(false);
      expect(userInfo.phone).toBe("1234567890");
    });

    it("should use shortName when name is empty", () => {
      const contact = createMockContact("1234567890@c.us", "", {
        shortName: "Ali",
      });

      const userInfo = toThirdAppUserInfo(contact);

      expect(userInfo.nickname).toBe("Ali");
    });

    it("should handle group contact", () => {
      const contact = createMockContact(
        "123456789012345@g.us",
        "Family Group",
        {
          memberCount: 10,
        },
      );

      const userInfo = toThirdAppUserInfo(contact);

      expect(userInfo.id).toBe("123456789012345@g.us");
      expect(userInfo.nickname).toBe("Family Group");
      expect(userInfo.isGroup).toBe(true);
      expect(userInfo.phone).toBeUndefined();
    });

    it("should handle missing optional fields", () => {
      const contact = createMockContact("1234567890@c.us", "Bob");

      const userInfo = toThirdAppUserInfo(contact);

      expect(userInfo.avatar).toBe("");
      expect(userInfo.phone).toBeUndefined();
    });
  });

  describe("getPhoneFromWid", () => {
    it("should return user for individual WID", () => {
      const wid = createMockWid("1234567890", false);

      expect(getPhoneFromWid(wid)).toBe("1234567890");
    });

    it("should return undefined for group WID", () => {
      const wid = createMockWid("123456789012345", true);

      expect(getPhoneFromWid(wid)).toBeUndefined();
    });
  });
});
