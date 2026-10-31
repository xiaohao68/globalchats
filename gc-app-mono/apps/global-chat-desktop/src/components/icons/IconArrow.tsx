import { FC } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

export const IconArrow: FC<LucideProps> = ({
  size = 16,
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={cn("stroke-current", className)}
    {...props}
  >
    <path
      d="M12.6668 5.66669L8.00016 10.3334L3.3335 5.66669"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
