"use client";

import { CombinedGraphQLErrors } from "@apollo/client";
import { apolloClient } from "@/modules/auth/utils/apollo-client";
import { LOGIN_MUTATION, ME_QUERY } from "@/modules/auth/graphql/operations/auth";
import type { AuthUser, LoginInput, LoginMutationData, MeQueryData } from "@/modules/auth/types/auth-graphql";
import { omitUndefined } from "@/modules/auth/utils/graphql/omit-undefined";

interface ApiError extends Error {
  code?: string;
}

interface CallLocation {
  file: string;
  line: number;
}

const SOURCE_FILE = "src/modules/auth/utils/auth-api.ts";
const SOURCE_FILE_PATTERN = /(src\/[^:\s)]+\.(?:ts|tsx|js|jsx)):(\d+):\d+/;
const STACK_FRAME_PATTERN = /at\s+(?:.*\s+)?\(?(.+?):(\d+):\d+\)?/;

function isInternalStackFrame(line: string) {
  return line.includes("node_modules") || line.includes("@apollo");
}

function parseApolloError(error: unknown): ApiError {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const message = first?.message ?? "Request failed";
    const parsedError = new Error(message) as ApiError;

    if (typeof first?.extensions?.code === "string") {
      parsedError.code = first.extensions.code;
    }

    return parsedError;
  }

  if (error instanceof Error) {
    return error as ApiError;
  }

  return new Error("Unknown request error") as ApiError;
}

// 从堆栈中提取调用位置信息
const parseCallLocation = (stack: string, fallbackFile: string): CallLocation | null => {
  // 跳过首行 "Error"
  const lines = stack.split("\n").slice(1);
  let fallbackLine: number | null = null;

  for (const line of lines) {
    if (isInternalStackFrame(line)) continue;

    // 优先匹配 source map 展开的真实源码路径（src/...）
    const sourceMatch = line.match(SOURCE_FILE_PATTERN);
    if (sourceMatch)
      return {
        file: sourceMatch[1],
        line: Number.parseInt(sourceMatch[2], 10)
      };

    // 回退：匹配常见 stack frame 并尝试提取 src 路径
    const frameMatch = line.match(STACK_FRAME_PATTERN);
    if (!frameMatch) continue;

    const filePath = frameMatch[1];
    const lineNum = Number.parseInt(frameMatch[2], 10);
    const srcMatch = filePath.match(/src\/(.+\.(?:ts|tsx|js|jsx))/);

    if (srcMatch) {
      return {
        file: `src/${srcMatch[1]}`,
        line: lineNum
      };
    }

    // Turbopack/Next 编译产物：记录行号，文件名使用源码兜底
    const isCompiledChunk =
      filePath.includes("_next/static/chunks") ||
      filePath.includes("webpack-internal:///") ||
      /src_[^/]+?\._\.js$/.test(filePath);

    if (isCompiledChunk && fallbackLine === null) fallbackLine = lineNum;
  }

  if (fallbackLine !== null) {
    return {
      file: fallbackFile,
      line: fallbackLine
    };
  }

  return null;
};

export async function loginWithPassword(input: LoginInput) {
  try {
    const variables = {
      input: omitUndefined({
        email: input.email,
        password: input.password,
        captchaToken: input.captchaToken
      })
    };

    // 获取调用位置用于日志
    const stack = new Error().stack;
    const callLocation = stack ? parseCallLocation(stack, SOURCE_FILE) : null;

    const { data } = await apolloClient.mutate<LoginMutationData>({
      mutation: LOGIN_MUTATION,
      variables,
      context: { callLocation }
    });

    if (!data?.login) {
      throw new Error("Login failed");
    }

    return data.login;
  } catch (error) {
    throw parseApolloError(error);
  }
}

export async function getMe(): Promise<AuthUser> {
  try {
    // 获取调用位置用于日志
    const stack = new Error().stack;
    const callLocation = stack ? parseCallLocation(stack, SOURCE_FILE) : null;

    const { data } = await apolloClient.query<MeQueryData>({
      query: ME_QUERY,
      fetchPolicy: "network-only",
      context: { callLocation }
    });

    if (!data?.me) {
      throw new Error("Unable to load current user");
    }

    return data.me;
  } catch (error) {
    throw parseApolloError(error);
  }
}
