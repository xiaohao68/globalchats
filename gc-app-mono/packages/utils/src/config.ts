import {
  EProtocol,
  IProxyConfig,
  ITranslateConfig,
} from "@gc/model";
import { MaybeUndefined, Nullable } from "./types.ts";
import { isEmpty, isEqual } from "lodash-es";

export const shouldUpdateMessage = (
  oldTranslateConfig: Nullable<ITranslateConfig>,
  newTranslateConfig: Nullable<ITranslateConfig>,
): {
  shouldUpdateReceiveMessage: boolean;
  shouldUpdateSendMessage: boolean;
} => {
  if (!isEqual(oldTranslateConfig?.modelId, newTranslateConfig?.modelId)) {
    return { shouldUpdateSendMessage: true, shouldUpdateReceiveMessage: true };
  }

  return {
    shouldUpdateReceiveMessage: !isEqual(
      oldTranslateConfig?.receiveMessage,
      newTranslateConfig?.receiveMessage,
    ),
    shouldUpdateSendMessage: !isEqual(
      oldTranslateConfig?.sendMessage,
      newTranslateConfig?.sendMessage,
    ),
  };
};
export const makeProxyUrlByProxyConfig = (
  proxy: IProxyConfig,
): MaybeUndefined<string> => {
  if (!validProxy(proxy) || !proxy.enable) {
    return;
  }

  // if(isEmpty(proxy.username)|| isEmpty(proxy.password)){
  //   return `${proxy.protocol}://${proxy.host}:${proxy.port}`
  // }
  return `${proxy.protocol}://${proxy.host}:${proxy.port}`;
};
export const validProxy = (proxy: IProxyConfig) => {
  if (isEmpty(proxy)) {
    return false;
  }
  const { protocol, host, port } = proxy;
  if (isEmpty(protocol) || isEmpty(host) || isEmpty(port)) {
    return false;
  }

  return Object.values(EProtocol).includes(protocol);
};
