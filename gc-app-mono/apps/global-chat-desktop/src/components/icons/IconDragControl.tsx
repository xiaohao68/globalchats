import { cn } from "@gc/lib/utils.ts";
import { defaultTransition } from "@gc/utils";
import { GripVertical } from "lucide-react";
import { ComponentProps, FC } from "react";
import { DraggableProvided, DraggableStateSnapshot } from "@hello-pangea/dnd";

type Props = {
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
} & ComponentProps<"div">;
export const IconDragControl: FC<Props> = ({
  provided,
  snapshot,
  className,
  ...props
}) => (
  <div
    className={cn(
      "platforms-handle invisible mr-[4px] ml-[6px] cursor-move rounded-[2px] bg-[#bbd1ef] py-[1px] select-all group-hover:visible",
      defaultTransition,
      snapshot.isDragging && "visible",
      className,
    )}
    {...provided.dragHandleProps}
    {...props}
  >
    <GripVertical
      color="#1F75FF"
      size="14"
      className={cn(!snapshot.isDragging && "opacity-40")}
    />
  </div>
);
