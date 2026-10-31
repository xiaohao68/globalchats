"use client";

import { cn } from "@gc/ui/lib/utils";
import { useState } from "react";

export interface GcGlassInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function GcGlassInput({
  className,
  label,
  error,
  icon,
  disabled,
  ...props
}: GcGlassInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-[var(--gc-text-secondary)]">
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative flex items-center transition-all duration-300",
          "gc-glass-input h-14 px-4",
          isFocused && "ring-2 ring-[var(--gc-brand)]/20",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        {icon && (
          <span className="mr-3 text-[var(--gc-text-tertiary)]">{icon}</span>
        )}
        <input
          className="flex-1 bg-transparent text-[var(--gc-text-primary)] placeholder:text-[var(--gc-text-tertiary)] focus:outline-none"
          disabled={disabled}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {/* 聚焦光晕效果 */}
        {isFocused && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[var(--gc-radius-md)] animate-pulse"
            style={{
              boxShadow: "0 0 20px rgba(0, 122, 255, 0.15)",
            }}
          />
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
