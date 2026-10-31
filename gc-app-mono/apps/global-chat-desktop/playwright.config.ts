import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  // 超时设置（真实平台可能较慢）
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // 不完全并行（平台测试需串行）
  fullyParallel: false,

  // CI 配置
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  // 报告配置
  reporter: [
    ["html", { outputFolder: "test-results/html" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],

  // 通用配置
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // 项目配置
  projects: [
    {
      name: "app",
      testMatch: /specs\/app\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chat",
      testMatch: /specs\/chat\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["app"],
    },
    {
      name: "platforms",
      testMatch: /specs\/platforms\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["app"],
    },
  ],

  // 开发服务器 - 使用 Vite（不启动 Tauri）
  // 如需测试完整 Tauri 功能，请先手动运行: task tauri
  webServer: {
    command: "bun run dev:renderer",
    url: "http://localhost:1420",
    reuseExistingServer: true,
    timeout: 120_000,
  },

  // 输出目录
  outputDir: "test-results/artifacts",
});
