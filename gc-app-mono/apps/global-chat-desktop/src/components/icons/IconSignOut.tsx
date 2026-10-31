import { FC, memo } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

type Props = LucideProps & {
  isActive?: boolean;
};
export const IconSignOut: FC<Props> = memo(
  ({ size = 16, className, ...props }) => (
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
        d="M9.29604 16.3412L9.29604 17.2742C9.29604 19.3092 10.946 20.9592 12.981 20.9592L17.856 20.9592C19.89 20.9592 21.54 19.3092 21.54 17.2742L21.54 6.14423C21.54 4.10923 19.89 2.45923 17.856 2.45923L12.971 2.45923C10.942 2.45923 9.29604 4.10423 9.29604 6.13323L9.29604 7.07623"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.50246 11.7094L14.5435 11.7094"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.43066 14.6244L2.50266 11.7094L5.43066 8.79339"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
);
