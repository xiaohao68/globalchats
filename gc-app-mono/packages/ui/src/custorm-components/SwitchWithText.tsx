import { cn } from "@gc/lib/utils";
import {
  FancySwitch,
  FancySwitchProps,
  OptionType,
} from "@omit/react-fancy-switch";
import { FC } from "react";

export const SwitchWithText: FC<FancySwitchProps<OptionType>> = (props) => {
  return (
    <FancySwitch
      {...props}
      data-testid="SwitchWithText"
      className="bg-muted-foreground flex rounded-full p-0.5 text-sm"
      highlighterClassName="bg-primary rounded-full"
      aria-label="Order type"
      radioClassName={cn(
        "relative mx-px flex h-6 cursor-pointer items-center justify-center",
        "rounded-full px-2   transition-colors focus:outline-none data-[checked]:text-primary-foreground",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      )}
      highlighterIncludeMargin={true}
    />
  );
};
