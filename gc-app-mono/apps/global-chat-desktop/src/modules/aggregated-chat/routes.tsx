import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { ConversationView } from "./components/conversation/ConversationView";
import { ConversationPlaceholder } from "./components/conversation/ConversationPlaceholder";
import { useSyncStore } from "./store/syncStore";

function ChatApp() {
  const { initialLoad, startPolling, stopPolling } = useSyncStore();

  useEffect(() => {
    // 初始加载数据
    initialLoad().then(() => {
      // 加载完成后启动轮询
      startPolling();
    });

    // 组件卸载时停止轮询
    return () => {
      stopPolling();
    };
  }, [initialLoad, startPolling, stopPolling]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<ConversationPlaceholder />} />
        <Route path=":conversationId" element={<ConversationView />} />
      </Route>
    </Routes>
  );
}

export function ChatRoutes() {
  return (
    <BrowserRouter>
      <ChatApp />
    </BrowserRouter>
  );
}
