import { FC, useRef } from "react";
import { cn } from "@gc/lib/utils.ts";
import { defaultPlatformConfigList, EPlatform } from "@gc/model";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { defaultTransition } from "@gc/utils";
import { PlatformIcon } from "@/components/icons";
import { useIsOverflowing } from "@/components/layouts/left-sidebar/useIsOverflowing.ts";
import { ConditionalRender, SearchSelector } from "@gc/ui/custorm-components";
import { IconAddOutline } from "@/components/icons/IconAddOutline.tsx";
import { AppList } from "@/components/layouts/left-sidebar/AppList.tsx";
import { Input } from "@gc/ui/components/input.tsx";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";

export const MultiProxySidebar: FC = () => {
  const [isOverFlowingRef, isOverflowing] = useIsOverflowing();
  const inputRef = useRef<HTMLInputElement>(null);
  const openForCreate = useSessionConfigStore((s) => s.openForCreate);

  const scrollToBottom = () => {
    const menuEle = isOverFlowingRef.current?.osInstance()?.elements().content;
    menuEle?.scrollTo({
      top: menuEle?.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="mb-[8px] h-[44px] pl-[24px]">
        <SearchSelector
          onChange={async (value) => {
            const platformConfig = defaultPlatformConfigList.find(
              (it) => it.platform === value,
            );
            if (!platformConfig) {
              return;
            }

            // 打开配置弹窗
            await openForCreate(platformConfig.platform);
            scrollToBottom();
          }}
          options={defaultPlatformConfigList.map((it) => ({
            label: it.platform,
            value: it.id,
            disabled: !it.support,
          }))}
          itemRender={(it) => (
            <ConditionalRender
              condition={it.value !== EPlatform.Fingerprint}
              fallback={
                <>
                  <PlatformIcon platform={it.value as EPlatform} size={12} />
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    <Input
                      ref={inputRef}
                      placeholder="请输入指纹浏览地址(试验版)"
                      className="h-6"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    />
                  </span>
                </>
              }
            >
              <>
                <PlatformIcon platform={it.value as EPlatform} size={12} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {it.value}
                  {it.disabled && "（正在接入...）"}
                </span>
              </>
            </ConditionalRender>
          )}
          contentClassName="w-60"
        >
          <div
            className={cn(
              "group flex h-full w-full cursor-pointer items-center",
            )}
          >
            <div
              className={cn(
                "flex h-full w-full rounded-xl",
                "bg-cover bg-no-repeat text-sm",
                defaultTransition,
                "group-hover:bg-primary/10 group-hover:text-primary",
                "group-active:bg-[url('/src/assets/icons/nav_bg_active.svg')] group-active:text-white",
              )}
            >
              <div className="flex flex-1 items-center gap-[10px] pl-[20px]">
                <IconAddOutline size={20} />
                <span className="w-[84px] capitalize">新建会话</span>
              </div>
            </div>
          </div>
        </SearchSelector>
      </div>

      <OverlayScrollbarsComponent
        options={{ scrollbars: { autoHide: "scroll" } }}
        className="flex-grow overflow-y-scroll"
        ref={isOverFlowingRef}
      >
        <AppList />
      </OverlayScrollbarsComponent>
      <div
        className={cn(
          "invisible mb-3 ml-6 h-px w-[204px] bg-white/50",
          isOverflowing && "visible",
        )}
      />
    </>
  );
};
