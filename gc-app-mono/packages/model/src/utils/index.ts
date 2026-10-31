import {
  defaultPlatformConfigList,
  EPlatform,
  IThirdAppConfig,
  IWebviewLayoutOptions,
  makeEmptyProxyConfig,
  makeEmptyFingerprintConfig,
} from "../data";
import { isEmpty, memoize } from "lodash-es";
import { v4 } from "uuid";

export const makeDefaultThirdAppLayout = (): IWebviewLayoutOptions => {
  return {
    left: 264,
    top: 47,
    right: 20,
    bottom: 15,
  };
};

export const makeRightSidebarLayout = (): IWebviewLayoutOptions => {
  return {
    left: 763 - 5 + 264 + 3,
    top: 47,
    bottom: 15,
    right: 73 + 1,
    width: 341,
  };
};

const getPlatformConfig = memoize((platform: EPlatform) => {
  return defaultPlatformConfigList.find((it) => it.platform === platform)!;
});
export const makeDefaultThirdAppConfig = (
  platform: EPlatform,
): IThirdAppConfig => {
  const appId = v4();
  const platformInfo = getPlatformConfig(platform);
  const fingerprint = makeEmptyFingerprintConfig();
  return {
    id: appId,
    platform: platform,
    index: 0,
    remark: "",
    proxy: makeEmptyProxyConfig(),
    fingerprint: fingerprint,
    webviewOptions: {
      id: appId,
      platform: platform,
      active: true,
      visible: false,
      url: platformInfo.url,
      layout: makeDefaultThirdAppLayout(),
      // proxyUrl: "http://127.0.0.1:1086",
      userAgent: fingerprint.ua,
      dataStoreIdentifier: appId,
    },
    chatUserConfigList: {},
  };
};
export const serializeThirdAppConfig = (
  platform: EPlatform,
  appConfig?: Partial<IThirdAppConfig>,
): IThirdAppConfig => {
  const tempThirdAppConfig = makeDefaultThirdAppConfig(platform);

  if (isEmpty(appConfig)) {
    return tempThirdAppConfig;
  }

  if (!isEmpty(appConfig.id)) {
    tempThirdAppConfig.id = appConfig.id!;
    tempThirdAppConfig.webviewOptions.id = appConfig.id!;
    tempThirdAppConfig.webviewOptions.dataStoreIdentifier = appConfig.id;
  }
  if (!isEmpty(appConfig.index)) {
    tempThirdAppConfig.index = appConfig.index!;
  }
  if (!isEmpty(appConfig.remark)) {
    tempThirdAppConfig.remark = appConfig.remark!;
  }
  if (!isEmpty(appConfig.proxy)) {
    tempThirdAppConfig.proxy = appConfig.proxy;
  }
  if (!isEmpty(appConfig.webviewOptions)) {
    tempThirdAppConfig.webviewOptions = {
      ...appConfig.webviewOptions,
      layout: tempThirdAppConfig.webviewOptions.layout,
    };
  }
  if (!isEmpty(appConfig.chatUserConfigList)) {
    tempThirdAppConfig.chatUserConfigList = appConfig.chatUserConfigList;
  }

  return tempThirdAppConfig;
};
