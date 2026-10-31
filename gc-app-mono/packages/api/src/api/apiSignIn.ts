import { gqlClient } from "../apiClient.ts";
import type { IUser } from "@gc/model";
import type { Mutation, ImMutationLoginArgs, ImUserWithToken } from "../gen/graphql.ts";
import { ImLogin } from "../gql/index.ts";
import { mapImLoginToUser } from "./mappers/mapImLoginToUser.ts";
import { apiLogin } from "./apiLogin.ts";

interface RequestData {
  email: string;
  password: string;
}

export interface IImLoginResult {
  users: ImUserWithToken[];
}

/**
 * 登录并返回所有关联账号
 * 当返回多个账号时，需要用户选择后再调用 completeSignIn 完成登录
 */
export const apiImLogin = async (data: RequestData): Promise<IImLoginResult> => {
  const res = await gqlClient<Mutation>(
    {
      query: ImLogin,
      variables: {
        input: {
          email: data.email,
          password: data.password,
          captchaToken: null,
        },
      } as ImMutationLoginArgs,
    },
    {},
    { authMode: "skip" },
  );

  const imUsers = res.data.data.im?.login?.imUsers;
  if (!imUsers || imUsers.length === 0) {
    throw new Error("User not found");
  }

  const generalToken = await apiLogin({ email: data.email, password: data.password });
  const usersWithGeneralToken = imUsers.map((u) => ({
    ...u,
    accessToken: generalToken,
  }));

  return { users: usersWithGeneralToken };
};

/**
 * 根据选择的账号完成登录
 */
export const completeSignIn = (imUserData: ImUserWithToken): IUser => {
  return mapImLoginToUser(imUserData);
};

/**
 * @deprecated 使用 apiImLogin + completeSignIn 替代，以支持多账号选择
 */
export const apiSignIn = async (data: RequestData): Promise<IUser> => {
  const result = await apiImLogin(data);
  // 如果只有一个账号，直接登录；多个账号时取第一个（向后兼容）
  return completeSignIn(result.users[0]!);
};
