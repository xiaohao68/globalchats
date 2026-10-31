import { ComponentProps, FC } from "react";
import { cn } from "@gc/lib/utils.ts";

export const RsvContentWrap: FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("w-full px-6", className)} {...props}>
      {children}
    </div>
  );
};
