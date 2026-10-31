export enum EProtocol {
  http = "http",
  // HTTPS="https",
  // socks = "socks",
  socks5 = "socks5",
}

export const protocolOptions = Object.values(EProtocol).map((it) => ({
  value: it,
  label: it,
}));

export interface IProxyConfig {
  isIndependent: boolean;
  enable: boolean;
  proxyId: string;
  protocol: EProtocol;
  host: string;
  port: string;
  username?: string;
  password?: string;
}

export const makeEmptyProxyConfig = (): IProxyConfig => {
  return {
    isIndependent: false,
    enable: false,
    proxyId: "",
    protocol: EProtocol.http,
    host: "",
    port: "",
  };
};
