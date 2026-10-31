import { cn } from "@gc/lib/utils.ts";
import { FC, memo, MouseEvent, useCallback } from "react";
import { defaultTransition } from "@gc/utils";
import { useUserStore } from "@gc/store";
import { useShallow } from "zustand/react/shallow";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import { Settings } from "lucide-react";

interface Props {
  appId: string;
}

export const AppProxyInfo: FC<Props> = memo(({ appId }) => {
  const thirdAppConfig = useUserStore(
    useShallow((store) => store.getThirdAppConfigById(appId))
  );
  const openForEdit = useSessionConfigStore((s) => s.openForEdit);

  const handleOpenEdit = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      openForEdit(appId);
    },
    [appId, openForEdit]
  );

  const proxyEnabled = thirdAppConfig?.proxy?.enable;
  const proxyHost = thirdAppConfig?.proxy?.host;
  const proxyPort = thirdAppConfig?.proxy?.port;

  const proxyText = proxyEnabled && proxyHost ? `${proxyHost}:${proxyPort}` : "";

  return (
    <div
      className={cn(
        "flex h-[16px] w-[84px] cursor-pointer items-center truncate p-[1px] text-[10px] leading-normal",
        "hover:text-primary",
        defaultTransition
      )}
      onClick={handleOpenEdit}
      title={proxyText || "点击配置代理"}
    >
      <Settings size={12} className="mr-1 shrink-0 text-[#84868c]" />
      <span className="flex-1 truncate leading-tight text-[#84868c]">
        {proxyText || "无代理"}
      </span>
    </div>
  );
});
