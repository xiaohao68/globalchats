import { FC, memo, useCallback, useEffect, useState } from "react";
import IconClose from "../../../assets/icons/system/close.svg";
import IconMinimize from "../../../assets/icons/system/minimize.svg";
import IconMaximize from "../../../assets/icons/system/maximize.svg";
import IconCloseHover from "../../../assets/icons/system/close_hover.svg";
import IconMinimizeHover from "../../../assets/icons/system/minimize_hover.svg";
import IconMaximizeHover from "../../../assets/icons/system/maximize_hover.svg";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { ImageIcon } from "@/components/ImageIcon.tsx";
import { IconCMS, IconDark, IconLight } from "@/components/icons";
import { ETheme, isDev } from "@gc/model";
import { useAppStore, useGlobalStore } from "@gc/store";
import { ConditionalRender } from "@gc/ui/custorm-components";
import { devtools, globalSettingManager } from "@gc/webview";
import { SwitchGlobalI18n } from "@/components/layouts/app-titlebar/components/SwitchGlobalI18n.tsx";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@gc/ui/components/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gc/ui/components/tooltip.tsx";
import { CheckForAppUpdater } from "@/components/layouts/app-titlebar/CheckForAppUpdater.tsx";
import { DebugDialog } from "@/components/dialog";
import { Bug } from "lucide-react";
import { TitleBarModeSwitcher } from "@/components/layouts/app-titlebar/components/TitleBarModeSwitcher.tsx";
import { SignOutPopover } from "@/components/popover/SignOutPopover.tsx";
import { IconSignOut } from "@/components/icons";
import { cn } from "@gc/ui/lib/utils";

// 获取当前窗口。非 Tauri 环境（如纯浏览器调试）下 getCurrentWindow() 会抛错，
// 这里统一吞掉并返回 null，调用方用 ?. 兜底。
//
// 注意：旧实现额外检查 __TAURI_INTERNALS__.metadata.currentWindow 才返回窗口，
// 一旦该内部字段改名/不存在，最小化与最大化就会静默失效（窗口看起来"被锁死"），
// 所以这里不再依赖内部字段，直接 try { getCurrentWindow() }。
const getAppWindow = () => {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
};

export const AppTitleBar: FC = memo(() => {
  // 记录窗口是否已最大化，用于切换按钮提示文案
  const [isMaximized, setIsMaximized] = useState(false);

  // 管理员入口只给 role === "admin" 的人看。
  // 这里只是「不给看」，真正的闸门在 Rust 侧（assert_admin）—— 前端隐藏按钮挡不住 invoke。

  const close = useCallback(async () => {
    try {
      const windows = await Window.getAll();
      await Promise.all(windows.map((win) => win.close()));
    } catch {
      // ignore
    }
  }, []);

  const minimize = useCallback(() => {
    getAppWindow()?.minimize().catch(() => {});
  }, []);

  const maximize = useCallback(() => {
    const win = getAppWindow();
    if (!win) return;
    win
      .toggleMaximize()
      .then(() => win.isMaximized().then(setIsMaximized).catch(() => {}))
      .catch(() => {});
  }, []);

  // 同步最大化状态（启动时、以及用户双击标题栏 / 拖拽还原后）
  useEffect(() => {
    const win = getAppWindow();
    if (!win) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;

    const sync = () => {
      win
        .isMaximized()
        .then((v) => {
          if (!disposed) setIsMaximized(v);
        })
        .catch(() => {});
    };

    sync();
    win
      .onResized(sync)
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const { isDark } = useGlobalStore(
    useShallow((store) => ({
      isDark: store.globalSetting.theme === ETheme.dark,
    })),
  );
  const { currentAppId } = useAppStore(
    useShallow((store) => ({
      currentAppId: store.currentAppId,
    })),
  );

  return (
    <header
      data-tauri-drag-region
      onDoubleClick={maximize}
      className={cn(
        "grid h-[40px] w-full grid-cols-[1fr_auto_1fr] items-center",
        "bg-[#2C2C2A] border-b border-[#1A1A1A]"
      )}
    >
      {/*
        左侧：工具按钮 + 版本号
        （原来的「右侧工具条」整体搬到这里，和窗口三连调换位置）
      */}
      <div
        data-tauri-drag-region
        className="flex h-full min-w-0 items-center gap-1 pl-3"
      >
        {/* i18n */}
        <SwitchGlobalI18n />

        {/* theme */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:text-white size-7 text-[#AAA]"
          onClick={() => {
            if (isDark) {
              globalSettingManager.setTheme(ETheme.light);
            } else {
              globalSettingManager.setTheme(ETheme.dark);
            }
          }}
        >
          <ConditionalRender
            condition={isDark}
            fallback={<IconLight className="size-5" size={20} />}
          >
            <IconDark className="size-5" size={20} />
          </ConditionalRender>
        </Button>

        {/* 去后台（CMS） */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a href={import.meta.env.VITE_CMS_URL} target="_blank">
              <Button
                variant="ghost"
                size="icon"
                className="hover:text-white size-7 text-[#AAA]"
              >
                <IconCMS className="size-5" />
              </Button>
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p>去后台</p>
          </TooltipContent>
        </Tooltip>

        <CheckForAppUpdater />

        {/* 「业务员账号管理」入口已移除（2026-10-20 去掉登录）：
            一人一台机器，不再有多账号概念，老板也不需要看别人的数据。 */}

        {/* 仅开发模式：调试面板 + 网页 DevTools */}
        <ConditionalRender condition={isDev}>
          <DebugDialog />

          <Button
            variant="ghost"
            size="icon"
            className="hover:text-white size-7 text-[#AAA]"
            onClick={() => {
              devtools.toggle(currentAppId!);
            }}
          >
            <Bug strokeWidth="1.3" className="size-5" />
          </Button>
        </ConditionalRender>

        <span className="ml-2 whitespace-nowrap text-[#AAA] text-xs">
          v{import.meta.env.VITE_VERSION}
          {!import.meta.env.PROD && `.${import.meta.env.MODE}`}
        </span>
      </div>

      {/* 中间：模式切换（保持居中） */}
      <div
        data-tauri-drag-region
        className="flex items-center justify-center px-4"
      >
        <TitleBarModeSwitcher />
      </div>

      {/*
        右侧：退出登录 + 窗口三连（关闭 / 最小化 / 最大化）
        —— 和左侧工具条调换了位置
      */}
      <div
        data-tauri-drag-region
        className="flex h-full items-center justify-end gap-1 pr-2 text-sm"
      >
        {/* Sign Out */}
        <SignOutPopover>
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-white size-7 text-[#AAA]"
          >
            <IconSignOut className="size-5" size={20} />
          </Button>
        </SignOutPopover>

        {/* 分隔线：把「功能按钮」和「窗口控制」隔开，避免误点关闭 */}
        <div className="mx-1 h-5 w-px shrink-0 bg-white/15" />

        {/*
          窗口控制三连。图标 22px（原来 15px，放大近 50%），
          每颗按钮独立 34x34 可点区域 + 独立 group，onClick 绑在 button 上。
        */}
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={close}
            title="关闭"
            aria-label="关闭"
            className="group flex h-[34px] w-[34px] items-center justify-center rounded-md transition-colors hover:bg-white/15 active:bg-white/25"
          >
            <ImageIcon
              src={IconClose}
              className="block h-[22px] w-[22px] group-hover:hidden"
            />
            <ImageIcon
              src={IconCloseHover}
              className="hidden h-[22px] w-[22px] group-hover:block"
            />
          </button>

          <button
            type="button"
            onClick={minimize}
            title="最小化"
            aria-label="最小化"
            className="group flex h-[34px] w-[34px] items-center justify-center rounded-md transition-colors hover:bg-white/15 active:bg-white/25"
          >
            <ImageIcon
              src={IconMinimize}
              className="block h-[22px] w-[22px] group-hover:hidden"
            />
            <ImageIcon
              src={IconMinimizeHover}
              className="hidden h-[22px] w-[22px] group-hover:block"
            />
          </button>

          <button
            type="button"
            onClick={maximize}
            title={isMaximized ? "还原窗口" : "最大化"}
            aria-label={isMaximized ? "还原窗口" : "最大化"}
            className="group flex h-[34px] w-[34px] items-center justify-center rounded-md transition-colors hover:bg-white/15 active:bg-white/25"
          >
            {/* 最大化后常显「还原」图标（两三角），否则 hover 时才显示 */}
            {isMaximized ? (
              <ImageIcon src={IconMaximizeHover} className="h-[22px] w-[22px]" />
            ) : (
              <>
                <ImageIcon
                  src={IconMaximize}
                  className="block h-[22px] w-[22px] group-hover:hidden"
                />
                <ImageIcon
                  src={IconMaximizeHover}
                  className="hidden h-[22px] w-[22px] group-hover:block"
                />
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
});
