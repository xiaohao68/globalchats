import { FC } from "react";
import { RsvCardTitle } from "@/pages/right-side-view/components";

export const EmptySideView: FC = () => {
  return (
    <div className="flex h-full w-full flex-col">
      <RsvCardTitle />
      请选择聊天
    </div>
  );
};
