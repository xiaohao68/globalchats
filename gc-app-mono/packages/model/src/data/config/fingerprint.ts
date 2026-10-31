// UA 预设：提供常见浏览器/平台的枚举和值映射
export enum EUserAgentPreset {
  Safari = "_Safari_",
  Chrome = "_Chrome_",
  Firefox = "_Firefox_",
}

export const UserAgentPresetMap: Record<EUserAgentPreset, string> = {
  [EUserAgentPreset.Safari]:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  [EUserAgentPreset.Chrome]:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  [EUserAgentPreset.Firefox]:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
};

export const getDefaultUserAgent = () => {
  const platform = navigator.platform;
  switch (true) {
    case platform.includes("Win"):
      return EUserAgentPreset.Chrome;
    case platform.includes("Mac"):
      return EUserAgentPreset.Safari;
    default:
      return EUserAgentPreset.Firefox;
  }
};

export const getUserAgentPresetOptions: () => {
  label: string;
  value: EUserAgentPreset;
}[] = () => {
  return [
    { label: "Safari", value: EUserAgentPreset.Safari },
    { label: "Chrome", value: EUserAgentPreset.Chrome },
    { label: "Firefox", value: EUserAgentPreset.Firefox },
  ];
};

export const matchUserAgentPresetKey = (
  ua: string,
): EUserAgentPreset | undefined => {
  const entry = Object.entries(EUserAgentPreset).find(
    ([, value]) => value === ua,
  );
  return (entry?.[1] as EUserAgentPreset) || undefined;
};

export const resolveFingerprintUA = (ua: string): string => {
  if (!ua) return UserAgentPresetMap[getDefaultUserAgent()];

  const presetKey = matchUserAgentPresetKey(ua);
  if (presetKey) {
    return UserAgentPresetMap[presetKey];
  }

  return ua;
};

export interface IFingerprintConfig {
  isIndependent: boolean;
  ua: string;
}

export const makeEmptyFingerprintConfig = (): IFingerprintConfig => {
  return {
    isIndependent: false,
    ua: getDefaultUserAgent(),
  };
};
