import axios, { AxiosHeaders, AxiosRequestConfig } from "axios";
import { isRunningInTauri, isMainWebview } from "@gc/utils";
import { EApiCode } from "@gc/model";
import { axiosTauriApiAdapter } from "@gc/adapter";
import { print } from "graphql";
import {
  AUTH_MODE_HEADER,
  getRequestAuthMode,
  shouldAttachUinHeader,
} from "./api/auth/requestAuthMode.ts";
import { ApiRequestError } from "./api/errors/apiRequestError.ts";
import {
  extractGqlInfo,
  logGqlRequest,
  logGqlResponse,
  logGqlError,
} from "./utils/gqlLogger.ts";

export type ApiBaseResponse<D> = {
  code?: EApiCode;
  message?: string;
  data: D;
};

export type ApiRuntimeGetters = {
  getUin?: () => string | undefined;
  getLang?: () => string | undefined;
  getAccessToken?: () => string | undefined;
  onAuthError?: () => void;
};

let runtimeGetters: ApiRuntimeGetters = {};

export const apiClient = axios.create({
  // baseURL: import.meta.env.VITE_API_URL,
  baseURL: "/", // 使用相对路径，让 Vite 代理生效
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

type GqlRequestBody = {
  query: any;
  variables?: Record<string, any>;
};

type GqlBaseResponse<D> = {
  data: D;
  error?: {
    code: EApiCode;
    message: string;
  };
  errors?: {
    message: string;
    extensions?: { code?: string };
  }[];
};

const extractGqlOperationName = (query: unknown): string | undefined => {
  if (typeof query !== "string") return undefined;
  const m = query.match(/\b(query|mutation)\s+([A-Za-z0-9_]+)\b/);
  return m?.[2] ?? undefined;
};

export const gqlClient = <R>(
  data: GqlRequestBody,
  config: AxiosRequestConfig = {},
  options: { authMode: "skip" | "require" },
) => {
  data.query = print(data.query);
  // console.log(data.query)
  const headers = AxiosHeaders.from((config.headers ?? {}) as any);
  const { operationType, operationName } = extractGqlInfo(data.query);
  headers.set(AUTH_MODE_HEADER, options.authMode);

  const opName = extractGqlOperationName(data.query);
  const requestConfig: AxiosRequestConfig = {
    ...config,
    headers,
  };
  (requestConfig as any).gcMeta = { opName, operationType, operationName };

  // 打印 GraphQL 请求日志
  logGqlRequest({
    operationType,
    operationName,
    variables: data.variables,
    query: data.query,
    headers: config.headers as Record<string, unknown>,
  });

  return apiClient.post<GqlBaseResponse<R>>("/graphql", data, requestConfig);
};

apiClient.interceptors.request.use((config) => {
  config.headers = AxiosHeaders.from((config.headers ?? {}) as any);

  const opName =
    (config as any).gcMeta?.opName ??
    extractGqlOperationName(config.data?.query);
  const uin = runtimeGetters.getUin?.();
  const lang = runtimeGetters.getLang?.();
  if (lang) {
    config.headers.set("Accept-Language", lang);
  }

  const isGraphqlRequest =
    config.url?.includes("/graphql") || typeof config.data?.query === "string";

  const authMode = getRequestAuthMode({ headers: config.headers });
  if (isGraphqlRequest && !authMode) {
    return Promise.reject(
      new ApiRequestError(
        `Missing ${AUTH_MODE_HEADER} header for GraphQL request; call gqlClient(..., { authMode: "require" | "skip" })`,
        {
          source: "client",
          code: "missing_auth_mode",
          opName,
          context: {
            opName,
            url: config.url,
            method: config.method,
          },
        },
      ),
    );
  }

  // 非登录请求需要 uin，如果为空则拒绝请求
  const effectiveAuthMode = authMode ?? "require";
  if (shouldAttachUinHeader(effectiveAuthMode) && !uin) {
    return Promise.reject(
      new ApiRequestError("uin is empty, skip request", {
        source: "client",
        code: EApiCode.authBadUin,
        opName,
        context: {
          opName,
          url: config.url,
          method: config.method,
        },
      }),
    );
  }

  if (shouldAttachUinHeader(effectiveAuthMode)) {
    config.headers.set("x-uin", uin);
  }

  const accessToken = runtimeGetters.getAccessToken?.();
  if (shouldAttachUinHeader(effectiveAuthMode) && accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // 记录请求开始时间
  (config as any).startTime = Date.now();

  return config;
});
apiClient.interceptors.response.use(
  (response) => {
    const data: ApiBaseResponse<any> & GqlBaseResponse<any> = response.data;
    const gcMeta = (response.config as any).gcMeta;
    const opName = gcMeta?.opName;

    // 打印 GraphQL 响应日志（如果是 GraphQL 请求）
    if (gcMeta?.operationType && gcMeta?.operationName) {
      const start = (response.config as any).startTime ?? Date.now();
      const time = Date.now() - start;
      logGqlResponse({
        operationType: gcMeta.operationType,
        operationName: gcMeta.operationName,
        time,
        data: data.data,
        errors: data.error ? [data.error] : undefined,
        query: response.config.data?.query,
        headers: response.config.headers as Record<string, unknown>,
      });
    }

    if (data.code && data.code !== EApiCode.success) {
      if (data.code === EApiCode.authBadUin) {
        console.error("API auth error: authBadUin, calling onAuthError");
        runtimeGetters.onAuthError?.();
      }
      throw new ApiRequestError(data.message ?? "API request failed", {
        source: "http",
        code: data.code,
        opName,
        context: {
          opName,
          url: response.config.url,
          method: response.config.method,
          status: response.status,
        },
      });
    }
    if (data.error) {
      if (data.error.code === EApiCode.authBadUin) {
        console.error("API auth error: authBadUin, calling onAuthError");
        runtimeGetters.onAuthError?.();
      }
      throw new ApiRequestError(
        data.error.message ?? "GraphQL request failed",
        {
          source: "graphql",
          code: data.error.code,
          opName,
          context: {
            opName,
            url: response.config.url,
            method: response.config.method,
            status: response.status,
          },
        },
      );
    }
    if (data.errors && data.errors.length > 0) {
      const firstError = data.errors[0]!;
      const code = firstError.extensions?.code;
      if (code === "UNAUTHENTICATED" || code === "FORBIDDEN") {
        console.error("API auth error from GraphQL errors:", firstError.message);
        runtimeGetters.onAuthError?.();
      }
      throw new ApiRequestError(
        firstError.message ?? "GraphQL request failed",
        {
          source: "graphql",
          code: code ?? "graphql_error",
          opName,
          context: {
            opName,
            url: response.config.url,
            method: response.config.method,
            status: response.status,
            errors: data.errors.map((e) => e.message),
          },
        },
      );
    }
    // TODO: 登录失效
    return response;
  },
  (error) => {
    console.error("api response error");
    console.error(error);

    // 打印 GraphQL 错误日志（如果是 GraphQL 请求）
    const gcMeta = (error.config as any)?.gcMeta;
    if (gcMeta?.operationType && gcMeta?.operationName) {
      logGqlError({
        operationType: gcMeta.operationType,
        operationName: gcMeta.operationName,
        error,
      });
    }

    if (error instanceof ApiRequestError) {
      if (error.code === EApiCode.authBadUin) {
        console.error("API auth error (request): authBadUin, calling onAuthError");
        runtimeGetters.onAuthError?.();
      }
      throw error;
    }
    if (axios.isAxiosError(error)) {
      const opName = (error.config as any)?.gcMeta?.opName;
      const status = error.response?.status;
      const url = error.config?.url;
      const method = error.config?.method;
      const message =
        (error.response?.data as any)?.message ??
        error.message ??
        "Network request failed";
      throw new ApiRequestError(message, {
        source: "network",
        code:
          (error.response?.data as any)?.code ?? error.code ?? "network_error",
        opName,
        context: { opName, url, method, status },
        cause: error,
      });
    }
    throw new ApiRequestError("Unknown request error", {
      source: "network",
      code: "unknown_error",
      cause: error,
    });
  },
);

export const initApiClient = (getters?: ApiRuntimeGetters) => {
  if (getters) {
    runtimeGetters = getters;
  }
  // 主 webview 直接使用 fetch（Vite proxy 生效），其他 webview 使用 Tauri adapter + 绝对 URL
  const useTauriAdapter = isRunningInTauri() && !isMainWebview();
  apiClient.defaults.adapter = useTauriAdapter
    ? axiosTauriApiAdapter
    : "fetch";
  if (useTauriAdapter) {
    apiClient.defaults.baseURL = import.meta.env.VITE_API_URL || "/";
  }
};
