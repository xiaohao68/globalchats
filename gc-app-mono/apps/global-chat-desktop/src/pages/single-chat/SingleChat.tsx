import { FC } from "react";
import { LoadingPlatform } from "@/pages/single-chat/components/LoadingPlatform.tsx";
import { cn } from "@gc/ui/lib/utils";

export const SingleChat: FC = () => {
  return (
    <div className={cn(
      "h-full w-full flex items-center justify-center",
      "gc-glass-l1 rounded-2xl"
    )}>
      <LoadingPlatform />
    </div>
  );
};
