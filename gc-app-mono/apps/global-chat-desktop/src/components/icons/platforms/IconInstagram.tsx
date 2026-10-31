import { FC, memo } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

type Props = LucideProps & {
  isActive?: boolean;
};
export const IconInstagram: FC<Props> = memo(
  ({ size = 16, className, isActive = false, ...props }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      {...props}
    >
      <circle cx="10" cy="10" r="9" fill={isActive ? "white" : "#EF2A84"} />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 5.8H13C13.6627 5.8 14.2 6.33726 14.2 7V13C14.2 13.6627 13.6627 14.2 13 14.2H7C6.33726 14.2 5.8 13.6627 5.8 13V7C5.8 6.33726 6.33726 5.8 7 5.8ZM5 7C5 5.89543 5.89543 5 7 5H13C14.1046 5 15 5.89543 15 7V13C15 14.1046 14.1046 15 13 15H7C5.89543 15 5 14.1046 5 13V7ZM8 7.8H12C12.1105 7.8 12.2 7.88954 12.2 8V12C12.2 12.1105 12.1105 12.2 12 12.2H8C7.88954 12.2 7.8 12.1105 7.8 12V8C7.8 7.88954 7.88954 7.8 8 7.8ZM7 8C7 7.44772 7.44772 7 8 7H12C12.5523 7 13 7.44772 13 8V12C13 12.5523 12.5523 13 12 13H8C7.44772 13 7 12.5523 7 12V8Z"
        fill={isActive ? "#EF2A84" : "white"}
      />
    </svg>
  ),
);
