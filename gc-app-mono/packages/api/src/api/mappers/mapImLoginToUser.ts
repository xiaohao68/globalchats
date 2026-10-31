import type { IUser } from "@gc/model";
import type { ImUserWithToken } from "../../gen/graphql.ts";

export const mapImLoginToUser = (imUserData: ImUserWithToken): IUser => {
  const imUser = imUserData.imUser;
  return {
    id: imUser.id,
    name: imUser.name || imUser.username,
    blocked: false,
    uin: imUser.id,
    accessToken: imUserData.accessToken,
  };
};
