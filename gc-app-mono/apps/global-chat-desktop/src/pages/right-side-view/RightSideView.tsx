import { FC } from "react";
import { Outlet } from "react-router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useIsOverflowing } from "@/components/layouts/left-sidebar/useIsOverflowing";

export const RightSideView: FC = () => {
  const [ref, _isOverflowing] = useIsOverflowing();

  return (
    <OverlayScrollbarsComponent
      options={{ scrollbars: { autoHide: "scroll" } }}
      className="relative h-full w-full overflow-y-scroll rounded-xl border border-[var(--gc-border-1)] bg-[var(--gc-bg-secondary)]/80 backdrop-blur-xl select-none"
      ref={ref}
    >
      <Outlet />
    </OverlayScrollbarsComponent>
  );
};
