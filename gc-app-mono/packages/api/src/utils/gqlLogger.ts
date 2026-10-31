/**
 * GraphQL 请求日志打印工具
 * 借鉴 gc-saas-web 的 loggerLink 实现
 */

// 获取错误颜色
const getErrorColor = () => "#ff4d4f";

// 获取标签样式
const getLabelStyle = () =>
  "background: #1890ff; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;";

// 获取标题样式
const getTitleStyle = (hasError: boolean, operationType: string) => {
  const baseStyle =
    "padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 13px;";
  if (hasError) {
    return `${baseStyle} background: ${getErrorColor()}; color: white;`;
  }
  const colorMap: Record<string, string> = {
    query: "#52c41a",
    mutation: "#fa8c16",
    subscription: "#722ed1",
  };
  const color = colorMap[operationType] || "#1890ff";
  return `${baseStyle} background: ${color}; color: white;`;
};

// 格式化标题
const formatTitle = (
  operationType: string,
  operationName: string,
  time?: number,
): [string, string] => {
  const emojiMap: Record<string, string> = {
    query: "🔍",
    mutation: "✏️",
    subscription: "📡",
  };
  const emoji = emojiMap[operationType] || "📦";
  const timeStr = time !== undefined ? ` (${time}ms)` : "";
  const title = `${emoji} ${operationType.toUpperCase()} ${operationName}${timeStr}`;
  return [title, getTitleStyle(false, operationType)];
};

// 输出带标签的日志
const logWithLabel = (label: string, value: unknown) => {
  console.log(`%c${label}`, getLabelStyle(), value);
};

// 判断值是否已定义
const isDefined = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

// 提取 GraphQL 操作名称和类型
export const extractGqlInfo = (
  query: string,
): { operationType: string; operationName: string } => {
  const match = query.match(/\b(query|mutation|subscription)\s+([A-Za-z0-9_]+)/);
  return {
    operationType: match?.[1] ?? "unknown",
    operationName: match?.[2] ?? "Generic",
  };
};

// 打印 GraphQL 请求日志
export const logGqlRequest = ({
  operationType,
  operationName,
  variables,
  query,
  headers,
}: {
  operationType: string;
  operationName: string;
  variables?: Record<string, unknown>;
  query?: string;
  headers?: Record<string, unknown>;
}) => {
  const titleArgs = formatTitle(operationType, operationName);
  console.groupCollapsed(titleArgs[0], titleArgs[1]);

  if (headers && Object.keys(headers).length > 0) {
    logWithLabel("HEADERS", headers);
  }

  if (variables && Object.keys(variables).length > 0) {
    logWithLabel("VARIABLES", variables);
  }

  if (query) {
    logWithLabel("QUERY", [query.trim()]);
  }

  console.groupEnd();
};

// 打印 GraphQL 响应日志
export const logGqlResponse = ({
  operationType,
  operationName,
  time,
  data,
  errors,
  variables,
  query,
  headers,
}: {
  operationType: string;
  operationName: string;
  time: number;
  data?: unknown;
  errors?: unknown[];
  variables?: Record<string, unknown>;
  query?: string;
  headers?: Record<string, unknown>;
}) => {
  const hasError = isDefined(errors) && errors.length > 0;
  const titleArgs = formatTitle(operationType, operationName, time);

  // 有错误时展开显示，无错误时折叠
  const groupFn = hasError ? console.group : console.groupCollapsed;
  groupFn(titleArgs[0], getTitleStyle(hasError, operationType));

  // 有错误时，先显示错误摘要
  if (hasError) {
    errors?.forEach((err: any) => {
      console.log(
        `%c✗ ${err.message || err}`,
        `color: ${getErrorColor()}; font-weight: bold`,
      );
    });
  }

  if (headers && Object.keys(headers).length > 0) {
    logWithLabel("HEADERS", headers);
  }

  if (variables && Object.keys(variables).length > 0) {
    logWithLabel("VARIABLES", variables);
  }

  if (query) {
    logWithLabel("QUERY", [query.trim()]);
  }

  if (isDefined(data)) {
    logWithLabel("DATA", data);
  }

  if (hasError) {
    logWithLabel("ERRORS", errors);
  }

  // COPY 段：汇总所有信息，方便快速复制
  const copyPayload: Record<string, unknown> = {
    operation: `${operationType} ${operationName} (in ${time}ms)`,
  };
  if (headers && Object.keys(headers).length > 0) {
    copyPayload.HEADERS = headers;
  }
  if (variables && Object.keys(variables).length > 0) {
    copyPayload.VARIABLES = variables;
  }
  if (query) {
    copyPayload.QUERY = query.trim();
  }
  if (isDefined(data)) {
    copyPayload.DATA = data;
  }
  if (hasError) {
    copyPayload.ERRORS = errors;
  }
  logWithLabel("📋 COPY", copyPayload);

  console.groupEnd();
};

// 打印 GraphQL 错误日志
export const logGqlError = ({
  operationType,
  operationName,
  error,
}: {
  operationType: string;
  operationName: string;
  error: unknown;
}) => {
  const titleArgs = formatTitle(operationType, operationName);
  console.group(titleArgs[0], getTitleStyle(true, operationType));
  console.log("%c✗ Request Failed", `color: ${getErrorColor()}; font-weight: bold`);
  console.error(error);
  console.groupEnd();
};
