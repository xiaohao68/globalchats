# 聚合聊天布局重构实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将聚合聊天从两栏布局重构为三栏布局，新增可折叠的右侧功能面板（CRM/翻译）

**Architecture:**
- 复用主应用现有的 `RightSidebar`、`CRMPanel`、`TranslatePanel` 组件
- 在 `uiStore` 中新增 `isRightPanelOpen` 和 `rightPanelActiveTab` 状态
- 新增 `RightPanelToggle` 气泡组件用于折叠时展开面板

**Tech Stack:** React 19, Zustand, TailwindCSS, lucide-react

---

## Task 1: 扩展 uiStore 状态

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/store/uiStore.ts`

**Step 1: 添加右侧面板状态类型和默认值**

在 `UIState` 接口中添加：

```typescript
type RightPanelTab = 'crm' | 'translate';

interface UIState {
  // ... 现有状态

  // 右侧面板状态
  isRightPanelOpen: boolean;
  rightPanelActiveTab: RightPanelTab;

  // Actions
  // ... 现有 actions
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  setRightPanelActiveTab: (tab: RightPanelTab) => void;
}
```

**Step 2: 实现状态和 actions**

在 store 实现中添加：

```typescript
// 初始状态
isRightPanelOpen: true,
rightPanelActiveTab: 'translate',

// Actions
setRightPanelOpen: (open) => {
  set({ isRightPanelOpen: open });
},

toggleRightPanel: () => {
  set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen }));
},

setRightPanelActiveTab: (tab) => {
  set({ rightPanelActiveTab: tab });
},
```

**Step 3: 添加持久化字段**

在 `partialize` 中添加：

```typescript
partialize: (state) => ({
  collapsedSections: state.collapsedSections,
  pinnedConversationIds: state.pinnedConversationIds,
  isRightPanelOpen: state.isRightPanelOpen,
  rightPanelActiveTab: state.rightPanelActiveTab,
}),
```

**Step 4: 验证**

运行开发服务器确认无类型错误：
```bash
cd apps/global-chat-desktop && bun run dev:renderer
```

**Step 5: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/store/uiStore.ts
git commit -m "feat(aggregated-chat): 添加右侧面板状态到 uiStore"
```

---

## Task 2: 创建 RightPanelToggle 气泡组件

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/RightPanelToggle.tsx`

**Step 1: 创建气泡组件**

```tsx
import { Languages } from "lucide-react";
import { useUIStore } from "../../store/uiStore";

export function RightPanelToggle() {
  const { isRightPanelOpen, toggleRightPanel } = useUIStore();

  if (isRightPanelOpen) {
    return null;
  }

  return (
    <button
      onClick={toggleRightPanel}
      className="fixed right-4 top-12 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-lg transition-transform hover:scale-105"
      title="展开翻译面板"
    >
      <Languages size={20} />
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/RightPanelToggle.tsx
git commit -m "feat(aggregated-chat): 创建 RightPanelToggle 气泡组件"
```

---

## Task 3: 创建 RightPanel 面板组件

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/RightPanel.tsx`

**Step 1: 创建面板组件**

```tsx
import { Users, Languages, X } from "lucide-react";
import { cn } from "@gc/ui/lib/utils";
import { useUIStore } from "../../store/uiStore";
import { CrmTab } from "./tabs/CrmTab";
import { TranslateTab } from "./tabs/TranslateTab";

export function RightPanel() {
  const {
    isRightPanelOpen,
    rightPanelActiveTab,
    setRightPanelOpen,
    setRightPanelActiveTab,
  } = useUIStore();

  if (!isRightPanelOpen) {
    return null;
  }

  return (
    <aside className="flex h-full w-[280px] flex-shrink-0 flex-col border-l border-[var(--color-divider)] bg-[var(--color-bg-sidebar)]">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] px-3 py-2">
        <div className="flex gap-1">
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              rightPanelActiveTab === "crm"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            )}
            onClick={() => setRightPanelActiveTab("crm")}
          >
            <Users size={14} />
            <span>CRM</span>
          </button>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              rightPanelActiveTab === "translate"
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            )}
            onClick={() => setRightPanelActiveTab("translate")}
          >
            <Languages size={14} />
            <span>翻译</span>
          </button>
        </div>
        <button
          className="rounded-md p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          onClick={() => setRightPanelOpen(false)}
          title="折叠面板"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rightPanelActiveTab === "crm" ? <CrmTab /> : <TranslateTab />}
      </div>
    </aside>
  );
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/RightPanel.tsx
git commit -m "feat(aggregated-chat): 创建 RightPanel 面板组件"
```

---

## Task 4: 创建 CrmTab 组件

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/tabs/CrmTab.tsx`

**Step 1: 创建 CRM Tab 组件（复用现有样式）**

```tsx
export function CrmTab() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          客户信息
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          选择对话后显示客户详情
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            昵称
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            电话
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            备注
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            标签
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/tabs/CrmTab.tsx
git commit -m "feat(aggregated-chat): 创建 CrmTab 组件"
```

---

## Task 5: 创建 TranslateTab 组件

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/tabs/TranslateTab.tsx`

**Step 1: 创建翻译 Tab 组件（复用现有样式）**

```tsx
export function TranslateTab() {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          翻译设置
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          配置消息翻译选项
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-primary)]">
              接收消息翻译
            </span>
            <div className="h-5 w-9 rounded-full bg-[var(--color-accent)]" />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            自动翻译收到的消息
          </p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-primary)]">
              发送消息翻译
            </span>
            <div className="h-5 w-9 rounded-full bg-[var(--color-bg-hover)]" />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            发送前翻译消息
          </p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            目标语言
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">简体中文</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/tabs/TranslateTab.tsx
git commit -m "feat(aggregated-chat): 创建 TranslateTab 组件"
```

---

## Task 6: 创建 right-panel 导出文件

**Files:**
- Create: `apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/index.ts`

**Step 1: 创建导出文件**

```typescript
export { RightPanel } from "./RightPanel";
export { RightPanelToggle } from "./RightPanelToggle";
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/right-panel/index.ts
git commit -m "feat(aggregated-chat): 创建 right-panel 导出文件"
```

---

## Task 7: 修改 MainLayout 为三栏布局

**Files:**
- Modify: `apps/global-chat-desktop/src/modules/aggregated-chat/components/layout/MainLayout.tsx`

**Step 1: 导入新组件**

在文件顶部添加导入：

```typescript
import { RightPanel, RightPanelToggle } from "../right-panel";
```

**Step 2: 修改布局结构**

将 return 语句中的布局修改为：

```tsx
return (
  <div className="flex h-screen w-screen flex-col bg-[var(--color-bg-primary)]">
    <TopNoticeBar
      networkStatus={networkStatus}
      isSyncing={isSyncing}
      syncError={combinedError}
      onRetrySync={handleRetrySync}
    />
    <div className="flex min-h-0 flex-1">
      <aside className="w-[280px] flex-shrink-0 border-r border-[var(--color-divider)] bg-[var(--color-bg-sidebar)]">
        <ChatSidebar />
      </aside>
      <main className="flex-1 overflow-hidden bg-[var(--color-bg-primary)]">
        {selectedConversationId ? (
          <ConversationView />
        ) : (
          <ConversationPlaceholder />
        )}
      </main>
      <RightPanel />
    </div>
    <RightPanelToggle />
  </div>
);
```

**Step 3: 验证**

运行开发服务器确认布局正确：
```bash
cd apps/global-chat-desktop && bun run dev:renderer
```

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/src/modules/aggregated-chat/components/layout/MainLayout.tsx
git commit -m "feat(aggregated-chat): 重构 MainLayout 为三栏布局"
```

---

## Task 8: 验证和测试

**Step 1: 启动完整应用**

```bash
cd apps/global-chat-desktop && task dev
```

**Step 2: 验证功能**

- [ ] 三栏布局正确显示
- [ ] 右侧面板默认展开
- [ ] 点击 X 按钮可折叠面板
- [ ] 折叠后右上角显示气泡开关
- [ ] 点击气泡可展开面板
- [ ] CRM/翻译 Tab 切换正常
- [ ] 刷新后状态保持（持久化）

**Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat(aggregated-chat): 完成三栏布局重构"
```

---

## 文件清单

### 新建文件
| 文件 | 职责 |
|------|------|
| `components/right-panel/RightPanel.tsx` | 右侧面板容器 |
| `components/right-panel/RightPanelToggle.tsx` | 气泡开关 |
| `components/right-panel/tabs/CrmTab.tsx` | CRM 表单 |
| `components/right-panel/tabs/TranslateTab.tsx` | 翻译设置 |
| `components/right-panel/index.ts` | 导出文件 |

### 修改文件
| 文件 | 修改内容 |
|------|---------|
| `store/uiStore.ts` | 新增右侧面板状态 |
| `components/layout/MainLayout.tsx` | 三栏布局 |
