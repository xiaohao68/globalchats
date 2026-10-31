import { FC, memo, PropsWithChildren } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@gc/ui/components/popover.tsx";
import { Button } from "@gc/ui/components/button.tsx";
import { globalSettingManager } from "@gc/webview";
import { LanguageCodes } from "@gc/model";
import { triggerEscEvent } from "@gc/misc";
import { Arrow } from "@radix-ui/react-popover";
import { IconI18n } from "@/components/icons";
import { useGlobalStore } from "@gc/store";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";

export const SwitchGlobalI18n: FC<PropsWithChildren> = memo(() => {
  const { t } = useTranslation();

  const { i18n } = useGlobalStore(
    useShallow((store) => ({
      i18n: store.globalSetting.i18n,
    })),
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:text-primary h-7 w-auto px-1"
        >
          <IconI18n className="size-5" />
          <span className="text-sm font-normal">
            {t(`common:languages.${i18n}`)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="h-[32px] w-auto space-x-1 px-1 py-0"
        side="left"
        align="center"
      >
        <Button
          className="h-full"
          size="sm"
          variant="ghost"
          onClick={() => {
            globalSettingManager.setI18n(LanguageCodes["en"]);
            triggerEscEvent();
          }}
        >
          English（支持中...）
        </Button>
        <Button
          className="h-full"
          size="sm"
          variant="ghost"
          onClick={() => {
            globalSettingManager.setI18n(LanguageCodes["zh-CN"]);
            triggerEscEvent();
          }}
        >
          中文(简体)
        </Button>
        <Arrow className="fill-white" />
      </PopoverContent>
    </Popover>
  );
});
