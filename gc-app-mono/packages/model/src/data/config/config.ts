import { IProxyConfig, makeEmptyProxyConfig } from "./proxy";
import { ITranslateConfig, makeEmptyTranslateConfig } from "../translate";
import { IUser } from "../operation";
import { IThirdAppConfig } from "../store";

import { isSupportLanguage } from "../../const/i18n.ts";
import {
  IFingerprintConfig,
  makeEmptyFingerprintConfig,
} from "./fingerprint.ts";

export enum ETheme {
  light = "light",
  dark = "dark",
  system = "system",
}

export interface IUserConfig {
  userInfo: IUser;
  globalSetting: IGlobalSetting;
  thirdAppConfigList: Record<string, IThirdAppConfig>;
}

export interface IGlobalSetting {
  i18n: string;
  theme: ETheme;
  proxy: IProxyConfig;
  translate: ITranslateConfig;
  fingerprint: IFingerprintConfig;
  signState: {
    keepSign: boolean;
    email: string;
    password: string;
  };
}

export const makeEmptyGlobalSetting = (): IGlobalSetting => {
  return {
    i18n: isSupportLanguage(navigator.language) ? navigator.language : "zh_CN",
    theme: ETheme.system,
    proxy: makeEmptyProxyConfig(),
    fingerprint: makeEmptyFingerprintConfig(),
    signState: {
      keepSign: true,
      email: "",
      password: "",
    },
    translate: makeEmptyTranslateConfig(),
  };
};

export const makeEmptyUserConfig = (): IUserConfig => {
  return {
    userInfo: {
      id: "",
      uin: "",
      name: "",
      blocked: false,
    },
    globalSetting: makeEmptyGlobalSetting(),
    thirdAppConfigList: {},
  };
};
