import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Home } from "@/pages/home";
import { SettingPage } from "@/pages/setting/SettingPage.tsx";
import { SingleChat } from "@/pages/single-chat/SingleChat.tsx";
import { RightSideView } from "@/pages/right-side-view/RightSideView.tsx";
import TestWebviewStatus from "@/pages/test/WebviewStatus.tsx";
import {
  CustomerPortrait,
  GlobalProxyPage,
  ProxyPage,
  TranslatePage,
  FingerprintPage,
  GlobalFingerprintPage,
} from "@/pages/right-side-view";
import { FansStatistics } from "@/pages/right-side-view/FansStatistics.tsx";
import { ERouterPath } from "@gc/model";
import { AppLayout } from "@/components/layouts/app-layout.tsx";
import { useAppStore } from "@gc/store";
import { ConditionalRender } from "@gc/ui/custorm-components";
import { EmptySideView } from "@/pages/right-side-view/EmptySideView.tsx";
import { GlobalTranslatePage } from "@/pages/right-side-view/translate/GlobalTranslatePage.tsx";
import { SessionConfigDialog } from "@/components/dialogs/SessionConfigDialog";

export const Router = () => {
  const currentAppId = useAppStore((store) => store.currentAppId);

  return (
    <BrowserRouter>
      <SessionConfigDialog />
      <Routes>
        {/*
          登录页已彻底下线（2026-10-20 老板拍板）：软件打开即用，不再有账号密码。
          要登录的是内嵌的外贸平台（LinkedIn / Facebook 等），密码由平台自己管。

          这里不停在"删掉路由"，而是改成重定向到主界面 ——
          因为业务员那边出现过打开旧版看到 admin 登录框的情况，
          万一还有谁手敲 /sign-in、或者旧版残留跳过来，都会直接送回主界面，
          登录页在任何路径下都不可能出现。
        */}
        <Route path={ERouterPath.signIn} element={<Navigate to="/" replace />} />

        <Route path={ERouterPath.rightSideView} element={<RightSideView />}>
          <Route
            path={ERouterPath.translate}
            element={
              <ConditionalRender
                condition={!!currentAppId}
                fallback={<GlobalTranslatePage />}
              >
                <TranslatePage appId={currentAppId!} />
              </ConditionalRender>
            }
          />
          <Route
            path={ERouterPath.proxy}
            element={
              <ConditionalRender
                condition={!!currentAppId}
                fallback={<GlobalProxyPage />}
              >
                <ProxyPage appId={currentAppId!} />
              </ConditionalRender>
            }
          />
          <Route
            path={ERouterPath.fingerprint}
            element={
              <ConditionalRender
                condition={!!currentAppId}
                fallback={<GlobalFingerprintPage />}
              >
                <FingerprintPage appId={currentAppId!} />
              </ConditionalRender>
            }
          />
          <Route
            path={ERouterPath.customerPortrait}
            element={
              <ConditionalRender
                condition={!!currentAppId}
                fallback={<EmptySideView />}
              >
                <CustomerPortrait appId={currentAppId!} />
              </ConditionalRender>
            }
          />
          <Route
            path={ERouterPath.fansStatistics}
            element={<FansStatistics />}
          />
        </Route>

        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path={ERouterPath.home} element={<Home />} />
          <Route path={ERouterPath.setting} element={<SettingPage />} />

          <Route path={ERouterPath.singleChat}>
            <Route index element={<SingleChat />} />
            <Route path=":appId" element={<SingleChat />} />
          </Route>
        </Route>

        {/* 测试路由 */}
        <Route path={ERouterPath.testWebviewStatus} element={<TestWebviewStatus />} />
      </Routes>
    </BrowserRouter>
  );
};
