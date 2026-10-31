// apps/global-chat-desktop/tests/e2e/utils/assertions.ts
import { expect, Page } from "@playwright/test";
import { testLogger, logAssertions, ParsedLogEntry } from "./logger";

/**
 * 自定义断言工具
 */
export const customAssertions = {
  /**
   * 断言元素可见且包含文本
   */
  async toBeVisibleWithText(page: Page, selector: string, text: string) {
    const element = page.locator(selector);
    await expect(element).toBeVisible();
    await expect(element).toContainText(text);
  },

  /**
   * 断言页面 URL 匹配
   */
  async toHaveUrlMatching(page: Page, pattern: RegExp) {
    await expect(page).toHaveURL(pattern);
  },

  /**
   * 断言元素数量
   */
  async toHaveCount(page: Page, selector: string, count: number) {
    const elements = page.locator(selector);
    await expect(elements).toHaveCount(count);
  },

  /**
   * 断言项目日志中存在特定消息
   */
  assertLogContains(
    messageContains: string,
    options?: { source?: string; level?: string }
  ) {
    const logs = testLogger.queryProjectLogs({
      messageContains,
      ...options,
    });
    expect(logs.length).toBeGreaterThan(0);
    return logs;
  },

  /**
   * 断言项目日志中不存在错误
   */
  assertNoLogErrors(options?: { source?: string; startTime?: number }) {
    const logs = testLogger.queryProjectLogs({
      level: "error",
      ...options,
    });
    expect(logs.length).toBe(0);
  },

  /**
   * 获取测试期间的日志（用于断言）
   */
  getLogsInTimeRange(startMs: number, endMs: number): ParsedLogEntry[] {
    return testLogger.queryProjectLogs({
      startTime: startMs,
      endTime: endMs,
    });
  },

  /**
   * 断言日志中存在特定来源的消息
   */
  assertLogSource(source: string, messageContains?: string) {
    const logs = testLogger.queryProjectLogs({
      source,
      messageContains,
    });
    expect(logs.length).toBeGreaterThan(0);
    return logs;
  },
};

export { testLogger, logAssertions };
