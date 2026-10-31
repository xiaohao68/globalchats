import {
  defaultPlatformConfigList,
  IThirdAppConfig,
  IWebviewOptions,
  makeDefaultThirdAppLayout,
  resolveFingerprintUA,
} from "@gc/model";
import { makeProxyUrlByProxyConfig } from "@gc/utils";
import { userStore } from "./userStore.ts";

export const makeWebviewOptionsByAppConfig = (
  appConfig: IThirdAppConfig,
): IWebviewOptions => {
  const proxy = userStore.getValidThirdAppProxyConfigById(appConfig.id);
  const url =
    defaultPlatformConfigList.find((it) => appConfig.platform === it.platform)
      ?.url || appConfig.webviewOptions.url;
  const fingerprint = userStore.getValidThirdAppFingerprintConfigById(
    appConfig.id,
  );

  return {
    ...appConfig.webviewOptions,
    layout: makeDefaultThirdAppLayout(),
    userAgent:
      resolveFingerprintUA(fingerprint.ua) || appConfig.webviewOptions.userAgent,
    proxyUrl: makeProxyUrlByProxyConfig(proxy),
    url,
  };
};

