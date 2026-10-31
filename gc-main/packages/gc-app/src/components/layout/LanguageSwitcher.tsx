"use client";

import { useLocale } from "@/i18n/LinguiProvider";
import { cn } from "@/lib/utils";

const languages = [
  { code: "zh" as const, shortLabel: "中" },
  { code: "en" as const, shortLabel: "EN" },
];

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 bg-gray-100 rounded-full",
        className
      )}
    >
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
            locale === lang.code
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
          aria-label={`Switch to ${lang.code === "zh" ? "中文" : "English"}`}
        >
          {lang.shortLabel}
        </button>
      ))}
    </div>
  );
}
