import type { IThirdAppUserInfo } from "@gc/model";
import type { WAContact, WAWid } from "../types";

/**
 * 轮询执行函数，直到条件满足或超时
 * @param fn 要执行的函数，返回 truthy 值表示成功
 * @param timeout 超时时间 (毫秒)，默认 30 秒
 * @param interval 轮询间隔 (毫秒)，默认 100ms
 * @returns Promise 返回函数结果
 */
export async function pollExcFn<T>(
  fn: () => T | undefined | null,
  timeout = 30_000,
  interval = 100,
): Promise<T> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const result = fn();
      if (result) {
        resolve(result);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(`pollExcFn timeout after ${timeout}ms`));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * 判断是否为群组 ID
 * @param userId 用户/群组 ID
 * @returns true 如果 ID 以 "@g.us" 结尾
 */
export function isGroupId(userId: string): boolean {
  return userId.endsWith("@g.us");
}

/**
 * 判断是否为个人 ID
 * @param userId 用户/群组 ID
 * @returns true 如果 ID 以 "@c.us" 结尾
 */
export function isIndividualId(userId: string): boolean {
  return userId.endsWith("@c.us");
}

/**
 * 从 WAWid 获取序列化 ID
 */
export function getSerializedId(wid: WAWid): string {
  return wid._serialized;
}

/**
 * 将 WAContact 转换为 IThirdAppUserInfo
 */
export function toThirdAppUserInfo(contact: WAContact): IThirdAppUserInfo {
  return {
    id: contact.id._serialized,
    nickname: contact.name || contact.shortName || "",
    avatar: contact.avatar || "",
    isGroup: contact.isGroup,
    phone: contact.phone,
  };
}

/**
 * 从 WAWid 获取手机号
 */
export function getPhoneFromWid(wid: WAWid): string | undefined {
  if (isIndividualId(wid._serialized)) {
    return wid.user;
  }
  return undefined;
}
