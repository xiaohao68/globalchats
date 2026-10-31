import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from "axios";

export interface ICreateRequestOptions<T> {
  config: CreateAxiosDefaults;
  requestInterceptor?: (
    config: InternalAxiosRequestConfig,
  ) => InternalAxiosRequestConfig;
  responseInterceptor?: (response: AxiosResponse) => AxiosResponse;
  serialize?: <D, E>(response: AxiosResponse<T>) => [D | null, E | null];
}

export interface IResponse {
  /**
   * 状态码
   *
   * @examples 0
   */
  code?: number;
  /**
   * 提示消息
   *
   * @examples 操作成功
   */
  msg?: string;
  /**
   * 数据集
   */
  data?: unknown;
  error?: unknown;
  /**
   * 服务器时间戳
   *
   * @examples 1640966400
   */
  timestamp?: number;
  /**
   * 链路ID
   *
   * @examples d0bb93048bc5c9164cdee845dcb7f820
   */
  traceID?: string;
}

export enum STATUS_CODE {
  /** 成功 */
  SUCCESS = 10000,
  /** 错误 */
  ERROR = 99999,
  /** 登录过期 */
  LOGIN_EXPIRED = 9000,
}

export let request: ReturnType<typeof createRequest<IResponse, Error>>;

export const createRequest = <T, E>({
  config,
  requestInterceptor,
  responseInterceptor,
  serialize,
}: ICreateRequestOptions<T>) => {
  const instance = axios.create(config);
  instance.interceptors.request.use((config) => {
    if (requestInterceptor) return requestInterceptor(config);
    return config;
  });
  instance.interceptors.response.use((response) => {
    if (responseInterceptor) return responseInterceptor(response);
    return response;
  });

  return {
    async get<D>(url: string, config?: AxiosRequestConfig<D>) {
      const res = await instance.get<T>(url, config);
      return serialize<D, E>(res);
    },
    async post<D>(url: string, data?: unknown, config?: AxiosRequestConfig<D>) {
      const res = await instance.post<T>(url, data, config);
      return serialize<D, E>(res);
    },
  };
};

export const setRequest = (
  value: ReturnType<typeof createRequest<IResponse, Error>>,
) => {
  request = value;
};
