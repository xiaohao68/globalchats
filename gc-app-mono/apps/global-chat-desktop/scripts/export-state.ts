// 导出 Tauri 浏览器状态
import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

async function exportBrowserState() {
  console.log("正在启动浏览器并连接到 Tauri...");

  // 启动带调试的浏览器
  const browser = await chromium.launch({
    headless: false,
    args: ["--remote-debugging-port=9222"],
  });

  // 等待用户手动操作
  console.log("请在浏览器中登录 WhatsApp，然后按回车继续...");
  await new Promise((resolve) => process.stdin.once("data", resolve));

  // 获取调试端点
  const response = await fetch("http://localhost:9222/json/version");
  const debugInfo = await response.json();
  console.log("浏览器调试端点:", debugInfo.webSocketDebuggerUrl);

  // 连接 CDP
  const browser2 = await chromium.connectOverCDP(debugInfo.webSocketDebuggerUrl);
  const context = browser2.contexts()[0];

  // 保存状态
  const statePath = path.join(process.cwd(), "playwright-state.json");
  await context.storageState({ path: statePath });

  console.log(`状态已保存到: ${statePath}`);

  const cookies = await context.cookies();
  console.log(`导出 ${cookies.length} 个 cookies`);

  await browser.close();
  await browser2.close();
}

exportBrowserState().catch(console.error);
