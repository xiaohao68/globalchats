import { moduleLoader } from "./moduleLoader";
import type { WAWid } from "../types";

/**
 * 头像图片信息
 */
export interface ProfilePicInfo {
  /** 完整头像 URL */
  eurl: string;
  /** 预览头像 URL */
  previewEurl: string;
  /** 文件哈希 */
  filehash?: string;
  /** 完整路径 */
  fullDirectPath?: string;
  /** 预览路径 */
  previewDirectPath?: string;
  /** 是否过期 */
  stale?: boolean;
}

/**
 * ProfilePic 接口
 */
export interface IProfilePic {
  /** 从服务器请求头像 */
  requestProfilePicFromServer: (wid: WAWid) => Promise<ProfilePicInfo>;
  /** 批量同步头像 */
  profilePicResync?: (wids: WAWid[]) => Promise<ProfilePicInfo[]>;
}

/**
 * 获取 ProfilePic 模块
 */
export function getProfilePic(): IProfilePic | null {
  return moduleLoader.get<IProfilePic>("WAWebContactProfilePicThumbBridge");
}

/**
 * 获取用户头像 URL
 * @param wid 用户 WID
 * @returns 头像 URL 或空字符串
 */
export async function getAvatarUrl(wid: WAWid): Promise<string> {
  const profilePic = getProfilePic();
  if (!profilePic) {
    console.warn("[WhatsAppSDK] ProfilePic module not available");
    return "";
  }

  try {
    const pic = await profilePic.requestProfilePicFromServer(wid);
    return pic.previewEurl || pic.eurl || "";
  } catch (error) {
    // 头像获取失败是常见情况（用户未设置头像等）
    console.debug("[WhatsAppSDK] Failed to get avatar:", error);
    return "";
  }
}
