"use client";

import { Popover, PopoverContent } from "@gc/ui/components/popover";
import { SmileIcon } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";
import { PopoverTrigger } from "@gc/ui/components/popover.tsx";
import { noop } from "lodash-es";
import { Button } from "@gc/ui/components/button.tsx";

interface EmojiPickerProps {
  onChange?: (value: string) => void;
}

export const EmojiPicker = ({ onChange = noop }: EmojiPickerProps) => {
  const { theme } = useTheme();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-full">
          <SmileIcon className="text-muted-foreground hover:text-foreground size-6 transition" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full">
        <Picker
          emojiSize={18}
          theme={theme || "light"}
          data={data}
          maxFrequentRows={1}
          onEmojiSelect={(emoji: any) => onChange(emoji.native)}
        />
      </PopoverContent>
    </Popover>
  );
};
