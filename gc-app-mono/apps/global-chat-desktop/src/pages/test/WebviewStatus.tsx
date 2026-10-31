import { useEffect, useState } from "react";
import { getWebviews } from "./testApi";

interface WebviewStatus {
  platform: string;
  appId: string;
  status: string;
  isActive: boolean;
}

/**
 * 测试页面 - 返回 WebView 状态
 * 用于 Playwright E2E 测试检查平台登录状态
 */
export default function TestWebviewStatus() {
  const [status, setStatus] = useState<WebviewStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 从 Tauri 获取 WebView 列表
    getWebviews()
      .then((webviews) => {
        console.log("WebViews:", webviews);
        // 解析 WebView 信息
        const webviewStatus: WebviewStatus[] = webviews.map((wv) => {
          // 从 label 解析平台信息
          let platform = "unknown";
          let appId = wv.id;

          if (wv.label.includes("whatsapp")) {
            platform = "WhatsApp";
          } else if (wv.label.includes("telegram")) {
            platform = "Telegram";
          } else if (wv.label.includes("main")) {
            platform = "Main";
          } else if (wv.label.includes("secondary")) {
            platform = "Secondary";
          }

          return {
            platform,
            appId,
            status: wv.url ? "loaded" : "unknown",
            isActive: false,
          };
        });

        setStatus(webviewStatus);
      })
      .catch((err) => {
        console.error("Failed to get webviews:", err);
        setError(err.toString());
      });
  }, []);

  // 返回 JSON 格式
  return (
    <div>
      <h1>WebView Status</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <pre>{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}
