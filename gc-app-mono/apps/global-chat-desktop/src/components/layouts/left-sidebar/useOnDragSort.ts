import { FN } from "@gc/utils";
import { useCallback } from "react";
import { DropResult } from "@hello-pangea/dnd";

type WithIdAndIndex = { id: string; index: number };

export const useOnDragSort: <T extends WithIdAndIndex>(
  list: T[],
  setList: FN<T[]>,
) => FN<DropResult> = (list, setList) => {
  return useCallback(
    (dropResult: DropResult) => {
      if (
        !dropResult.destination ||
        dropResult.destination.index === dropResult.source.index
      )
        return;

      const oldIndex = dropResult.source.index;
      const newIndex = dropResult.destination.index;
      const [self] = list.splice(oldIndex!, 1);
      list.splice(newIndex!, 0, self!);
      list.forEach((it, index) => (it.index = index));
      setList(list);
    },
    [list, setList],
  );
};
