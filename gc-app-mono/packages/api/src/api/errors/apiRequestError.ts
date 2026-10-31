import { EApiCode } from "@gc/model";

export type ApiErrorCode = EApiCode | string;
export type ApiErrorSource = "http" | "graphql" | "client" | "network";

export type ApiErrorContext = {
  opName?: string;
  url?: string;
  status?: number;
  method?: string;
};

export class ApiRequestError extends Error {
  readonly source: ApiErrorSource;
  readonly code?: ApiErrorCode;
  readonly opName?: string;
  readonly context?: ApiErrorContext;
  override readonly cause?: unknown;

  constructor(
    message: string,
    input: {
      source: ApiErrorSource;
      code?: ApiErrorCode;
      opName?: string;
      context?: ApiErrorContext;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.source = input.source;
    this.code = input.code;
    this.opName = input.opName;
    this.context = input.context;
    this.cause = input.cause;
  }
}

export const isApiRequestError = (error: unknown): error is ApiRequestError =>
  error instanceof ApiRequestError;
