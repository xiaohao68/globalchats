import semver from "semver";

export const isDev = import.meta.env.MODE === "development";
export const MainWebviewId = "main";
export const SideWebviewId = "secondary";
export const AGGREGATED_CHAT_APP_ID = "aggregated-chat";
export const AGGREGATED_CHAT_URL_DEV = "http://localhost:1421/";
export const PlatformLoadingDuration = 200;
// export const MaxTranslateTextLength = 2500;
export const MaxTranslateTextLength = 2500;
export const appVersion = import.meta.env.VITE_VERSION;
export const appVersionNumber = parseFloat(
  semver.major(appVersion) + "." + semver.minor(appVersion),
);
export enum ESignType {
  email = "email",
}

export enum EApiCode {
  success = "ok",
  authBadUin = "auth_bad_uin", // 重新登录
  // Failed = -1,
}

export enum EAppMode {
  MultiProxy = "multi-proxy",
  AggregatedChat = "aggregated-chat",
}

export enum ERightSidebarPanel {
  CRM = "crm",
  Translate = "translate",
}
