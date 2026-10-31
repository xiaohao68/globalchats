import { cn } from "@/lib/utils";

export interface GradientOrbProps {
  colors?: [string, string];
  className?: string;
  blur?: "xl" | "2xl" | "3xl";
  opacity?: number;
  animate?: boolean;
}

export function GradientOrb({
  colors = ["#3B82F6", "#8B5CF6"],
  className,
  blur = "3xl",
  opacity = 30,
  animate = true,
}: GradientOrbProps) {
  const blurMap = {
    xl: "blur-xl",
    "2xl": "blur-2xl",
    "3xl": "blur-3xl",
  };

  return (
    <div
      className={cn(
        "rounded-full pointer-events-none",
        blurMap[blur],
        animate && "animate-float",
        className
      )}
      style={{
        background: `radial-gradient(circle, ${colors[0]} 0%, ${colors[1]} 100%)`,
        opacity: opacity / 100,
      }}
    />
  );
}
