import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gc/ui/components/popover.tsx";
import { FC, memo, PropsWithChildren } from "react";
import { PopoverArrow, PopoverClose } from "@radix-ui/react-popover";
import { triggerEscEvent } from "@gc/misc";
import { globalStore } from "@gc/store";
import { webviewManger } from "@gc/webview";
import { isMainWebview } from "@gc/utils";
import { X } from "lucide-react";
import { Button } from "@gc/ui/components/button";

export const SignOutPopover: FC<PropsWithChildren> = memo(({ children }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[206px] cursor-default"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">关闭全部平台网页?</h4>
            <p className="text-muted-foreground text-sm">
              各平台的登录态会保留，下次点开平台不用重新登录。
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
              if (isMainWebview()) {
                webviewManger.closeAll();
              }
              globalStore.signOut();
              triggerEscEvent();
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
});
