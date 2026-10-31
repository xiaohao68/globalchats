# 退出按钮移至 TitleBar 右上角实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将退出登录功能从左侧边栏底部移至右上角图标区域

**Architecture:** 复用现有的 `SignOutPopover` 组件，将其触发器从 LeftSidebar 移至 AppTitleBar 的右侧图标区域，保持确认弹窗交互不变

**Tech Stack:** React, TypeScript, TailwindCSS, shadcn/ui

---

## Task 1: 从 LeftSidebar 移除退出按钮

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/left-sidebar/LeftSidebar.tsx`

**Step 1: 删除退出按钮相关代码**

删除第 1-9 行中未使用的导入：
- `cn` from "@gc/lib/utils.ts"
- `EAppMode` from "@gc/model"
- `defaultTransition` from "@gc/utils"
- `IconSignOut` from "@/components/icons"
- `SignOutPopover` from "@/components/popover/SignOutPopover.tsx"

保留：
- `MultiProxySidebar` 和 `AggregatedChatSidebar` 的导入
- `useAppStore` 的导入

删除第 22-49 行的退出按钮 JSX：
```tsx
<div className="grid grid-cols-1 grid-rows-1 gap-[8px] pt-2">
  <div className="h-[44px] pl-[24px]">
    <div className={cn("group h-full w-full cursor-pointer select-none")}>
      <SignOutPopover>
        <div
          className={cn(
            "flex h-full w-full rounded-xl",
            "text-sm",
            "group-active:bg-[url('/src/assets/icons/nav_bg_active.svg')] group-active:text-white",
            "group-hover:bg-primary/10 group-hover:text-primary",
            defaultTransition,
          )}
        >
          <div className="flex flex-1 items-center gap-[10px] pl-[20px]">
            <IconSignOut
              size={18}
              className={cn(
                "m-[1px] text-[#5C5F66] group-active:text-white",
                defaultTransition,
              )}
            />
            <span>退出</span>
          </div>
        </div>
      </SignOutPopover>
    </div>
  </div>
</div>
```

**Step 2: 简化组件结构**

修改后的 LeftSidebar 应该只返回：
```tsx
export const LeftSidebar: FC = () => {
  const appMode = useAppStore((s) => s.appMode);

  return (
    <div className="flex h-full w-[230px] flex-col pt-[26px] pb-[20px]">
      {appMode === EAppMode.MultiProxy ? (
        <MultiProxySidebar />
      ) : (
        <AggregatedChatSidebar />
      )}
    </div>
  );
};
```

**Step 3: 验证编译**

Run: `cd apps/global-chat-desktop && bun run typecheck`
Expected: 无错误

**Step 4: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/left-sidebar/LeftSidebar.tsx
git commit -m "refactor(left-sidebar): 移除退出按钮，准备移至 titlebar"
```

---

## Task 2: 在 AppTitleBar 添加退出按钮

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/app-titlebar/AppTitleBar.tsx`

**Step 1: 添加导入语句**

在第 26 行之后添加：
```tsx
import { SignOutPopover } from "@/components/popover/SignOutPopover.tsx";
import { IconSignOut } from "@/components/icons";
```

**Step 2: 在右侧图标区域添加退出按钮**

在第 147 行（`</ConditionalRender>` 结束标签）之前添加：

```tsx
        {/* Sign Out */}
        <SignOutPopover>
          <Button
            variant="ghost"
            size="icon"
            className="hover:text-primary size-7"
          >
            <IconSignOut className="size-5" size={20} />
          </Button>
        </SignOutPopover>
```

**Step 3: 验证编译**

Run: `cd apps/global-chat-desktop && bun run typecheck`
Expected: 无错误

**Step 4: 手动测试**

Run: `cd apps/global-chat-desktop && task dev:all`
Expected:
1. 左侧边栏底部不再显示"退出"按钮
2. 右上角出现退出图标按钮（在最右侧）
3. 点击退出按钮弹出确认对话框
4. 确认后正常退出到登录页

**Step 5: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/app-titlebar/AppTitleBar.tsx
git commit -m "feat(titlebar): 在右上角添加退出登录按钮"
```

---

## 完成总结

改动内容：
1. LeftSidebar.tsx - 移除退出按钮代码，简化组件
2. AppTitleBar.tsx - 在右上角图标区域添加退出按钮

UI 变化：
- 退出功能从左侧边栏底部移至右上角图标区域
- 与其他功能图标（主题切换、CMS、更新检查）保持一致的风格
- 保留原有的确认弹窗交互
