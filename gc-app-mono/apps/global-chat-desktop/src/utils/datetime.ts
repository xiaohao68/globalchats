/**
 * 后端时间的统一解析工具
 * ============================================================
 *
 * ⚠️ 为什么需要这个文件：
 *
 * Rust/sqlx 返回的时间是 **UTC 的 naive 时间串**，形如 `2026-10-15T10:01:38.245`，
 * **不带任何时区标记**（库里所有时间列都是 `TIMESTAMP`，不带时区）。
 *
 * 而 ECMAScript 规范规定：`new Date("2026-10-15T10:01:38.245")` 这种
 * **不带偏移量的日期时间形式，按「本地时区」解释**。
 *
 * 于是在东八区就会出现：库里存的 UTC 10:01（真实本地时间 18:01）
 * 被显示成「10:01」—— **整体少 8 小时**。实测踩过：
 * Facebook 那条消息 Meta 明写「发送于 18:01」，界面上却显示 10:01。
 *
 * ⇒ 凡是解析**后端返回的时间**，一律走这里，不要直接 `new Date(iso)`。
 */

/**
 * 把后端返回的时间串解析成 `Date`（正确转成本地时区）。
 *
 * 已经带时区标记的（`Z` 或 `+08:00`）原样交给 `Date`，只给裸串补一个 `Z`。
 * 解析失败返回 `null`，调用方自行兜底。
 */
export const parseServerTime = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  const date = new Date(hasZone ? trimmed : `${trimmed}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** 只要毫秒时间戳；解析不出来返回 0（用于排序，0 会沉到最后） */
export const serverTimeMs = (value: string | null | undefined): number =>
  parseServerTime(value)?.getTime() ?? 0;
