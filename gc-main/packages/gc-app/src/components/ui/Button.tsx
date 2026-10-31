import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", glow = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // 基础样式
          "inline-flex items-center justify-center font-medium transition-all duration-300 rounded-full",
          "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",

          // 尺寸
          {
            "px-4 py-2 text-sm": size === "sm",
            "px-6 py-2.5 text-base": size === "md",
            "px-8 py-3 text-lg": size === "lg",
          },

          // 变体
          {
            // Primary
            "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700":
              variant === "primary",

            // Secondary
            "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300":
              variant === "secondary",

            // Ghost
            "bg-transparent text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300":
              variant === "ghost",

            // Gradient
            "relative overflow-hidden bg-gradient-to-r from-primary-500 via-primary-600 to-accent-purple text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.02]":
              variant === "gradient",
          },

          // 发光效果
          glow && "shadow-[var(--shadow-glow-sm)] hover:shadow-[var(--shadow-glow-md)]",

          className
        )}
        {...props}
      >
        {/* 渐变按钮的光泽效果 */}
        {variant === "gradient" && (
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
