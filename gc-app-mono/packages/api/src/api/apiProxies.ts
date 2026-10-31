import { gqlClient } from "../apiClient.ts";
import { Proxies } from "../gql/index.ts";
import { EProtocol } from "@gc/model";

export interface IProxy {
  id: string;
  name: string;
  protocol: EProtocol;
  host: string;
  port: string;
}

interface ProxiesResponse {
  proxies: IProxy[];
}

export const apiProxies = async (): Promise<IProxy[]> => {
  const { data } = await gqlClient<ProxiesResponse>(
    { query: Proxies },
    {},
    { authMode: "require" },
  );
  return data.data.proxies;
};
