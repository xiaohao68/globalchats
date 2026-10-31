import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "gradient";
}

export function Badge({
  children,
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        {
          "bg-primary-50 text-primary-700": variant === "default",
          "border border-gray-200 text-gray-600 bg-white": variant === "outline",
          "bg-gradient-to-r from-primary-500 to-accent-purple text-white shadow-[var(--shadow-glow-sm)]":
            variant === "gradient",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
