import { ComponentProps, FC } from "react";
import { cn } from "@gc/lib/utils";

export const CardGradient: FC<ComponentProps<"div">> = ({
  children,
  className,
  ...props
}) => {
  return (
    <section
      className={cn(
        "h-full overflow-hidden border border-[#FFFFFFC9] bg-[#FFFFFF4D]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
};
