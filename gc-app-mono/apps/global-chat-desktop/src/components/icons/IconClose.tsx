import { FC } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

export const IconClose: FC<LucideProps> = ({
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
    <g clipPath="url(#clip0_94_16002)">
      <path
        d="M9.66683 6.33338L6.3335 9.66672M6.3335 6.33338L9.66683 9.66672M4.66683 2.22538C5.6798 1.6392 6.82982 1.33145 8.00016 1.33338C11.6822 1.33338 14.6668 4.31805 14.6668 8.00005C14.6668 11.682 11.6822 14.6667 8.00016 14.6667C4.31816 14.6667 1.3335 11.682 1.3335 8.00005C1.3335 6.78605 1.65816 5.64672 2.2255 4.66672"
        strokeLinecap="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_94_16002">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
