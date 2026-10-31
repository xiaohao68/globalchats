import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  blur?: "sm" | "md" | "lg" | "xl";
  opacity?: number;
  border?: boolean;
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  blur = "lg",
  opacity = 70,
  border = true,
  glow = false,
  ...props
}: GlassCardProps) {
  const blurMap = {
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
  };

  return (
    <div
      className={cn(
        "rounded-2xl",
        blurMap[blur],
        border && "border border-white/20",
        glow && "shadow-[var(--shadow-glow-sm)]",
        className
      )}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,${opacity / 100}) 0%, rgba(255,255,255,${Math.max(0, opacity / 100 - 0.1)}) 100%)`,
        boxShadow: glow
          ? "0 8px 32px rgba(59, 130, 246, 0.15), inset 0 1px 1px rgba(255,255,255,0.5)"
          : "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255,255,255,0.5)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
