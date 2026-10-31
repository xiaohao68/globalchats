import { cn } from "@gc/lib/utils.ts";
import { IconEdit } from "@/components/icons";
import { FC, memo, MouseEvent, useCallback, useRef, useState } from "react";
import { ConditionalRender, EmptyText } from "@gc/ui/custorm-components";
import { Input } from "@gc/ui/components/input.tsx";
import { defaultTransition } from "@gc/utils";
import { useUserStore } from "@gc/store";
import { useShallow } from "zustand/react/shallow";

interface Props {
  appId: string;
}

export const AppConfigRemark: FC<Props> = memo(({ appId }) => {
  const [thirdAppConfig, updateThirdAppList] = useUserStore(
    useShallow((store) => [
      store.getThirdAppConfigById(appId),
      store.updateThirdAppList,
    ]),
  );
  const [edit, setEdit] = useState(false);

  const ref = useRef<HTMLInputElement>(null);

  const handleOpenEdit = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    setEdit(true);
  }, []);
  const handleCloseEdit = useCallback(() => {
    const remark = ref.current?.value!;
    setEdit(false);
    if (thirdAppConfig.remark === remark) {
      return;
    }
    thirdAppConfig.remark = remark;
    updateThirdAppList([thirdAppConfig]);
  }, []);
  return (
    <div
      className={cn(
        "flex h-[16px] w-[84px] items-center truncate p-[1px] text-[10px] leading-normal",
        defaultTransition,
      )}
    >
      <ConditionalRender
        condition={edit}
        fallback={
          <>
            <div className="p-[1px]">
              <IconEdit
                size={12}
                className="hover:text-primary mr-1 text-[#84868c]"
                onClick={handleOpenEdit}
              />
            </div>
            <span className="flex-1 truncate leading-tight text-[#84868c]">
              <EmptyText>{thirdAppConfig.remark}</EmptyText>
            </span>
          </>
        }
      >
        <Input
          ref={ref}
          type="text"
          onBlur={handleCloseEdit}
          autoFocus
          defaultValue={thirdAppConfig.remark}
          placeholder="请输入"
          className="h-full w-full rounded-sm border-none bg-white/30 px-1 py-[1px] text-[10px] leading-[12px] text-[#84868c] md:text-[10px]"
        />
      </ConditionalRender>
    </div>
  );
});
