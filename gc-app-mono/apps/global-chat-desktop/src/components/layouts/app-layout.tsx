import { FC } from "react";
import { Outlet } from "react-router";
import { AppTitleBar } from "@/components/layouts/app-titlebar/AppTitleBar.tsx";
import { GcAuroraBackground } from "@gc/ui/custorm-components";

/**
 * 应用主框架。
 *
 * 说明：新 UI（三栏 Dashboard：平台栏 + 客户列表 + 内嵌平台 WebView）已经
 * 接管主界面，所以这里不再渲染旧的 LeftSidebar / Main（它们原本会把
 * 聚合模式下的 Outlet 吞掉，导致新 Dashboard 根本渲染不出来）。
 */
export const AppLayout: FC = () => {
  // 登录已去掉（2026-10-20）：main.tsx 启动时直接写入 gc_token，
  // 这里不再回到登录页。保留 gc_token 的写入只是为了不让别处的判断崩掉。
  return (
    <GcAuroraBackground className="flex flex-col">
      <AppTitleBar />
      <div className="flex-1 min-h-0 overflow-hidden flex">
        <Outlet />
      </div>
    </GcAuroraBackground>
  );
};
