import { FC } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

export const IconDark: FC<LucideProps> = ({
  size = 16,
  className,
  ...props
}) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    className={cn("fill-current", className)}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.9774 9.39481C16.7479 11.407 14.5308 12.7501 12 12.7501C8.134 12.7501 4.99999 9.61605 4.99999 5.75005C4.99999 4.95099 5.13388 4.1832 5.38044 3.4679C3.33505 4.91702 2 7.30266 2 10.0001C2 14.4184 5.58172 18.0001 10 18.0001C14.4183 18.0001 18 14.4184 18 10.0001C18 9.79649 17.9924 9.59463 17.9774 9.39481Z"
    />
  </svg>
);
