import { EPlatform } from "@gc/model";

/**
 * 平台显示名称映射
 */
export const platformNames: Record<EPlatform, string> = {
  [EPlatform.Telegram]: "Telegram",
  [EPlatform.Whatsapp]: "WhatsApp",
  [EPlatform.WhatsappBusinessAPI]: "WhatsApp Business",
  [EPlatform.Messenger]: "Messenger",
  [EPlatform.Instagram]: "Instagram",
  [EPlatform.Facebook]: "Facebook",
  [EPlatform.Tiktok]: "TikTok",
  [EPlatform.Linkedin]: "LinkedIn",
  [EPlatform.Teams]: "Teams",
  [EPlatform.Line]: "Line",
  [EPlatform.Zalo]: "Zalo",
  [EPlatform.Fingerprint]: "Fingerprint",
  [EPlatform.Aggregated]: "聚合",
};

/**
 * 平台品牌颜色映射
 */
export const platformColors: Record<EPlatform, string> = {
  [EPlatform.Telegram]: "#0088cc",
  [EPlatform.Whatsapp]: "#25D366",
  [EPlatform.WhatsappBusinessAPI]: "#25D366",
  [EPlatform.Messenger]: "#0084ff",
  [EPlatform.Instagram]: "#E4405F",
  [EPlatform.Facebook]: "#1877F2",
  [EPlatform.Tiktok]: "#000000",
  [EPlatform.Linkedin]: "#0A66C2",
  [EPlatform.Teams]: "#6264A7",
  [EPlatform.Line]: "#00C300",
  [EPlatform.Zalo]: "#0068FF",
  [EPlatform.Fingerprint]: "#666666",
  [EPlatform.Aggregated]: "#8B5CF6",
};

/**
 * 默认平台颜色（用于未知平台）
 */
export const DEFAULT_PLATFORM_COLOR = "#666666";
