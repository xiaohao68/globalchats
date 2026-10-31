import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gc/ui/components/popover.tsx";
import { FC, memo, PropsWithChildren } from "react";
import { PopoverArrow, PopoverClose } from "@radix-ui/react-popover";
import { triggerEscEvent } from "@gc/misc";
import { X } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import { webviewManger } from "@gc/webview";

export const DeleteAppPopover: FC<PropsWithChildren & { appId: string }> = memo(
  ({ children, appId }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[206px] cursor-default"
          side="bottom"
          align="end"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="grid gap-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                删除后将不可找回？
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="secondary" onClick={triggerEscEvent}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={() => {
                webviewManger.remove(appId);
              }}
            >
              确定
            </Button>
          </div>

          <PopoverArrow className="fill-white" />

          <PopoverClose className="text-secondary-foreground hover:bg-secondary absolute top-[5px] right-[5px] inline-flex h-6 w-6 items-center justify-center rounded-full">
            <X size={16} />
          </PopoverClose>
        </PopoverContent>
      </Popover>
    );
  },
);
