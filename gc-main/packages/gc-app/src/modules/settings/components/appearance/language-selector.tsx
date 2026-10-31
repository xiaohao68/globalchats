"use client"

import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"

import { cn } from "@/modules/shared"
import type { MemberLanguage } from "@/modules/settings/constants/member-preferences"
import { Button } from "@/shadcn-ui-kit/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/shadcn-ui-kit/ui/command"
import { Label } from "@/shadcn-ui-kit/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/shadcn-ui-kit/ui/popover"

const LANGUAGE_OPTIONS: Array<{
  label: string
  value: MemberLanguage
}> = [
  { label: "English", value: "en" },
  { label: "中文", value: "zh" }
]

interface LanguageSelectorProps {
  value: MemberLanguage
  onChange: (value: MemberLanguage) => void
  disabled?: boolean
}

export function LanguageSelector({
  value,
  onChange,
  disabled
}: LanguageSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Language</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn("w-full justify-between", !value && "text-muted-foreground")}>
            {LANGUAGE_OPTIONS.find((language) => language.value === value)?.label || "Select language"}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search language..." />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              <CommandGroup>
                {LANGUAGE_OPTIONS.map((language) => (
                  <CommandItem
                    value={language.label}
                    key={language.value}
                    onSelect={() => onChange(language.value)}>
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        language.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {language.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-muted-foreground text-sm">
        This language preference is saved per workspace member.
      </p>
    </div>
  )
}
