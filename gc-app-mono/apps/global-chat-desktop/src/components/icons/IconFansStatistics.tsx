import { FC } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

export const IconFansStatistics: FC<LucideProps> = ({
  size = 16,
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={cn("stroke-current", className)}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20.9485 9.9755C20.3094 6.0421 16.9684 3.11586 12.9851 3.00067C12.7957 2.99325 12.6111 3.06143 12.472 3.19021C12.333 3.31898 12.2508 3.49777 12.2437 3.68717V3.75124L12.6922 10.4606C12.7216 10.9123 13.1099 11.2556 13.5617 11.2295L20.2894 10.781C20.479 10.767 20.6551 10.6779 20.7788 10.5336C20.9026 10.3893 20.9636 10.2016 20.9485 10.0121V9.9755Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.3992 13.8144C18.1703 17.2248 15.7201 20.0759 12.3829 20.8149C9.04567 21.5539 5.62083 20.0039 3.97354 17.009C3.48179 16.147 3.17037 15.1941 3.0582 14.208C3.01025 13.9054 2.99186 13.5989 3.00328 13.2927C3.013 9.65071 5.57079 6.51264 9.13601 5.76868"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
