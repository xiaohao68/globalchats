"use client";

import { ControllerRenderProps, useFormContext } from "react-hook-form";
import { SelectOption, SelectOptions } from "@gc/utils";
import { FC, PropsWithChildren } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gc/ui/components/popover.tsx";
import { FormControl } from "@gc/ui/components/form.tsx";
import { Button } from "@gc/ui/components/button.tsx";
import { cn } from "@gc/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@gc/ui/components/command.tsx";
import { triggerEscEvent } from "@gc/misc";
import { noop } from "lodash-es";
import { GcButton } from "@gc/ui/custorm-components/GcButton.tsx";
import { ConditionalRender } from "@gc/ui/custorm-components/ConditionalRender.tsx";

interface Props extends Partial<ControllerRenderProps>, PropsWithChildren {
  options?: SelectOptions;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  itemRender?: (item: SelectOption) => JSX.Element;
  contentClassName?: string;
}

export const SearchSelector: FC<Props> = ({
  value = "",
  onChange = noop,
  options = [],
  placeholder = "请选择",
  children,
  className,

  itemRender,
  contentClassName = "",
  ...props
}) => {
  const formContext = useFormContext();
  const hasFormContext = !!formContext;

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      className={cn(
        "w-full min-w-0 shrink justify-between px-2 text-left",
        !value && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {value
          ? options.find((it) => it.value.toString() === value)?.label
          : placeholder}
      </span>
      <ChevronsUpDown size="16" className="opacity-50" />
    </Button>
  );

  return (
    <Popover>
      <ConditionalRender
        condition={!!children}
        fallback={
          <div className="group relative inline-flex w-full min-w-0 items-center">
            <PopoverTrigger asChild>
              {hasFormContext ? (
                <FormControl>{triggerButton}</FormControl>
              ) : (
                triggerButton
              )}
            </PopoverTrigger>
            <GcButton
              type="button"
              size="icon"
              variant="link"
              className={cn(
                "bg-thirdly-foreground absolute right-2 z-10 hidden h-4 w-4 rounded-full p-0 text-white",
                "group-hover:block",
              )}
              onClick={() => {
                onChange("");
              }}
            >
              <X size={16} className="p-0.5" />
            </GcButton>
          </div>
        }
      >
        <PopoverTrigger asChild>{children}</PopoverTrigger>
      </ConditionalRender>
      <PopoverContent className={cn("w-full p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {options.map((it) => (
                <CommandItem
                  className="cursor-pointer"
                  value={it.label}
                  key={it.value}
                  disabled={!!it.disabled}
                  onSelect={() => {
                    onChange(it.value);
                    triggerEscEvent();
                  }}
                >
                  <ConditionalRender
                    condition={!!itemRender}
                    fallback={
                      <>
                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {it.label}
                        </span>
                        <Check
                          size="16"
                          className={cn(
                            "ml-auto",
                            it.value === value ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </>
                    }
                  >
                    {itemRender?.(it)}
                  </ConditionalRender>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
