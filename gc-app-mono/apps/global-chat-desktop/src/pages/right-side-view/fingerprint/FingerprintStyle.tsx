import {
  FormControl,
  FormField,
  FormLabel,
  FormMessage,
} from "@gc/ui/components/form.tsx";
import { Input } from "@gc/ui/components/input.tsx";
import { SearchSelector, SwitchWithText } from "@gc/ui/custorm-components";
import { Switch } from "@gc/ui/components/switch.tsx";

import type { Control, FieldPath } from "react-hook-form";
import { Button } from "@gc/ui/components/button";
import { Loader2 } from "lucide-react";
import { RsvCardTitle } from "../components";
import { cn } from "@gc/ui/lib/utils";

// 表单行样式统一
const rowBaseClasses = "grid grid-cols-[auto_1fr] items-center gap-4";
const labelBaseClasses =
  "text-secondary-foreground text-sm font-normal select-none";
const inputBaseClasses = "h-8 bg-white text-sm";
const portInputClasses = "h-8 w-20 bg-white text-sm";

type RowProps = {
  label: string;
  labelWidth?: string;
  children: React.ReactNode;
};

export function FormRow({ label, labelWidth = "w-14", children }: RowProps) {
  return (
    <div className={rowBaseClasses}>
      <FormLabel className={`${labelBaseClasses} ${labelWidth}`}>
        {label}
      </FormLabel>
      {children}
      <FormMessage />
    </div>
  );
}

export function RowInput<T extends Record<string, any>>({
  name,
  control,
  label,
  placeholder,
  disabled,
  isPort = false,
}: {
  name: FieldPath<T>; // 表单字段名强类型
  control: Control<T>; // control 强类型
  label: string;
  placeholder?: string;
  disabled?: boolean;
  isPort?: boolean; // 专门针对端口长度的输入框
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormRow label={label}>
          <FormControl>
            <Input
              className={isPort ? portInputClasses : inputBaseClasses}
              placeholder={placeholder}
              disabled={disabled}
              {...field}
            />
          </FormControl>
        </FormRow>
      )}
    />
  );
}

export function RowSelect<T extends Record<string, any>>({
  name,
  control,
  label,
  options,
  placeholder,
  disabled,
  itemRender,
  contentClassName,
}: {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
  itemRender?: (item: {
    label: string;
    value: string;
    disabled?: boolean;
  }) => React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormRow label={label}>
          <SearchSelector
            value={field.value}
            onChange={field.onChange}
            placeholder={placeholder}
            options={options}
            disabled={disabled}
            itemRender={itemRender as any}
            contentClassName={contentClassName}
          />
        </FormRow>
      )}
    />
  );
}

export function RowSelectWithCustom<T extends Record<string, any>>({
  name,
  control,
  label,
  options,
  placeholder,
  disabled,
  customOptionLabel = "自定义",
  customValue,
  onCustomValueChange,
  inputClassName,
  contentClassName,
}: {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
  customOptionLabel?: string;
  customValue: string;
  onCustomValueChange: (value: string) => void;
  inputClassName?: string;
  contentClassName?: string;
}) {
  const finalOptions = [
    ...options,
    { label: customOptionLabel ?? "自定义", value: "__custom__" },
  ];

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const isPreset = finalOptions.some((o) => o.value === field.value);
        const selectedValue = isPreset ? field.value : "__custom__";
        return (
          <FormRow label={label}>
            <SearchSelector
              value={selectedValue}
              onChange={(val) => {
                if (val === "__custom__") {
                  field.onChange(customValue);
                } else {
                  field.onChange(val);
                }
              }}
              placeholder={placeholder}
              options={finalOptions}
              disabled={disabled}
              itemRender={(item) => {
                if (item.value === "__custom__") {
                  return (
                    <span className="ml-2 flex-1">
                      <Input
                        placeholder={customOptionLabel ?? "自定义"}
                        value={customValue}
                        className={inputClassName}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const value = e.target.value;
                          onCustomValueChange(value);
                          field.onChange(value);
                        }}
                      />
                    </span>
                  );
                }

                return (
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.label}
                  </span>
                );
              }}
              contentClassName={contentClassName}
            />
          </FormRow>
        );
      }}
    />
  );
}

export function RowSwitch<T extends Record<string, any>>({
  name,
  control,
  label,
  onChange,
  options,
}: {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options?: { value: boolean; label: string }[];
  onChange?: (val: boolean) => void;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormRow label={label}>
          {options ? (
            <SwitchWithText
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                onChange?.(value as boolean);
              }}
              options={options}
            />
          ) : (
            <Switch
              checked={field.value}
              onCheckedChange={(value) => {
                field.onChange(value);
                onChange?.(value as boolean);
              }}
              className="data-[state=unchecked]:bg-muted-foreground cursor-pointer"
            />
          )}
        </FormRow>
      )}
    />
  );
}

export function SidebarSubmitButton({
  label,
  isPending = false,
  disabled = false,
}: {
  label: string;
  isPending: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="default" type="submit" disabled={disabled}>
        {isPending && <Loader2 className="animate-spin" />}
        {label}
      </Button>
    </div>
  );
}

export function SidebarTitle({ label }: { label: string }) {
  return (
    <RsvCardTitle>
      <div className={cn("text-base font-medium text-[#151b26] select-none")}>
        {label}
      </div>
    </RsvCardTitle>
  );
}
