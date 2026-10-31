import { RefObject, useEffect, useRef, useState } from "react";
import { OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { isEmpty } from "lodash-es";

export const useIsOverflowing = (): [
  RefObject<OverlayScrollbarsComponentRef | null>,
  boolean,
] => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const ref = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    const osInstance = ref.current?.osInstance();
    if (isEmpty(osInstance)) {
      return;
    }
    const handleScroll = () => {
      setIsOverflowing(osInstance.state().hasOverflow.y);
    };
    osInstance.on("updated", handleScroll);
    // const

    return () => {
      osInstance.off("updated", handleScroll);
    };
  }, []);

  return [ref, isOverflowing];
};
