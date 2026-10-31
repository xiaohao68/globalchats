import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import "@gc/ui/styles/globals.css";
import "@/modules/aggregated-chat/styles/globals.css";
import "./styles/glass-theme.css";
import "overlayscrollbars/overlayscrollbars.css";
import { ClickScrollPlugin, OverlayScrollbars } from "overlayscrollbars";
import "@gc/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "@/App.tsx";
import * as Sentry from "@sentry/react";
import { Toaster } from "@gc/ui/components/sonner.tsx";
import { isDev } from "@gc/model";
import { logCollector, mainLogger } from "@gc/logger";
import { ErrorBoundary } from "@/components/ErrorBoundary.tsx";

if (!isDev) {
  Sentry.init({
    dsn: "https://959d19ac063d59ed16302eda7c603df1@o4509418064510976.ingest.us.sentry.io/4509418068705280",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    environment: import.meta.env.MODE,
  });
}

// initApp();
OverlayScrollbars.plugin(ClickScrollPlugin);

// 全局错误拦截
if (!(window as any).__GC_ERROR_HANDLERS__) {
  (window as any).__GC_ERROR_HANDLERS__ = true;

  window.onerror = (message, source, lineno, colno, error) => {
    console.error("[GlobalError]", { message, source, lineno, colno, error });
    mainLogger.error(`Global error: ${message}`, {
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    return false;
  };

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[UnhandledRejection]", event.reason);
    mainLogger.error(`Unhandled rejection: ${event.reason}`, {
      stack: event.reason?.stack,
    });
  });
}

// 启动日志收集器（防止 HMR 重复初始化）
if (!(window as any).__GC_LOG_INITIALIZED__) {
  (window as any).__GC_LOG_INITIALIZED__ = true;
  logCollector.start();
  mainLogger.info("Application started");
}

const queryClient = new QueryClient();

// ------------------------------------------------------------------
// 去掉登录（2026-10-20 老板拍板）
//
// 本产品的最终形态是「一人一台电脑、双击就用」：业务员自己在内嵌网页里
// 登 LinkedIn / Facebook，那些密码由平台自己管，我们存不了也不该存。
// 所以软件本身不再有登录页。
//
// 但 user_id 是 10 张表的外键、也是数据隔离的维度，不能删。
// 做法：Rust 侧固定一个「本机」账号（用户名 local），启动时把它读出来
// 写进 localStorage，之后所有请求照旧带 userId —— 数据链路一行都不用改。
// ------------------------------------------------------------------
async function bootstrap() {
  try {
    const user = (await invoke("ensure_local_user_cmd")) as {
      id?: number;
      username?: string;
    };
    if (typeof user?.id === "number") {
      localStorage.setItem("gc_user", JSON.stringify({ id: user.id, username: user.username ?? "local" }));
    }
  } catch (err) {
    // 拿不到就退回兜底 id=1（Rust 侧 init_db 已经建好账号，正常不会走到这里）
    console.error("[bootstrap] 读取本机账号失败，使用兜底 id=1:", err);
    if (!localStorage.getItem("gc_user")) {
      localStorage.setItem("gc_user", JSON.stringify({ id: 1, username: "local" }));
    }
  }
  // AppLayout 以前靠 gc_token 判断「是否登录」，现在直接置位跳过这道门
  localStorage.setItem("gc_token", "local");

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
          <Toaster position="top-center" offset={{ top: 0 }} richColors />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
