import { ITranslateConfig, makeEmptyTranslateConfig } from "../translate";

export enum EPlatform {
  Telegram = "Telegram",
  Whatsapp = "WhatsApp",
  WhatsappBusinessAPI = "Whatsapp Business API",
  Messenger = "Messenger",
  Instagram = "Instagram",
  Tiktok = "Tiktok",
  Facebook = "Facebook",
  Line = "Line",
  Zalo = "Zalo",
  Linkedin = "Linkedin",
  Teams = "Teams",
  Fingerprint = "Fingerprint",
  Aggregated = "Aggregated",
  // Twitter = "Twitter",
  // Discord = "Discord",
  // Meta = "Meta",
}

export const defaultPlatformConfigList: IPlatformConfig[] = [
  {
    id: EPlatform.Telegram,
    platform: EPlatform.Telegram,
    url: "https://web.telegram.org/a/",
    support: true,
  },
  {
    id: EPlatform.Tiktok,
    platform: EPlatform.Tiktok,
    url: "https://www.tiktok.com/messages",
    support: true,
  },
  {
    id: EPlatform.Whatsapp,
    platform: EPlatform.Whatsapp,
    url: "https://web.whatsapp.com/",
    support: true,
  },
  {
    id: EPlatform.Messenger,
    platform: EPlatform.Messenger,
    url: "https://www.messenger.com/login/",
    support: true,
  },
  {
    id: EPlatform.WhatsappBusinessAPI,
    platform: EPlatform.WhatsappBusinessAPI,
    url: "http://localhost:1421/",
    // url: "../dist/chat/index.html",
    support: false,
  },
  {
    id: EPlatform.Instagram,
    platform: EPlatform.Instagram,
    url: "https://www.instagram.com/direct/inbox/",
    support: false,
  },
  {
    id: EPlatform.Facebook,
    platform: EPlatform.Facebook,
    url: "https://www.facebook.com/messages",
    support: false,
  },
  {
    id: EPlatform.Linkedin,
    platform: EPlatform.Linkedin,
    url: "https://www.linkedin.com/messaging",
    support: true,
  },
  {
    id: EPlatform.Teams,
    platform: EPlatform.Teams,
    // url: "https://teams.live.com/v2",
    url: "https://teams.microsoft.com/v2/",
    support: false,
  },
  {
    id: EPlatform.Fingerprint,
    platform: EPlatform.Fingerprint,
    url: "",
    support: true,
  },

  // {
  //   id: EPlatform.Line,
  //   platform: EPlatform.Line,
  //   url: "https://linecn.org/web",
  //   support: false,
  // },
  // {
  //   id: EPlatform.Zalo,
  //   platform: EPlatform.Zalo,
  //   url: "https://chat.zalo.me/",
  //   support: false,
  // },
];

export interface IPlatformConfig {
  id: EPlatform;
  platform: EPlatform;
  url: string;
  support: boolean;
}

export interface IChatUserConfig {
  translate: ITranslateConfig;
}

export interface IWebviewLayoutOptions {
  top: number;
  left: number;
  right?: number;
  bottom?: number;
  // 设置right bottom后无效
  height?: number;
  width?: number;
}

export interface IWebviewOptions {
  id: string;
  url: string;
  platform: EPlatform;
  layout: IWebviewLayoutOptions;
  /**
   * 单击非活动 webview 是否也会单击进入 macOS 上的 webview。
   */
  active: boolean;
  visible: boolean;
  acceptFirstMouse?: boolean;
  proxyUrl?: string;
  userAgent?: string;
  dataStoreIdentifier?: string;
}

export const makeEmptyChatUserConfig = (): IChatUserConfig => {
  return {
    ...makeEmptyThirdAppUserInfo(),
    translate: makeEmptyTranslateConfig(),
  };
};

export interface IThirdAppUserInfo {
  id: string;
  nickname: string;
  avatar: string;
  isGroup: boolean;
  remarkName?: string;
  phone?: string;
}

export const makeEmptyThirdAppUserInfo = (): IThirdAppUserInfo => ({
  id: "",
  nickname: "",
  avatar: "",
  isGroup: false,
});
