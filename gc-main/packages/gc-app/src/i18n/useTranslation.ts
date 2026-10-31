"use client";

import { useLocale } from "./LinguiProvider";

export function useTranslation() {
  const { messages, locale } = useLocale();

  const t = (id: string, values?: Record<string, unknown>): string => {
    let message = messages[id] || id;

    // 简单的插值替换
    if (values) {
      Object.entries(values).forEach(([key, value]) => {
        message = message.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      });
    }

    return message;
  };

  const raw = <T = unknown>(id: string): T => {
    const value = messages[id];
    if (!value) return [] as unknown as T;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  };

  return { t, raw, locale };
}
