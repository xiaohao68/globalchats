import { cn } from "@/lib/utils";

export interface GridBackgroundProps {
  className?: string;
  fadeEdges?: boolean;
}

export function GridBackground({ className, fadeEdges = true }: GridBackgroundProps) {
  return (
    <div className={cn("absolute inset-0 -z-10", className)}>
      {/* 基础渐变 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50/50 to-white" />

      {/* 网格线 */}
      <div className="absolute inset-0 bg-grid" />

      {/* 渐变遮罩 - 让边缘淡出 */}
      {fadeEdges && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 0%, white 70%)",
          }}
        />
      )}
    </div>
  );
}
