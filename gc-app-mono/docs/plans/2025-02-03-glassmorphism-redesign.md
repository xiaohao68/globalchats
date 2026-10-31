# 全局深色玻璃拟态主题重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use @superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Global Chats 应用整体重构为深色极光 + 玻璃拟态风格，与登录页保持一致的视觉体验。

**Architecture:** 使用现有的 `GcAuroraBackground`、`GcGlassCard`、`GcMagneticButton`、`GcGlassInput` 组件作为基础，重构全局布局和各个模块的样式。通过 CSS 变量统一管理玻璃拟态层级和颜色系统。

**Tech Stack:** React, TailwindCSS, @gc/ui 组件库, CSS Variables

---

## 前置检查

**Step 1: 验证当前开发环境**

运行: `cd /Users/genki/code/github/gc-app-mono/apps/global-chat-desktop && task dev:all`

Expected: 应用正常启动，可以看到当前的浅色主题界面

**Step 2: 确认依赖组件存在**

检查文件:
- `packages/ui/src/custorm-components/gc-aurora-background.tsx` - 极光背景
- `packages/ui/src/custorm-components/gc-glass-card.tsx` - 玻璃卡片
- `packages/ui/src/custorm-components/gc-magnetic-button.tsx` - 磁性按钮
- `packages/ui/src/custorm-components/gc-glass-input.tsx` - 玻璃输入框

Expected: 所有组件存在且可正常导入

---

## Task 1: 创建全局深色主题 CSS 变量

**Files:**
- Create: `apps/global-chat-desktop/src/styles/glass-theme.css`
- Modify: `apps/global-chat-desktop/src/main.tsx` (导入新样式)

**Step 1: 创建玻璃拟态主题样式文件**

```css
/* apps/global-chat-desktop/src/styles/glass-theme.css */

/* =====================================================
   Global Glassmorphism Theme
   Dark Aurora + Glassmorphism Design System
   ===================================================== */

:root {
  /* Core Background Colors */
  --gc-bg-primary: #0a0a0f;
  --gc-bg-secondary: #12121a;
  --gc-bg-tertiary: #1a1a24;

  /* Glass Surface Levels */
  --gc-surface-1: rgba(255, 255, 255, 0.05);
  --gc-surface-2: rgba(255, 255, 255, 0.08);
  --gc-surface-3: rgba(255, 255, 255, 0.12);
  --gc-surface-4: rgba(255, 255, 255, 0.16);

  /* Text Colors */
  --gc-text-primary: rgba(255, 255, 255, 0.95);
  --gc-text-secondary: rgba(255, 255, 255, 0.65);
  --gc-text-tertiary: rgba(255, 255, 255, 0.40);
  --gc-text-muted: rgba(255, 255, 255, 0.25);

  /* Brand Colors */
  --gc-brand: #007aff;
  --gc-brand-gradient-start: #007aff;
  --gc-brand-gradient-end: #5856d6;
  --gc-brand-glow: rgba(0, 122, 255, 0.4);

  /* Status Colors */
  --gc-success: #34c759;
  --gc-warning: #ff9500;
  --gc-error: #ff3b30;

  /* Border Colors */
  --gc-border-1: rgba(255, 255, 255, 0.08);
  --gc-border-2: rgba(255, 255, 255, 0.12);
  --gc-border-3: rgba(255, 255, 255, 0.16);

  /* Shadows */
  --gc-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --gc-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.3);
  --gc-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  --gc-shadow-glow: 0 0 20px var(--gc-brand-glow);

  /* Transitions */
  --gc-transition-fast: 150ms ease;
  --gc-transition-normal: 250ms ease;
  --gc-transition-slow: 350ms ease;

  /* Border Radius */
  --gc-radius-sm: 8px;
  --gc-radius-md: 12px;
  --gc-radius-lg: 16px;
  --gc-radius-xl: 20px;
  --gc-radius-full: 9999px;
}

/* =====================================================
   Glass Utility Classes
   ===================================================== */

.gc-glass {
  background: var(--gc-surface-2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--gc-border-2);
}

.gc-glass-l1 {
  background: var(--gc-surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--gc-border-1);
}

.gc-glass-l2 {
  background: var(--gc-surface-2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--gc-border-2);
}

.gc-glass-l3 {
  background: var(--gc-surface-3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--gc-border-2);
}

.gc-glass-l4 {
  background: var(--gc-surface-4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--gc-border-3);
}

/* Glass Card with Top Highlight */
.gc-glass-card {
  background: var(--gc-surface-2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--gc-border-2);
  border-radius: var(--gc-radius-lg);
  position: relative;
  overflow: hidden;
}

.gc-glass-card::before {
  content: '';
  position: absolute;
  inset-x: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
}

/* =====================================================
   Animation Keyframes
   ===================================================== */

@keyframes gc-fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gc-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes gc-aurora-breathe {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* =====================================================
   Global Overrides
   ===================================================== */

body {
  background-color: var(--gc-bg-primary);
  color: var(--gc-text-primary);
}

/* Scrollbar Styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--gc-text-muted);
  border-radius: var(--gc-radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--gc-text-tertiary);
}
```

**Step 2: 在 main.tsx 中导入新样式**

修改 `apps/global-chat-desktop/src/main.tsx`:

```tsx
import './styles/glass-theme.css'; // 添加在现有样式导入之后
```

**Step 3: 验证样式加载**

运行: `cd /Users/genki/code/github/gc-app-mono/apps/global-chat-desktop && task dev`

Expected: 应用启动无报错，CSS 变量已定义

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/src/styles/glass-theme.css
git add apps/global-chat-desktop/src/main.tsx
git commit -m "feat(theme): 添加全局深色玻璃拟态主题样式"
```

---

## Task 2: 重构全局布局 (AppLayout)

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/app-layout.tsx`

**Step 1: 重构 AppLayout 组件**

```tsx
import { FC } from "react";
import { AppTitleBar } from "@/components/layouts/app-titlebar/AppTitleBar.tsx";
import { LeftSidebar } from "@/components/layouts/left-sidebar/LeftSidebar.tsx";
import { Main } from "@/components/layouts/main/Main.tsx";
import { EAppMode } from "@gc/model";
import { useAppStore } from "@gc/store";
import { GcAuroraBackground } from "@gc/ui/custorm-components";
import { cn } from "@gc/ui/lib/utils";

export const AppLayout: FC = () => {
  const appMode = useAppStore((s) => s.appMode);
  const isAggregatedChat = appMode === EAppMode.AggregatedChat;

  return (
    <GcAuroraBackground intensity="normal" className="flex flex-col">
      <AppTitleBar />

      <div
        className={cn(
          "flex-1 overflow-hidden",
          isAggregatedChat ? "flex" : "grid grid-cols-[auto_1fr]"
        )}
      >
        {!isAggregatedChat && <LeftSidebar />}
        <Main />
      </div>
    </GcAuroraBackground>
  );
};
```

**Step 2: 验证布局**

运行: `task dev`

Expected: 应用背景变为深色极光效果，标题栏和侧边栏正常显示

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/app-layout.tsx
git commit -m "feat(layout): 重构全局布局添加极光背景"
```

---

## Task 3: 重构标题栏 (AppTitleBar)

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/app-titlebar/AppTitleBar.tsx`

**Step 1: 检查当前标题栏实现**

读取当前文件内容，了解现有结构

**Step 2: 重构为玻璃拟态风格**

```tsx
import { FC } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@gc/ui/lib/utils";
import { useAppStore } from "@gc/store";
import { EAppMode } from "@gc/model";

export const AppTitleBar: FC = () => {
  const { appMode, setAppMode } = useAppStore();

  return (
    <header
      className={cn(
        "h-[52px] flex items-center justify-between px-4",
        "gc-glass-l3 border-b border-[var(--gc-border-2)]"
      )}
    >
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            "bg-gradient-to-br from-[var(--gc-brand)] to-[#5856d6]",
            "shadow-lg shadow-blue-500/30"
          )}
        >
          <MessageCircle className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-[var(--gc-text-primary)]">
          Global Chats
        </span>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-1 rounded-xl bg-[var(--gc-surface-1)] p-1">
        <button
          onClick={() => setAppMode(EAppMode.MultiProxy)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            appMode === EAppMode.MultiProxy
              ? "bg-[var(--gc-surface-3)] text-[var(--gc-text-primary)]"
              : "text-[var(--gc-text-secondary)] hover:text-[var(--gc-text-primary)]"
          )}
        >
          多开代理
        </button>
        <button
          onClick={() => setAppMode(EAppMode.AggregatedChat)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            appMode === EAppMode.AggregatedChat
              ? "bg-[var(--gc-surface-3)] text-[var(--gc-text-primary)]"
              : "text-[var(--gc-text-secondary)] hover:text-[var(--gc-text-primary)]"
          )}
        >
          聚合聊天
        </button>
      </div>

      {/* Window Controls Placeholder */}
      <div className="w-[100px]" />
    </header>
  );
};
```

**Step 3: 验证标题栏**

运行: `task dev`

Expected: 标题栏变为玻璃拟态效果，Logo 和模式切换按钮正常显示

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/app-titlebar/AppTitleBar.tsx
git commit -m "feat(titlebar): 重构标题栏为玻璃拟态风格"
```

---

## Task 4: 重构左侧边栏 (LeftSidebar)

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/left-sidebar/LeftSidebar.tsx`

**Step 1: 重构侧边栏容器**

```tsx
import { FC } from "react";
import { EAppMode } from "@gc/model";
import { MultiProxySidebar } from "@/components/layouts/left-sidebar/MultiProxySidebar.tsx";
import { AggregatedChatSidebar } from "@/components/layouts/left-sidebar/AggregatedChatSidebar.tsx";
import { useAppStore } from "@gc/store";
import { cn } from "@gc/ui/lib/utils";

export const LeftSidebar: FC = () => {
  const appMode = useAppStore((s) => s.appMode);

  return (
    <aside
      className={cn(
        "w-[260px] flex flex-col",
        "gc-glass-l2 border-r border-[var(--gc-border-1)]",
        "py-4 px-3"
      )}
    >
      {appMode === EAppMode.MultiProxy ? (
        <MultiProxySidebar />
      ) : (
        <AggregatedChatSidebar />
      )}
    </aside>
  );
};
```

**Step 2: 验证侧边栏**

运行: `task dev`

Expected: 侧边栏变为玻璃面板，边框和背景正确

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/left-sidebar/LeftSidebar.tsx
git commit -m "feat(sidebar): 重构侧边栏为玻璃面板风格"
```

---

## Task 5: 重构主内容区 (Main)

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/main/Main.tsx`

**Step 1: 重构 Main 组件**

```tsx
import { FC } from "react";
import { Outlet } from "react-router";
import { EAppMode } from "@gc/model";
import { useAppStore, useGlobalStore } from "@gc/store";
import { AggregatedChat } from "@/modules/aggregated-chat";
import { cn } from "@gc/ui/lib/utils";

export const Main: FC = () => {
  const appMode = useAppStore((s) => s.appMode);
  const currentUser = useGlobalStore((state) => {
    const userId = state.currentSignInUserId;
    if (!userId) return null;
    return state.userConfigList[userId]?.userInfo;
  });

  const isAggregatedChat = appMode === EAppMode.AggregatedChat;

  return (
    <main
      className={cn(
        "overflow-hidden",
        "gc-glass-l1 rounded-2xl",
        isAggregatedChat
          ? "m-0 h-full flex-1 rounded-none border-0 bg-transparent"
          : "m-3"
      )}
    >
      {isAggregatedChat ? (
        <AggregatedChat currentUserKey={currentUser?.uin} />
      ) : (
        <Outlet />
      )}
    </main>
  );
};
```

**Step 2: 验证主内容区**

运行: `task dev`

Expected: 主内容区有玻璃效果和圆角，与侧边栏协调

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/main/Main.tsx
git commit -m "feat(main): 重构主内容区为玻璃容器"
```

---

## Task 6: 重构聚合聊天布局

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/components/layout/MainLayout.tsx`

**Step 1: 重构 MainLayout**

```tsx
import { useEffect } from "react";
import { ChatSidebar } from "../sidebar/ChatSidebar";
import { useUIStore } from "../../store/uiStore";
import { useChatStore } from "../../store/chatStore";
import { useSyncStore } from "../../store/syncStore";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { TopNoticeBar } from "../common/TopNoticeBar";
import { ConversationView } from "../conversation/ConversationView";
import { ConversationPlaceholder } from "../conversation/ConversationPlaceholder";
import { RightPanel, RightPanelToggle } from "../right-panel";
import { cn } from "@gc/ui/lib/utils";

export function MainLayout() {
  const { selectedConversationId } = useUIStore();
  const { status: networkStatus, justReconnected } = useNetworkStatus();
  const {
    accountsState,
    conversationsState,
    accountsError,
    conversationsError,
    refreshAll,
  } = useChatStore();
  const { error: syncError, poll, isPolling } = useSyncStore();

  const isSyncing =
    accountsState === "loading" ||
    conversationsState === "loading" ||
    isPolling;
  const combinedError = syncError || accountsError || conversationsError;

  useEffect(() => {
    if (!justReconnected) return;
    void refreshAll({ conversationId: selectedConversationId });
  }, [justReconnected, refreshAll, selectedConversationId]);

  const handleRetrySync = () => {
    if (syncError) {
      void poll();
    } else {
      void refreshAll({ conversationId: null });
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <TopNoticeBar
        networkStatus={networkStatus}
        isSyncing={isSyncing}
        syncError={combinedError}
        onRetrySync={handleRetrySync}
      />
      <div className="flex min-h-0 flex-1">
        {/* 左侧对话列表 */}
        <aside
          className={cn(
            "w-[280px] flex-shrink-0",
            "gc-glass-l2 border-r border-[var(--gc-border-1)]"
          )}
        >
          <ChatSidebar />
        </aside>

        {/* 中央消息区域 */}
        <main
          className={cn(
            "flex-1 overflow-hidden",
            "gc-glass-l1"
          )}
        >
          {selectedConversationId ? (
            <ConversationView />
          ) : (
            <ConversationPlaceholder />
          )}
        </main>

        {/* 右侧面板 */}
        <aside
          className={cn(
            "w-[320px] flex-shrink-0",
            "gc-glass-l2 border-l border-[var(--gc-border-1)]"
          )}
        >
          <RightPanel />
        </aside>
      </div>
      <RightPanelToggle />
    </div>
  );
}
```

**Step 2: 验证聚合聊天布局**

运行: `task dev`，切换到聚合聊天模式

Expected: 三栏布局都有玻璃效果，层次分明

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/layout/MainLayout.tsx
git commit -m "feat(aggregated-chat): 重构三栏布局为玻璃拟态风格"
```

---

## Task 7: 重构消息气泡样式

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/components/message/MessageItem.tsx`
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/styles/enhancements.css`

**Step 1: 添加消息气泡样式到 enhancements.css**

```css
/* Message Bubble Styles */

/* 收到的消息 - 玻璃拟态 */
.gc-message-received {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px 18px 18px 4px;
  color: var(--gc-text-primary);
}

/* 发送的消息 - 品牌渐变 */
.gc-message-sent {
  background: linear-gradient(
    135deg,
    var(--gc-brand) 0%,
    #5856d6 100%
  );
  box-shadow: 0 4px 20px rgba(0, 122, 255, 0.25);
  border-radius: 18px 18px 4px 18px;
  color: white;
}

/* 消息悬停效果 */
.gc-message-received:hover,
.gc-message-sent:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}
```

**Step 2: 更新 MessageItem 组件使用新样式**

检查并修改 MessageItem 组件，应用新的 CSS 类

**Step 3: 验证消息气泡**

运行: `task dev`

Expected: 收到的消息为玻璃效果，发送的消息为品牌渐变

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/styles/enhancements.css
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/message/MessageItem.tsx
git commit -m "feat(message): 重构消息气泡为深色渐变风格"
```

---

## Task 8: 重构输入框区域

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/components/message/MessageInput.tsx`

**Step 1: 重构 MessageInput 组件**

使用 `GcGlassInput` 组件并添加玻璃容器样式

```tsx
// 添加玻璃容器包裹输入框
<div className={cn(
  "flex items-center gap-2 p-3 mx-4 mb-4",
  "gc-glass-l3 rounded-2xl"
)}>
  <GcGlassInput
    // ... 现有属性
    className="flex-1 bg-transparent border-0"
  />
  {/* 发送按钮 */}
</div>
```

**Step 2: 验证输入框**

运行: `task dev`

Expected: 输入框区域为玻璃效果，与整体风格协调

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/message/MessageInput.tsx
git commit -m "feat(input): 重构消息输入框为玻璃样式"
```

---

## Task 9: 重构多开代理页面

**Files:**
- Modify: `apps/global-chat-desktop/src/pages/single-chat/SingleChat.tsx`

**Step 1: 重构 SingleChat 组件**

```tsx
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
```

**Step 2: 验证多开代理页面**

运行: `task dev`，切换到多开代理模式

Expected: 页面有玻璃背景效果

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/pages/single-chat/SingleChat.tsx
git commit -m "feat(single-chat): 重构多开代理页面为玻璃风格"
```

---

## Task 10: 更新聚合聊天全局样式

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/styles/globals.css`

**Step 1: 更新颜色变量**

将现有的浅色 Apple Design System 颜色更新为深色玻璃主题

```css
:root {
  /* 覆盖为深色主题 */
  --color-bg-primary: var(--gc-bg-primary);
  --color-bg-secondary: var(--gc-bg-secondary);
  --color-bg-sidebar: var(--gc-surface-1);
  --color-bg-hover: var(--gc-surface-2);
  --color-bg-selected: rgba(0, 122, 255, 0.15);

  --color-text-primary: var(--gc-text-primary);
  --color-text-secondary: var(--gc-text-secondary);
  --color-text-tertiary: var(--gc-text-tertiary);

  --color-accent: var(--gc-brand);
  --color-accent-hover: #0066d6;

  --color-border: var(--gc-border-1);
  --color-divider: var(--gc-border-2);
}
```

**Step 2: 验证样式**

运行: `task dev`

Expected: 聚合聊天所有元素使用新的深色主题色

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/styles/globals.css
git commit -m "feat(theme): 更新聚合聊天样式为深色玻璃主题"
```

---

## Task 11: 最终验证和测试

**Step 1: 完整功能测试**

1. 启动应用: `task dev:all`
2. 验证登录页到主应用的过渡
3. 测试多开代理模式
4. 测试聚合聊天模式
5. 验证消息发送/接收
6. 检查所有交互元素

**Step 2: 视觉检查清单**

- [ ] 极光背景正常显示
- [ ] 标题栏玻璃效果
- [ ] 侧边栏玻璃面板
- [ ] 主内容区玻璃容器
- [ ] 消息气泡样式正确
- [ ] 输入框玻璃效果
- [ ] 所有文字清晰可读
- [ ] 悬停/点击交互正常

**Step 3: Commit 所有剩余变更**

```bash
git add -A
git commit -m "feat(ui): 完成全局深色玻璃拟态主题重构"
```

---

## 实施完成

重构完成后，应用将拥有：
- 统一的深色极光背景
- 全玻璃拟态设计语言
- 与登录页一致的视觉体验
- 更好的视觉层次和深度感
