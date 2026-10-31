import { FC } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

export const IconEdit: FC<LucideProps> = ({
  size = 16,
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={cn("stroke-current", className)}
    {...props}
  >
    <path
      d="M6.84961 9.94904H10.0381"
      strokeWidth="0.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.42736 2.47786C6.79586 2.00836 7.39136 2.03286 7.86136 2.40136L8.55636 2.94636C9.02636 3.31486 9.19286 3.88636 8.82436 4.35686L4.67986 9.64436C4.54136 9.82136 4.32986 9.92586 4.10486 9.92836L2.50636 9.94886L2.14436 8.39136C2.09336 8.17286 2.14436 7.94286 2.28286 7.76536L6.42736 2.47786Z"
      strokeWidth="0.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.65137 3.46808L8.04837 5.34708"
      strokeWidth="0.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
