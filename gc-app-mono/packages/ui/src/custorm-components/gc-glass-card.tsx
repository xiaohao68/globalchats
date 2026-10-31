import { cn } from "@gc/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const glassCardVariants = cva(
  // 基础样式
  "relative overflow-hidden transition-all duration-300",
  {
    variants: {
      variant: {
        default: "gc-glass",
        hover: "gc-glass gc-glass-hover cursor-pointer",
        inset: [
          "bg-white/5",
          "border border-white/5",
          "shadow-inner",
        ],
      },
      size: {
        sm: "p-4 rounded-xl",
        md: "p-6 rounded-2xl",
        lg: "p-8 rounded-3xl",
        xl: "p-12 rounded-[28px]",
      },
      blur: {
        sm: "backdrop-blur-sm",
        md: "backdrop-blur-xl",
        lg: "backdrop-blur-2xl",
        xl: "backdrop-blur-3xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      blur: "xl",
    },
  },
);

export interface GcGlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean;
}

export function GcGlassCard({
  className,
  variant,
  size,
  blur,
  children,
  ...props
}: GcGlassCardProps) {
  return (
    <div
      className={cn(glassCardVariants({ variant, size, blur }), className)}
      {...props}
    >
      {/* 顶部高光 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
