import {
  EPlatform,
  IChatUserConfig,
  IProxyConfig,
  IThirdAppUserInfo,
  IWebviewOptions,
  IFingerprintConfig,
} from "../config";

export interface IThirdAppConfig {
  id: string;
  platform: EPlatform;
  index: number;
  remark: string;

  proxy: IProxyConfig;
  fingerprint: IFingerprintConfig;
  webviewOptions: IWebviewOptions;

  userInfo?: IThirdAppUserInfo;
  chatUserConfigList: Record<string, IChatUserConfig>;
}
