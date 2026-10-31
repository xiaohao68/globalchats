# 全局深色玻璃拟态主题重构设计文档

## 概述

将 Global Chats 应用整体重构为深色极光 + 玻璃拟态风格，与登录页保持一致的视觉体验。

## 设计系统

### 色彩系统

```css
/* 核心背景 */
--gc-bg-primary: #0a0a0f;           /* 深邃黑 */
--gc-bg-secondary: #12121a;          /* 次级背景 */
--gc-surface-1: rgba(255, 255, 255, 0.05);   /* 玻璃底层 */
--gc-surface-2: rgba(255, 255, 255, 0.08);   /* 玻璃中层 */
--gc-surface-3: rgba(255, 255, 255, 0.12);   /* 玻璃高层 */

/* 文字颜色 */
--gc-text-primary: rgba(255, 255, 255, 0.95);
--gc-text-secondary: rgba(255, 255, 255, 0.65);
--gc-text-tertiary: rgba(255, 255, 255, 0.40);

/* 品牌色 */
--gc-brand: #007aff;
--gc-brand-gradient-start: #007aff;
--gc-brand-gradient-end: #5856d6;
--gc-brand-glow: rgba(0, 122, 255, 0.4);

/* 状态色 */
--gc-success: #34c759;
--gc-warning: #ff9500;
--gc-error: #ff3b30;
```

### 玻璃拟态层级

| 层级 | 用途 | 背景 | 模糊 | 边框 |
|------|------|------|------|------|
| L1 | 应用背景 | 极光渐变 | - | - |
| L2 | 标题栏 | surface-2 | blur(20px) | 1px white/10% |
| L3 | 侧边栏 | surface-1 | blur(16px) | 1px white/8% |
| L4 | 主内容区 | surface-1 | blur(12px) | - |
| L5 | 卡片/面板 | surface-2 | blur(20px) | 1px white/10% |
| L6 | 浮动元素 | surface-3 | blur(24px) | 1px white/15% |

### 极光背景

与登录页一致：
- 深色基底 `#0a0a0f`
- 蓝紫色极光渐变
- 60px 高斯模糊
- 噪点纹理层

## 组件设计

### 1. 标题栏 (AppTitleBar)

**样式：**
- 高度：52px
- 背景：`gc-glass` + `backdrop-blur-xl`
- 底部边框：1px 渐变高光
- 左侧：Logo + 品牌名（与登录页一致）
- 右侧：窗口控制按钮（玻璃风格）

**结构：**
```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Global Chats           [多开代理] [聚合聊天] [_][□][X] │
└─────────────────────────────────────────────────────────┘
```

### 2. 侧边栏 (LeftSidebar)

**样式：**
- 宽度：可变 (默认 260px)
- 背景：`surface-1` + `backdrop-blur-lg`
- 边框：右侧 1px `white/8%`
- 内边距：16px

**聊天列表项：**
- 背景：透明
- 悬停：`surface-2` + `backdrop-blur-md`
- 选中：`surface-3` + 左侧品牌色边框指示器
- 圆角：12px

### 3. 主内容区

**多开代理模式：**
- 背景：`surface-1` + 圆角 20px
- WebView 容器：玻璃边框包裹
- 平台标签：玻璃胶囊样式

**聚合聊天模式：**
- 三栏布局全部玻璃化
- 对话列表区：`surface-1`
- 消息区：`surface-2`（中央聚焦区域略深）
- 右侧面板：`surface-1`

### 4. 消息气泡

**收到的消息：**
```css
background: linear-gradient(135deg,
  rgba(255,255,255,0.08) 0%,
  rgba(255,255,255,0.04) 100%);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 18px 18px 18px 4px;
```

**发送的消息：**
```css
background: linear-gradient(135deg,
  var(--gc-brand) 0%,
  #5856d6 100%);
box-shadow: 0 4px 20px rgba(0,122,255,0.25);
border-radius: 18px 18px 4px 18px;
```

### 5. 输入框区域

- 背景：`surface-2` + `backdrop-blur-xl`
- 边框：1px `white/10%`
- 圆角：16px
- 聚焦：品牌色发光边框

### 6. 按钮系统

**主要按钮 (GcMagneticButton)：**
- 已存在，保持使用
- 渐变背景
- 磁性悬停效果

**次要按钮 (GlassButton)：**
- 背景：`surface-2`
- 边框：1px `white/10%`
- 悬停：`surface-3` + 边框高亮

**图标按钮：**
- 尺寸：36px x 36px
- 圆角：10px
- 悬停：背景 `surface-2`

### 7. 输入框

使用现有的 `GcGlassInput`：
- 背景：`surface-1`
- 边框：1px `white/10%`
- 聚焦：品牌色边框 + 微光效果

### 8. 卡片/面板

使用 `GcGlassCard`：
- 多种尺寸变体
- 顶部高光线条
- 悬浮阴影效果

## 动画规范

### 入场动画

```css
/* 淡入上滑 */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 缩放淡入 */
@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 列表项依次入场 */
animation: fade-in-up 0.5s ease-out calc(var(--index) * 0.05s) both;
```

### 交互动画

```css
/* 悬停提升 */
transition: transform 0.2s ease, box-shadow 0.2s ease;
hover: {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

/* 按钮点击 */
active: scale(0.98);

/* 页面切换 */
transition: opacity 0.3s ease;
```

### 背景动画

```css
/* 极光呼吸效果 */
@keyframes aurora-breathe {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
animation: aurora-breathe 8s ease-in-out infinite;
```

## 布局结构

### 全局布局 (AppLayout)

```tsx
<GcAuroraBackground intensity="normal">
  <AppTitleBar />
  <div className="flex h-[calc(100vh-52px)]">
    <LeftSidebar />
    <Main className="gc-glass m-4 rounded-2xl" />
  </div>
</GcAuroraBackground>
```

### 聚合聊天布局

```tsx
<div className="flex h-full">
  {/* 对话列表 */}
  <aside className="w-[280px] gc-glass-l3 border-r border-white/8">
    <ChatSidebar />
  </aside>

  {/* 消息区域 */}
  <main className="flex-1 gc-glass-l4">
    <ConversationView />
  </main>

  {/* 右侧面板 */}
  <aside className="w-[320px] gc-glass-l3 border-l border-white/8">
    <RightPanel />
  </aside>
</div>
```

## 响应式适配

- 侧边栏可折叠为图标模式（宽度 72px）
- 右侧面板在小屏幕可隐藏
- 移动端全屏玻璃面板覆盖

## 实现文件清单

### 需要修改的文件

1. `src/components/layouts/app-layout.tsx` - 全局布局
2. `src/components/layouts/app-titlebar/AppTitleBar.tsx` - 标题栏
3. `src/components/layouts/left-sidebar/LeftSidebar.tsx` - 侧边栏容器
4. `src/components/layouts/main/Main.tsx` - 主内容区
5. `src/modules/aggregated-chat/components/layout/MainLayout.tsx` - 聚合聊天布局
6. `src/modules/aggregated-chat/styles/globals.css` - 聚合聊天样式
7. `src/pages/single-chat/SingleChat.tsx` - 多开代理页面

### 可能需要新增的组件

1. `packages/ui/src/custorm-components/gc-glass-button.tsx` - 玻璃按钮
2. 统一的消息气泡组件

## 技术要点

1. **性能优化**：使用 `will-change: transform` 和 `contain: layout`
2. **可访问性**：保持足够的对比度（WCAG 4.5:1）
3. **跨平台**：macOS/Windows 玻璃效果一致
4. **降级方案**：不支持 backdrop-filter 的浏览器使用纯色背景
