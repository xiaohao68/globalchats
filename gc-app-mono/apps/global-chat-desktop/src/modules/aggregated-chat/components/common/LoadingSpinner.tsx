import { cn } from "@gc/ui/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

/**
 * Apple 风格加载动画
 * 使用渐变透明度的旋转圆点
 */
export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const dotCount = 8;
  const dots = Array.from({ length: dotCount }, (_, i) => i);

  return (
    <div
      className={cn("relative animate-spin", sizeClasses[size], className)}
      style={{ animationDuration: "0.8s" }}
    >
      {dots.map((i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-[var(--color-text-secondary)]"
          style={{
            top: "50%",
            left: "50%",
            transform: `rotate(${i * 45}deg) translateY(-150%)`,
            opacity: (i + 1) / dotCount,
          }}
        />
      ))}
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "加载中..." }: LoadingOverlayProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-meta">{message}</p>
    </div>
  );
}
