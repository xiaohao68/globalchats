"use client";

import { cn } from "@gc/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { useRef, useState } from "react";

const magneticButtonVariants = cva(
  [
    "relative inline-flex items-center justify-center",
    "font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-[var(--gc-brand)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-r from-[var(--gc-brand-gradient-start)] to-[var(--gc-brand-gradient-end)]",
          "text-white shadow-lg shadow-blue-500/25",
          "hover:shadow-xl hover:shadow-blue-500/30",
          "hover:-translate-y-0.5",
          "active:scale-[0.98]",
        ],
        glass: [
          "gc-glass text-[var(--gc-text-primary)]",
          "hover:bg-[var(--gc-surface-2)]",
          "active:scale-[0.98]",
        ],
        ghost: [
          "text-[var(--gc-text-secondary)]",
          "hover:text-[var(--gc-text-primary)]",
          "hover:bg-[var(--gc-surface-1)]",
        ],
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-lg",
        md: "h-11 px-6 text-base rounded-xl",
        lg: "h-14 px-8 text-lg rounded-2xl",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
    },
  },
);

export interface GcMagneticButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof magneticButtonVariants> {
  magneticStrength?: number;
}

export function GcMagneticButton({
  className,
  variant,
  size,
  fullWidth,
  magneticStrength = 0.3,
  children,
  ...props
}: GcMagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    // 限制最大位移
    const maxDistance = 8;
    const moveX = Math.max(-maxDistance, Math.min(maxDistance, distanceX * magneticStrength));
    const moveY = Math.max(-maxDistance, Math.min(maxDistance, distanceY * magneticStrength));

    setPosition({ x: moveX, y: moveY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        magneticButtonVariants({ variant, size, fullWidth }),
        className,
      )}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: position.x === 0 && position.y === 0
          ? "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "transform 0.1s ease-out",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}
