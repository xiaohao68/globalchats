export const locales = ["zh", "en"] as const;
export const defaultLocale = "zh" as const;
export type Locale = (typeof locales)[number];

export type Messages = Record<string, string>;

let currentMessages: Messages = {};
let currentLocale: Locale = defaultLocale;

export async function loadCatalog(locale: Locale): Promise<Messages> {
  const catalogModule = await import(`@/locales/${locale}/messages`);
  currentMessages = catalogModule.messages;
  currentLocale = locale;
  return currentMessages;
}

export function getMessages(): Messages {
  return currentMessages;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function translate(id: string, values?: Record<string, unknown>): string {
  let message = currentMessages[id] || id;

  // 简单的插值替换
  if (values) {
    Object.entries(values).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
  }

  return message;
}
