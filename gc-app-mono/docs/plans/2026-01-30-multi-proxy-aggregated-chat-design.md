# 多开代理与聚合聊天基础功能完善设计

> 创建日期: 2026-01-30
> 状态: 待实施

## 1. 需求概述

### 1.1 核心需求

| 项目 | 决策 |
|------|------|
| 多开代理功能 | 只保留代理 + 指纹（移除翻译、客户画像、粉丝统计） |
| 新建会话流程 | 单步弹窗（代理 + 指纹同时配置） |
| 代理配置 | 基础配置（host:port + 协议类型） |
| 代理列表来源 | 服务器获取（query Proxies） |
| 指纹配置 | 混合模式（内置预设 + 手动配置） |
| 模式切换行为 | 隐藏保留（保持会话状态） |
| 弹窗与 WebView | 弹窗时隐藏 WebView 避免遮挡 |

### 1.2 用户故事

1. **新建会话**：用户点击新建会话 → 选择平台 → 弹窗配置代理和指纹 → 创建 WebView
2. **编辑配置**：用户点击会话设置按钮 → 弹窗编辑代理和指纹 → 保存（需重启 WebView 生效）
3. **模式切换**：用户切换到聚合聊天 → 所有多开代理 WebView 隐藏 → 切回来时恢复显示

---

## 2. 架构设计

### 2.1 方案选择

采用**集中式弹窗管理**方案：
- 创建全局 `SessionConfigDialog` 组件
- 通过 Zustand store 管理弹窗状态
- 弹窗打开时自动隐藏当前 WebView，关闭时恢复

### 2.2 新增文件结构

```
apps/global-chat-desktop/src/
├── components/
│   └── dialogs/
│       └── SessionConfigDialog/
│           ├── index.tsx              # 弹窗主组件
│           ├── ProxySection.tsx       # 代理配置区域
│           ├── FingerprintSection.tsx # 指纹配置区域
│           └── types.ts               # 类型定义
├── stores/
│   └── sessionConfigStore.ts          # 弹窗状态管理
├── constants/
│   └── fingerprintPresets.ts          # 指纹预设常量

packages/api/src/
├── gql/query/
│   └── Proxies.graphql                # 代理列表查询
├── api/
│   └── apiProxies.ts                  # 代理列表 API
```

### 2.3 数据流

```
用户点击"新建会话"
    ↓
选择平台（SearchSelector）
    ↓
打开 SessionConfigDialog（同时隐藏当前 WebView）
    ↓
用户选择代理 + 配置指纹
    ↓
点击"创建" → 关闭弹窗 → 创建 WebView
    ↓
WebView 使用配置的代理和指纹启动
```

---

## 3. 详细设计

### 3.1 状态管理 - sessionConfigStore.ts

```typescript
import { create } from 'zustand';
import { EPlatform, EProtocol } from '@gc/model';
import { webviewManager } from '@gc/webview';

interface ProxyConfig {
  proxyId: string;      // 选中的代理 ID（从服务器列表）
  protocol: EProtocol;
  host: string;
  port: string;
}

interface FingerprintConfig {
  presetId: string | null;  // 预设 ID（null 表示自定义）
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
}

interface SessionConfigState {
  // 弹窗状态
  isOpen: boolean;
  mode: 'create' | 'edit';
  editingAppId: string | null;

  // 选中的平台（新建时）
  selectedPlatform: EPlatform | null;

  // 配置
  proxyConfig: ProxyConfig | null;
  fingerprintConfig: FingerprintConfig;

  // Actions
  openForCreate: (platform: EPlatform) => void;
  openForEdit: (appId: string) => void;
  close: () => void;
  setProxyConfig: (config: ProxyConfig | null) => void;
  setFingerprintConfig: (config: Partial<FingerprintConfig>) => void;
  submit: () => Promise<void>;
}

const DEFAULT_FINGERPRINT: FingerprintConfig = {
  presetId: 'chrome-win',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  platform: 'Win32',
  screenWidth: 1920,
  screenHeight: 1080,
};

export const useSessionConfigStore = create<SessionConfigState>((set, get) => ({
  isOpen: false,
  mode: 'create',
  editingAppId: null,
  selectedPlatform: null,
  proxyConfig: null,
  fingerprintConfig: DEFAULT_FINGERPRINT,

  openForCreate: async (platform) => {
    // 隐藏当前 WebView
    await webviewManager.hideCurrentWebview();

    set({
      isOpen: true,
      mode: 'create',
      selectedPlatform: platform,
      editingAppId: null,
      proxyConfig: null,
      fingerprintConfig: DEFAULT_FINGERPRINT,
    });
  },

  openForEdit: async (appId) => {
    // 隐藏当前 WebView
    await webviewManager.hideCurrentWebview();

    // 加载现有配置
    const config = userStore.getThirdAppConfigById(appId);

    set({
      isOpen: true,
      mode: 'edit',
      editingAppId: appId,
      selectedPlatform: config?.platform || null,
      proxyConfig: config?.proxy?.enable ? {
        proxyId: config.proxy.proxyId,
        protocol: config.proxy.protocol,
        host: config.proxy.host,
        port: config.proxy.port,
      } : null,
      fingerprintConfig: config?.fingerprint || DEFAULT_FINGERPRINT,
    });
  },

  close: () => {
    set({ isOpen: false });
    // 恢复之前的 WebView（如果有）
    webviewManager.showLastActiveWebview();
  },

  setProxyConfig: (config) => set({ proxyConfig: config }),

  setFingerprintConfig: (config) => set((state) => ({
    fingerprintConfig: { ...state.fingerprintConfig, ...config },
  })),

  submit: async () => {
    const { mode, selectedPlatform, editingAppId, proxyConfig, fingerprintConfig } = get();

    if (mode === 'create' && selectedPlatform) {
      // 创建新会话
      await webviewManager.create(selectedPlatform, '', {
        proxy: proxyConfig,
        fingerprint: fingerprintConfig,
      });
    } else if (mode === 'edit' && editingAppId) {
      // 更新现有会话配置
      // TODO: 实现配置更新逻辑
    }

    set({ isOpen: false });
  },
}));
```

### 3.2 代理列表 API

```typescript
// packages/api/src/gql/query/Proxies.graphql
query Proxies {
  proxies {
    id
    name
    protocol
    host
    port
  }
}
```

```typescript
// packages/api/src/api/apiProxies.ts
import { gqlClient } from '../apiClient';
import { Proxies } from '../gql';
import { EProtocol } from '@gc/model';

export interface IProxy {
  id: string;
  name: string;
  protocol: EProtocol;
  host: string;
  port: string;
}

export const apiProxies = async (): Promise<IProxy[]> => {
  const { data } = await gqlClient<{ proxies: IProxy[] }>(
    { query: Proxies },
    {},
    { authMode: 'require' }
  );
  return data.data.proxies;
};
```

### 3.3 指纹预设常量

```typescript
// constants/fingerprintPresets.ts
export interface FingerprintPreset {
  id: string;
  name: string;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
}

export const FINGERPRINT_PRESETS: FingerprintPreset[] = [
  {
    id: 'chrome-win',
    name: 'Chrome Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'Win32',
    screenWidth: 1920,
    screenHeight: 1080,
  },
  {
    id: 'chrome-mac',
    name: 'Chrome macOS',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    screenWidth: 1440,
    screenHeight: 900,
  },
  {
    id: 'safari-mac',
    name: 'Safari macOS',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    platform: 'MacIntel',
    screenWidth: 1440,
    screenHeight: 900,
  },
  {
    id: 'edge-win',
    name: 'Edge Windows',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    platform: 'Win32',
    screenWidth: 1920,
    screenHeight: 1080,
  },
  {
    id: 'custom',
    name: '自定义',
    userAgent: '',
    platform: '',
    screenWidth: 1920,
    screenHeight: 1080,
  },
];
```

### 3.4 模式切换 WebView 管理

```typescript
// packages/webview/src/ioc/webviewManger.ts 新增方法

// 新增状态
private lastActiveAppId: string | null = null;

// 隐藏所有多开代理 WebView
async hideAllMultiProxyWebviews(): Promise<void> {
  const apps = Object.values(appStore.appList);
  const visibleApps = apps.filter(
    app => app.status === EAppStatus.show &&
           app.id !== AGGREGATED_CHAT_APP_ID
  );

  // 记录当前活跃的 WebView
  this.lastActiveAppId = appStore.currentAppId;

  // 批量隐藏
  for (const app of visibleApps) {
    await this.hide(app.id);
  }
}

// 显示上次活跃的 WebView
async showLastActiveWebview(): Promise<void> {
  if (this.lastActiveAppId) {
    const app = appStore.getAppById(this.lastActiveAppId);
    if (app && app.status !== EAppStatus.closed) {
      await this.show(this.lastActiveAppId);
      appStore.changeCurrentApp(app);
    }
  }
}

// 隐藏当前 WebView（用于弹窗打开时）
async hideCurrentWebview(): Promise<void> {
  const currentAppId = appStore.currentAppId;
  if (currentAppId) {
    this.lastActiveAppId = currentAppId;
    await this.hide(currentAppId);
  }
}
```

### 3.5 模式切换组件修改

```typescript
// ModeSwitcher.tsx 或 TitleBarModeSwitcher.tsx
const handleModeSwitch = async (newMode: EAppMode) => {
  const currentMode = appStore.appMode;

  if (newMode === currentMode) return;

  if (newMode === EAppMode.AggregatedChat) {
    // 切换到聚合聊天：隐藏所有多开代理 WebView
    await webviewManager.hideAllMultiProxyWebviews();
  } else {
    // 切换到多开代理：恢复之前的 WebView
    await webviewManager.showLastActiveWebview();
  }

  appStore.setAppMode(newMode);
};
```

### 3.6 弹窗 UI 设计

```
┌─────────────────────────────────────────────────────────┐
│ 新建会话 - Telegram                              [×]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ 网络代理 ──────────────────────────────────────────┐ │
│ │                                                     │ │
│ │ 选择代理: [香港节点 ▼]                              │ │
│ │                                                     │ │
│ │ 协议:     [SOCKS5 ▼]                               │ │
│ │ 地址:     [192.168.1.1] : [7890]                   │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ 浏览器指纹 ────────────────────────────────────────┐ │
│ │                                                     │ │
│ │ 预设:     [Chrome Windows ▼]                       │ │
│ │                                                     │ │
│ │ UserAgent: [Mozilla/5.0 (Windows NT 10.0...)    ]  │ │
│ │ 分辨率:    [1920] × [1080]                         │ │
│ │ 平台:      [Win32 ▼]                               │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                              [取消]  [创建会话]         │
└─────────────────────────────────────────────────────────┘
```

### 3.7 多开代理列表项 UI

```
┌─────────────────────────────────────────┐
│ [TG] [👤]  用户名              [⚙️] [×] │
│            📡 香港节点                   │  ← 显示代理名称
└─────────────────────────────────────────┘
```

---

## 4. 实现任务

### P0 - 核心功能

| 任务 | 涉及文件 | 说明 |
|------|----------|------|
| 创建 sessionConfigStore | `stores/sessionConfigStore.ts` | 弹窗状态管理 |
| 创建 SessionConfigDialog | `components/dialogs/SessionConfigDialog/` | 弹窗主组件 |
| 创建 ProxySection | `SessionConfigDialog/ProxySection.tsx` | 代理配置区域 |
| 创建 FingerprintSection | `SessionConfigDialog/FingerprintSection.tsx` | 指纹配置区域 |
| 对接 Proxies API | `packages/api/` | GraphQL 查询 |
| 实现模式切换 WebView 管理 | `webviewManager.ts` | 隐藏/显示逻辑 |
| 修改 ModeSwitcher | `ModeSwitcher.tsx` | 调用新的切换逻辑 |

### P1 - 功能完善

| 任务 | 涉及文件 | 说明 |
|------|----------|------|
| 创建指纹预设常量 | `constants/fingerprintPresets.ts` | 内置预设 |
| 修改 AppList 显示代理信息 | `AppList.tsx` | 列表项新增代理名称 |
| 添加设置按钮 | `AppList.tsx` | 点击打开编辑弹窗 |
| 精简 RightMenuList | `RightMenuList.tsx` | 移除多余功能 |

### P2 - 优化

| 任务 | 涉及文件 | 说明 |
|------|----------|------|
| 弹窗 WebView 同步 Hook | `hooks/useDialogWebviewSync.ts` | 统一管理 |
| 配置变更重启提示 | `SessionConfigDialog/` | 编辑模式提示需重启 |

---

## 5. 注意事项

1. **WebView 层级问题**：Tauri WebView 是原生窗口，会覆盖 React 弹窗，必须在弹窗打开时隐藏 WebView
2. **代理配置生效时机**：代理配置在 WebView 创建时生效，编辑已有会话需要重启 WebView
3. **指纹配置**：需要在 Rust 后端 `create_webview` 时传入 `user_agent` 参数
4. **状态持久化**：代理和指纹配置需要保存到 `userStore` 并同步到 `globalStore`

---

## 6. 相关文档

- [架构概览](../architecture/overview.md)
- [Store 架构](../architecture/store-architecture.md)
- [WebView 管理](../core-technologies-deep-dive.md)
