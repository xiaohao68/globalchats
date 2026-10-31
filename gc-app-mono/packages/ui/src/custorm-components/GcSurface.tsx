import type { ComponentPropsWithoutRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@gc/ui/lib/utils";

const surfaceVariants = cva(
  [
    "relative",
    "rounded-xl",
    "border",
    "text-foreground",
    "transition-[background-color,border-color,box-shadow,transform]",
  ],
  {
    variants: {
      variant: {
        plain: "border-transparent bg-transparent shadow-none",
        card: "border-border/70 bg-card shadow-sm",
        inset: "border-border/60 bg-muted/40 shadow-none",
        glass: [
          "border-border/50 bg-background/70 shadow-sm",
          "backdrop-blur-xl",
          "supports-[backdrop-filter]:bg-background/60",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:bg-[radial-gradient(120%_80%_at_10%_0%,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.10)_35%,rgba(255,255,255,0)_70%)]",
          "dark:before:bg-[radial-gradient(120%_80%_at_10%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.06)_35%,rgba(255,255,255,0)_70%)]",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit]",
          "after:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0)_18%)]",
          "dark:after:bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0)_18%)]",
        ],
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "card",
      padding: "none",
    },
  },
);

type GcSurfaceProps = ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof surfaceVariants> & {
    asChild?: boolean;
  };

export function GcSurface({
  className,
  variant,
  padding,
  asChild = false,
  ...props
}: GcSurfaceProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="gc-surface"
      data-variant={variant ?? undefined}
      className={cn(surfaceVariants({ variant, padding }), className)}
      {...props}
    />
  );
}
