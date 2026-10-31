# Global Chats UI 重构设计文档

**设计方案：** 沉浸式玻璃空间（Immersive Glass Space）
**日期：** 2025-02-03
**范围：** 登录页 → 全应用逐步推进
**风格关键词：** 玻璃拟态、活力色彩、微交互

---

## 1. 设计概览

### 1.1 设计哲学

将 Global Chats 打造成一个**现代、精致且富有生命力**的桌面应用。通过深度玻璃层次、动态极光渐变和细腻微交互，创造令人难忘的视觉体验。

### 1.2 核心特征

| 特征 | 设计决策 | 用户体验价值 |
|------|---------|-------------|
| **玻璃拟态** | 多层半透明表面 + backdrop-blur | 创造空间深度，内容层次分明 |
| **活力色彩** | 动态极光渐变 + 品牌蓝强调 | 现代感、品牌识别度高 |
| **微交互** | 磁性按钮、光晕脉冲、变形过渡 | 愉悦感、专业品质感 |

### 1.3 设计原则

1. **内容优先** — 玻璃效果服务于内容展示，不喧宾夺主
2. **渐进增强** — 核心功能在无动画时依然可用
3. **一致性** — 新设计语言应用于全应用，保持统一
4. **性能优先** — 动画使用 GPU 加速，支持减少动画偏好

### 1.4 ⚠️ 强制规范（不可违反）

**禁止直接修改** `/packages/ui/src/components/*` 下的 shadcn/ui 官方组件。

所有自定义组件必须在 `packages/ui/src/custorm-components/` 中创建，以保持 shadcn/ui 的可更新性。

---

## 2. 视觉设计系统

### 2.1 色彩系统

#### 基础色调（暗色模式 - 默认）

```css
/* 背景层级 */
--color-background: #000000;
--color-surface-1: rgba(255, 255, 255, 0.08);
--color-surface-2: rgba(255, 255, 255, 0.12);
--color-surface-3: rgba(255, 255, 255, 0.16);

/* 极光渐变 */
--gradient-aurora: linear-gradient(
  135deg,
  #667eea 0%,
  #764ba2 25%,
  #f093fb 50%,
  #f5576c 75%,
  #4facfe 100%
);

/* 品牌色 */
--color-brand: #007aff;
--color-brand-glow: rgba(0, 122, 255, 0.4);

/* 文字层级 */
--text-primary: rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.7);
--text-tertiary: rgba(255, 255, 255, 0.5);
```

#### 亮色模式适配

```css
@media (prefers-color-scheme: light) {
  --color-background: #f5f5f7;
  --color-surface-1: rgba(255, 255, 255, 0.7);
  --color-surface-2: rgba(255, 255, 255, 0.85);
  --color-surface-3: rgba(255, 255, 255, 0.95);

  --text-primary: rgba(0, 0, 0, 0.9);
  --text-secondary: rgba(0, 0, 0, 0.6);
  --text-tertiary: rgba(0, 0, 0, 0.4);

  /* 极光渐变降低饱和度 */
  --gradient-aurora: linear-gradient(
    135deg,
    #a8c0ff 0%,
    #3f2b96 25%,
    #e0c3fc 50%,
    #ff9a9e 75%,
    #a1c4fd 100%
  );
}
```

### 2.2 玻璃拟态规范

```css
/* 基础玻璃卡片 */
.glass-card {
  background: var(--color-surface-1);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 悬停状态 */
.glass-card-hover:hover {
  background: var(--color-surface-2);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
```

### 2.3 动效规范

```css
/* 缓动函数 */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-apple: cubic-bezier(0.25, 0.1, 0.25, 1);

/* 持续时间 */
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-ambient: 8000ms;  /* 背景动画循环 */
```

---

## 3. 登录页面设计

### 3.1 页面架构

```
SignInPage（全屏容器）
├── AuroraBackground      # 极光动态背景层
│   ├── GradientOrbital   # 缓慢旋转的渐变光球
│   └── NoiseTexture      # 微妙噪点纹理
├── GlassContainer        # 居中的玻璃卡片容器
│   ├── BrandSection      # 品牌区域
│   │   ├── LogoMark      # 动态Logo图标
│   │   ├── BrandName     # "Global Chats"
│   │   └── Tagline       # "统一社交，无限连接"
│   ├── SignInForm        # 登录表单
│   │   ├── PlatformSelector  # 平台选择器
│   │   ├── PhoneInput    # 手机号输入
│   │   ├── CodeInput     # 验证码输入
│   │   └── SubmitButton  # 磁性按钮
│   └── FooterLinks       # 底部链接
└── ParallaxLayer         # 视差浮动元素层
```

### 3.2 核心组件规格

#### GlassContainer

| 属性 | 值 |
|------|-----|
| 尺寸 | 480px × auto（自适应高度）|
| 圆角 | 28px |
| 内边距 | 48px |
| 背景 | rgba(255,255,255,0.08) |
| 模糊 | blur(24px) saturate(180%) |
| 边框 | 1px solid rgba(255,255,255,0.12) |
| 阴影 | 0 8px 32px rgba(0,0,0,0.3) |

#### PlatformSelector（平台选择器）

- **布局：** 2×4 网格，间距 16px
- **图标尺寸：** 56px 圆形
- **状态样式：**
  - 未选中：opacity 0.5，scale 0.95
  - 悬停：opacity 0.8，scale 1.02，drop-shadow 光晕
  - 选中：opacity 1，scale 1.05，品牌色边框发光
- **微交互：** 切换时弹性弹跳动画（300ms，ease-bounce）

#### PhoneInput（玻璃输入框）

```css
.phone-input-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px 20px;
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.phone-input-glass:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.5);
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.15);
  animation: input-glow-pulse 400ms ease-out;
}
```

#### MagneticButton（磁性按钮）

- **尺寸：** 全宽，高度 56px
- **背景：** 线性渐变（#007aff → #5856d6）
- **圆角：** 16px
- **磁性效果：** 鼠标在按钮范围内移动时，按钮轻微跟随（最大位移 8px）
- **悬停：** 背景渐变流动，按钮上浮 2px
- **点击：** scale 0.98，模拟按压感

### 3.3 动画序列

#### 入场动画（页面加载）

| 时间 | 元素 | 动画 | 时长 | 缓动 |
|------|------|------|------|------|
| 0ms | AuroraBackground | opacity 0→1 | 800ms | ease-smooth |
| 200ms | GlassContainer | y: 40→0, opacity 0→1 | 600ms | ease-bounce |
| 400ms | LogoMark | scale 0.8→1 | 500ms | elastic |
| 500ms | BrandName/Tagline | y: 20→0, opacity 0→1 | 400ms | ease-smooth |
| 600ms | PlatformSelector | stagger 逐个入场 | 各 300ms | ease-bounce |
| 900ms | Form 输入框 | opacity 0→1 | 400ms | ease-smooth |
| 1000ms | FooterLinks | opacity 0→1 | 300ms | ease-smooth |

#### 登录成功过渡

```
0ms     GlassContainer 轻微放大（scale 1→1.02, 200ms）
200ms   内容快速淡出（opacity 1→0, 150ms）
350ms   容器收缩为圆形（border-radius 28px→50%, 400ms）
400ms   圆形开始旋转并缩小（scale 1→0, 400ms）
600ms   屏幕闪光效果（白色遮罩 opacity 0→0.3→0, 300ms）
800ms   主应用界面从中心展开（scale 0.9→1, opacity 0→1, 600ms）
1200ms  过渡完成
```

---

## 4. 全应用扩展规划

### 4.1 重构优先级

1. **登录页**（当前设计）— 确立设计语言
2. **左侧边栏导航** — 统一导航体验
3. **聚合聊天模块** — 核心功能区域
4. **设置/配置页面** — 剩余页面覆盖

### 4.2 可复用组件清单

| 组件 | 来源 | 适用场景 |
|------|------|---------|
| `GlassCard` | 登录页 GlassContainer | 所有卡片容器 |
| `GlassInput` | 登录页 PhoneInput | 所有表单输入 |
| `MagneticButton` | 登录页 SubmitButton | 所有主要操作按钮 |
| `AuroraBackground` | 登录页背景 | 欢迎页、空状态页 |
| `PlatformIcon` | 平台选择器 | 所有平台标识场景 |
| `AnimatedContainer` | 入场动画逻辑 | 页面切换、模块加载 |

### 4.3 聚合聊天模块适配

#### 当前问题
- 独立样式系统与主应用不一致
- 亮色模式支持不完整

#### 适配方案
- 保留现有布局结构（三栏布局）
- 替换颜色为新的玻璃拟态令牌
- 添加 Aurora 风格的聊天背景选项
- 统一消息气泡样式为玻璃拟态

---

## 5. 技术实现指南

### 5.1 技术栈

- **样式：** Tailwind CSS 4.x + CSS 变量
- **动画：** CSS @keyframes（优先）+ Framer Motion（复杂序列）
- **图标：** Lucide React + 自定义平台图标
- **状态：** Zustand

### 5.2 组件修改规范（重要）

**禁止直接修改** `/packages/ui/src/components/*` 下的 shadcn/ui 官方组件。

**正确的自定义方式：**
1. 复制需要修改的组件到 `packages/ui/src/custorm-components/`
2. 重命名为 `gc-[component].tsx`（如 `gc-button.tsx`）
3. 在该目录下进行自定义修改
4. 在 `packages/ui/src/custorm-components/index.ts` 中导出

**示例：**
```typescript
// 错误做法 ❌
// 直接修改 packages/ui/src/components/button.tsx

// 正确做法 ✅
// 1. 复制为 packages/ui/src/custorm-components/gc-button.tsx
// 2. 添加玻璃拟态样式
// 3. 导出使用
```

**本项目已有的自定义组件参考：**
- `GcButton.tsx` — 自定义按钮变体
- `GcSurface.tsx` — 玻璃态卡片容器
- 共 12 个自定义组件

### 5.2 性能优化

```css
/* GPU 加速 */
.animated-element {
  will-change: transform, opacity;
  transform: translateZ(0);
}

/* 减少动画偏好支持 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.3 浏览器兼容性

- `backdrop-filter`：使用 `-webkit-` 前缀确保 Safari 兼容
- `@supports` 检测：为不支持 backdrop-filter 的浏览器提供纯色回退

```css
@supports not (backdrop-filter: blur(20px)) {
  .glass-card {
    background: rgba(30, 30, 30, 0.95);
  }
}
```

---

## 6. 文件结构建议

```
apps/global-chat-desktop/src/
├── design-system/              # 新增：设计系统目录
│   ├── tokens/
│   │   ├── colors.css          # 色彩变量
│   │   ├── typography.css      # 字体规范
│   │   └── animations.css      # 动画关键帧
│   ├── components/
│   │   ├── glass-card.tsx
│   │   ├── glass-input.tsx
│   │   ├── magnetic-button.tsx
│   │   └── animated-container.tsx
│   └── effects/
│       ├── aurora-background.tsx
│       └── noise-texture.tsx
├── pages/sign-in/
│   └── SignInPage.tsx          # 重构后的登录页
└── ...
```

---

## 7. 验收标准

### 7.1 视觉标准

- [ ] 玻璃拟态效果在 macOS/Windows 上表现一致
- [ ] 极光背景动画流畅（60fps）
- [ ] 暗色/亮色模式切换无缝
- [ ] 所有状态（悬停、聚焦、禁用）样式完整

### 7.2 交互标准

- [ ] 入场动画按序列正确播放
- [ ] 磁性按钮跟随鼠标自然流畅
- [ ] 输入框聚焦光晕效果可见
- [ ] 登录成功过渡动画完整

### 7.3 性能标准

- [ ] 首屏加载时间 < 2s
- [ ] 动画帧率稳定在 60fps
- [ ] 内存占用无明显增长
- [ ] 支持 `prefers-reduced-motion`

---

## 8. 附录

### 8.1 参考资料

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Glassmorphism CSS Generator](https://ui.glass/)
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/docs/v4-beta)

### 8.2 设计迭代记录

| 日期 | 变更 | 原因 |
|------|------|------|
| 2025-02-03 | 初始设计文档 | 方案 A（沉浸式玻璃空间）获选 |

---

**下一步行动：**

1. 创建 `design-system/` 目录结构
2. 实现基础玻璃组件（GlassCard、GlassInput）
3. 重构登录页
4. 验证设计效果并迭代

