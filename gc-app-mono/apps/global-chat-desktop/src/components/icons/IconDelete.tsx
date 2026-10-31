import { FC } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

export const IconDelete: FC<LucideProps> = ({
  size = 16,
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 13 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={cn("stroke-current", className)}
    {...props}
  >
    <path
      d="M10.8835 5.93524C10.8835 5.93524 10.5215 11.3497 10.3115 13.6304C10.2115 14.7197 9.65352 15.358 8.73952 15.3781C7.00019 15.4159 5.25885 15.4183 3.52018 15.3741C2.64085 15.3524 2.09218 14.706 1.99418 13.636C1.78285 11.3352 1.42285 5.93524 1.42285 5.93524"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.8053 3.33977H0.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.62738 3.33979C9.10405 3.33979 8.65338 2.89362 8.55071 2.2754L8.38871 1.29783C8.28871 0.846834 7.95004 0.534912 7.56404 0.534912H4.74204C4.35604 0.534912 4.01738 0.846834 3.91738 1.29783L3.75538 2.2754C3.65271 2.89362 3.20204 3.33979 2.67871 3.33979"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
