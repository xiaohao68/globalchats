import { Input } from "@gc/ui/components/input.tsx";
import * as React from "react";
import { InputHTMLAttributes } from "react";
import { cn } from "@gc/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  withLeftIcon?: JSX.Element;
  withRightIcon?: JSX.Element;
}

export const InputWithIcon = React.forwardRef<HTMLInputElement, Props>(
  ({ className, withRightIcon, withLeftIcon, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          placeholder="Search"
          className={cn(className, withLeftIcon && "pl-7")}
          {...props}
        />

        {withRightIcon && <div>{withRightIcon}</div>}

        {withLeftIcon && (
          <div className="absolute top-1/2 left-2 -translate-y-1/2">
            {withLeftIcon}
          </div>
        )}
      </div>
    );
  },
);
