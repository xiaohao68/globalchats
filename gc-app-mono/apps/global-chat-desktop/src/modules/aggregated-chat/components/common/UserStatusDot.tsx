import { cn } from "@gc/ui/lib/utils";
import type { UserStatus } from "../../types";
import { UserStatusConfig } from "../../types";

interface UserStatusDotProps {
  status?: UserStatus;
  size?: number;
  className?: string;
}

export function UserStatusDot({
  status = "offline",
  size = 6,
  className,
}: UserStatusDotProps) {
  const config = UserStatusConfig[status];

  return (
    <span
      className={cn("inline-block rounded-full", config.color, className)}
      style={{ width: size, height: size }}
      title={config.label}
      aria-label={config.label}
    />
  );
}
