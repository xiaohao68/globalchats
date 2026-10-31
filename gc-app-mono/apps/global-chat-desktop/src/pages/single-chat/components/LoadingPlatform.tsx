import { FC, memo } from "react";
import { IconPlatformLoading, PlatformIcon } from "@/components/icons";
import { useCurrentApp } from "@gc/store";
import { ELoadingStatus } from "@gc/model";
import { LoadingThreeDotsWave } from "@gc/ui/custorm-components";
import { IconEmptyApp } from "@/components/icons/IconEmptyApp.tsx";

export const LoadingPlatform: FC = memo(() => {
  const { currentApp } = useCurrentApp();

  if (!currentApp || currentApp.loadingStatus === ELoadingStatus.none) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <div className="">
          <IconEmptyApp />
        </div>
        <div className="mt-4 text-lg font-medium capitalize">请选择应用</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="relative h-[158px] w-[158px]">
        <IconPlatformLoading loadingStatus={currentApp?.loadingStatus} />
        <PlatformIcon
          size={50}
          platform={currentApp?.platform}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      </div>
      <div className="mt-4 text-lg font-medium capitalize">
        {currentApp?.platform}
      </div>
      <div className="mt-2 text-base font-normal capitalize">
        正在进行加密输出，请稍等
        <LoadingThreeDotsWave />
      </div>
    </div>
  );
});
