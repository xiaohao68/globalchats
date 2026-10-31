import { FC, memo } from "react";
import { LucideProps } from "lucide-react";
import { cn } from "@gc/lib/utils.ts";

type Props = LucideProps & {
  isActive?: boolean;
};
export const IconTelegram: FC<Props> = memo(
  ({ size = 16, className, isActive = false, ...props }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "fill-current text-[#1897FF]",
        isActive && "text-white",
        className,
      )}
      {...props}
    >
      <path d="M18.0982 1.52391C17.6576 1.06186 17.0055 0.889726 16.3975 1.07092L2.21875 5.28369C1.57723 5.46579 1.12252 5.98854 1.00003 6.65262C0.874903 7.32847 1.31198 8.18643 1.88301 8.5452L6.31639 11.3293C6.77109 11.6146 7.35798 11.5431 7.73426 11.1553L12.8109 5.93599C13.0665 5.6642 13.4895 5.6642 13.745 5.93599C14.0006 6.19873 14.0006 6.62453 13.745 6.89633L8.65953 12.1165C8.28237 12.5034 8.21187 13.1059 8.48945 13.5733L11.1983 18.1485C11.5155 18.6921 12.0619 19.0001 12.6611 19.0001C12.7316 19.0001 12.8109 19.0001 12.8814 18.9911C13.5688 18.9005 14.1151 18.4203 14.3178 17.7408L18.5212 3.27243C18.7062 2.65637 18.5388 1.98595 18.0982 1.52391Z" />
    </svg>
  ),
);
