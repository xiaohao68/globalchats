// 生成登录状态文件
import { test as base, chromium, type BrowserContext } from "@playwright/test";

async function generateState() {
  console.log("启动浏览器...");

  // 启动带调试端口的浏览器
  const browser = await chromium.launch({
    headless: false,
    args: ["--remote-debugging-port=9222"],
  });

  // 获取 CDP 端点
  const response = await fetch("http://localhost:9222/json/version");
  const { webSocketDebuggerUrl } = await response.json();

  console.log("连接到浏览器:", webSocketDebuggerUrl);

  // 连接已有浏览器
  const browser2 = await chromium.connectOverCDP(webSocketDebuggerUrl);
  const context = browser2.contexts()[0];

  console.log("浏览器上下文:", context);

  // 保存状态
  await context.storageState({
    path: "./playwright-state.json",
  });

  console.log("状态已保存到 playwright-state.json");

  await browser.close();
  await browser2.close();
}

generateState();
