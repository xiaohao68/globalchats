import { ComponentProps, FC } from "react";
import { cn } from "@gc/lib/utils.ts";

export const RsvCardTitle: FC<ComponentProps<"div">> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "h-[52px] w-full overflow-hidden bg-gradient-to-b from-[#27aee819] to-[#a1f7ff00] px-5 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
