// 测试 API - 获取 WebView 列表
import { invoke } from "@tauri-apps/api/core";

export interface WebviewInfo {
  id: string;
  label: string;
  url: string | null;
}

/**
 * 获取所有 WebView 列表（用于测试）
 */
export async function getWebviews(): Promise<WebviewInfo[]> {
  return invoke<WebviewInfo[]>("get_webviews");
}
