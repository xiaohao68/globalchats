import { cn } from "@gc/ui/lib/utils";

interface GcAuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  intensity?: "subtle" | "normal" | "vivid";
}

export function GcAuroraBackground({
  children,
  className,
}: GcAuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-full overflow-hidden",
        className,
      )}
      style={{ background: "#EFEAE2" }}
    >
      {/* 内容层 */}
      <div className="relative z-10 flex h-screen flex-col">{children}</div>
    </div>
  );
}
