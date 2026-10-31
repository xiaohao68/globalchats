# 多开代理与聚合聊天功能完善 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善多开代理和聚合聊天的基础功能，包括新建会话弹窗、模式切换 WebView 管理、代理列表对接等。

**Architecture:** 采用集中式弹窗管理方案，创建 `sessionConfigStore` 管理弹窗状态，`SessionConfigDialog` 组件处理代理和指纹配置。模式切换时通过 `webviewManager` 批量隐藏/显示 WebView。

**Tech Stack:** React 19, Zustand, TailwindCSS, shadcn/ui, GraphQL, Tauri WebView

---

## Task 1: 创建指纹预设常量

**Files:**
- Create: `apps/global-chat-desktop/src/constants/fingerprintPresets.ts`

**Step 1: 创建指纹预设文件**

```typescript
// apps/global-chat-desktop/src/constants/fingerprintPresets.ts
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
    id: "chrome-win",
    name: "Chrome Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "Win32",
    screenWidth: 1920,
    screenHeight: 1080,
  },
  {
    id: "chrome-mac",
    name: "Chrome macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "MacIntel",
    screenWidth: 1440,
    screenHeight: 900,
  },
  {
    id: "safari-mac",
    name: "Safari macOS",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    platform: "MacIntel",
    screenWidth: 1440,
    screenHeight: 900,
  },
  {
    id: "edge-win",
    name: "Edge Windows",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    platform: "Win32",
    screenWidth: 1920,
    screenHeight: 1080,
  },
  {
    id: "custom",
    name: "自定义",
    userAgent: "",
    platform: "",
    screenWidth: 1920,
    screenHeight: 1080,
  },
];

export const DEFAULT_FINGERPRINT = FINGERPRINT_PRESETS[0];
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/constants/fingerprintPresets.ts
git commit -m "feat(multi-proxy): 添加浏览器指纹预设常量"
```

---

## Task 2: 创建 Proxies GraphQL 查询

**Files:**
- Create: `packages/api/src/gql/query/Proxies.graphql`
- Modify: `packages/api/src/gql/index.ts`
- Create: `packages/api/src/api/apiProxies.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: 创建 GraphQL 查询文件**

```graphql
# packages/api/src/gql/query/Proxies.graphql
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

**Step 2: 导出 GraphQL 查询**

修改 `packages/api/src/gql/index.ts`，在 query 部分添加：

```typescript
export { Proxies } from "./query/Proxies.graphql";
```

**Step 3: 创建 API 函数**

```typescript
// packages/api/src/api/apiProxies.ts
import { gqlClient } from "../apiClient";
import { Proxies } from "../gql";
import { EProtocol } from "@gc/model";

export interface IProxy {
  id: string;
  name: string;
  protocol: EProtocol;
  host: string;
  port: string;
}

interface ProxiesResponse {
  proxies: IProxy[];
}

export const apiProxies = async (): Promise<IProxy[]> => {
  const { data } = await gqlClient<ProxiesResponse>(
    { query: Proxies },
    {},
    { authMode: "require" },
  );
  return data.data.proxies;
};
```

**Step 4: 导出 API 函数**

修改 `packages/api/src/index.ts`，添加：

```typescript
export { apiProxies, type IProxy } from "./api/apiProxies";
```

**Step 5: Commit**

```bash
git add packages/api/src/gql/query/Proxies.graphql packages/api/src/gql/index.ts packages/api/src/api/apiProxies.ts packages/api/src/index.ts
git commit -m "feat(api): 添加 Proxies GraphQL 查询接口"
```

---

## Task 3: 扩展 webviewManager 支持批量隐藏/显示

**Files:**
- Modify: `packages/webview/src/ioc/webviewManger.ts`

**Step 1: 添加 lastActiveAppId 属性和新方法**

在 `WebviewManger` 类中添加以下内容：

```typescript
// 在类的开头添加私有属性
private lastActiveAppId: string | null = null;

// 添加新方法：隐藏所有多开代理 WebView
async hideAllMultiProxyWebviews(): Promise<void> {
  const apps = Object.values(appStore.appList);
  const visibleApps = apps.filter(
    (app) =>
      app.status === EAppStatus.show && app.id !== AGGREGATED_CHAT_APP_ID,
  );

  // 记录当前活跃的 WebView
  this.lastActiveAppId = appStore.currentAppId || null;

  // 批量隐藏
  for (const app of visibleApps) {
    await this.hide(app.id);
  }
}

// 添加新方法：显示上次活跃的 WebView
async showLastActiveWebview(): Promise<void> {
  if (this.lastActiveAppId) {
    const app = appStore.getAppById(this.lastActiveAppId);
    if (app && app.status !== EAppStatus.closed) {
      await this.show(this.lastActiveAppId);
      appStore.changeCurrentApp(app);
    }
  }
}

// 添加新方法：隐藏当前 WebView（用于弹窗打开时）
async hideCurrentWebview(): Promise<void> {
  const currentAppId = appStore.currentAppId;
  if (currentAppId) {
    this.lastActiveAppId = currentAppId;
    await this.hide(currentAppId);
  }
}
```

**Step 2: 验证编译通过**

Run: `cd apps/global-chat-desktop && bun run build:test`
Expected: 编译成功，无错误

**Step 3: Commit**

```bash
git add packages/webview/src/ioc/webviewManger.ts
git commit -m "feat(webview): 添加批量隐藏/显示 WebView 方法"
```

---

## Task 4: 修改 ModeSwitcher 支持 WebView 隐藏/显示

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/left-sidebar/ModeSwitcher.tsx`

**Step 1: 修改 ModeSwitcher 组件**

```typescript
// apps/global-chat-desktop/src/components/layouts/left-sidebar/ModeSwitcher.tsx
import { FC } from "react";
import { cn } from "@gc/lib/utils.ts";
import { EAppMode } from "@gc/model";
import { useAppStore } from "@gc/store";
import { webviewManger } from "@gc/webview";
import { Layers, MessagesSquare } from "lucide-react";

export const ModeSwitcher: FC = () => {
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);

  const handleModeSwitch = async (newMode: EAppMode) => {
    if (newMode === appMode) return;

    if (newMode === EAppMode.AggregatedChat) {
      // 切换到聚合聊天：隐藏所有多开代理 WebView
      await webviewManger.hideAllMultiProxyWebviews();
    } else {
      // 切换到多开代理：恢复之前的 WebView
      await webviewManger.showLastActiveWebview();
    }

    setAppMode(newMode);
  };

  return (
    <div className="mb-4 flex gap-1 rounded-lg bg-white/20 p-1">
      <button
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors",
          appMode === EAppMode.MultiProxy
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => handleModeSwitch(EAppMode.MultiProxy)}
      >
        <Layers size={14} />
        <span>多开代理</span>
      </button>
      <button
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors",
          appMode === EAppMode.AggregatedChat
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => handleModeSwitch(EAppMode.AggregatedChat)}
      >
        <MessagesSquare size={14} />
        <span>聚合聊天</span>
      </button>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/left-sidebar/ModeSwitcher.tsx
git commit -m "feat(multi-proxy): 模式切换时自动隐藏/显示 WebView"
```

---

## Task 5: 创建 sessionConfigStore

**Files:**
- Create: `apps/global-chat-desktop/src/stores/sessionConfigStore.ts`

**Step 1: 创建 store 文件**

```typescript
// apps/global-chat-desktop/src/stores/sessionConfigStore.ts
import { create } from "zustand";
import { EPlatform, EProtocol } from "@gc/model";
import { webviewManger } from "@gc/webview";
import { userStore } from "@gc/store";
import {
  DEFAULT_FINGERPRINT,
  type FingerprintPreset,
} from "@/constants/fingerprintPresets";

export interface ProxyConfig {
  proxyId: string;
  protocol: EProtocol;
  host: string;
  port: string;
}

export interface FingerprintConfig {
  presetId: string | null;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
}

interface SessionConfigState {
  // 弹窗状态
  isOpen: boolean;
  mode: "create" | "edit";
  editingAppId: string | null;

  // 选中的平台（新建时）
  selectedPlatform: EPlatform | null;

  // 配置
  proxyConfig: ProxyConfig | null;
  fingerprintConfig: FingerprintConfig;

  // Actions
  openForCreate: (platform: EPlatform) => Promise<void>;
  openForEdit: (appId: string) => Promise<void>;
  close: () => void;
  cancel: () => Promise<void>;
  setProxyConfig: (config: ProxyConfig | null) => void;
  setFingerprintConfig: (config: Partial<FingerprintConfig>) => void;
  applyFingerprintPreset: (preset: FingerprintPreset) => void;
  reset: () => void;
}

const DEFAULT_FINGERPRINT_CONFIG: FingerprintConfig = {
  presetId: DEFAULT_FINGERPRINT.id,
  userAgent: DEFAULT_FINGERPRINT.userAgent,
  platform: DEFAULT_FINGERPRINT.platform,
  screenWidth: DEFAULT_FINGERPRINT.screenWidth,
  screenHeight: DEFAULT_FINGERPRINT.screenHeight,
};

export const useSessionConfigStore = create<SessionConfigState>((set, get) => ({
  isOpen: false,
  mode: "create",
  editingAppId: null,
  selectedPlatform: null,
  proxyConfig: null,
  fingerprintConfig: DEFAULT_FINGERPRINT_CONFIG,

  openForCreate: async (platform) => {
    // 隐藏当前 WebView
    await webviewManger.hideCurrentWebview();

    set({
      isOpen: true,
      mode: "create",
      selectedPlatform: platform,
      editingAppId: null,
      proxyConfig: null,
      fingerprintConfig: DEFAULT_FINGERPRINT_CONFIG,
    });
  },

  openForEdit: async (appId) => {
    // 隐藏当前 WebView
    await webviewManger.hideCurrentWebview();

    // 加载现有配置
    const config = userStore.getThirdAppConfigById(appId);

    set({
      isOpen: true,
      mode: "edit",
      editingAppId: appId,
      selectedPlatform: config?.platform || null,
      proxyConfig: config?.proxy?.enable
        ? {
            proxyId: config.proxy.proxyId || "",
            protocol: config.proxy.protocol,
            host: config.proxy.host,
            port: config.proxy.port,
          }
        : null,
      fingerprintConfig: config?.fingerprint || DEFAULT_FINGERPRINT_CONFIG,
    });
  },

  close: () => {
    set({ isOpen: false });
  },

  cancel: async () => {
    set({ isOpen: false });
    // 恢复之前的 WebView
    await webviewManger.showLastActiveWebview();
  },

  setProxyConfig: (config) => set({ proxyConfig: config }),

  setFingerprintConfig: (config) =>
    set((state) => ({
      fingerprintConfig: { ...state.fingerprintConfig, ...config },
    })),

  applyFingerprintPreset: (preset) =>
    set({
      fingerprintConfig: {
        presetId: preset.id,
        userAgent: preset.userAgent,
        platform: preset.platform,
        screenWidth: preset.screenWidth,
        screenHeight: preset.screenHeight,
      },
    }),

  reset: () =>
    set({
      isOpen: false,
      mode: "create",
      editingAppId: null,
      selectedPlatform: null,
      proxyConfig: null,
      fingerprintConfig: DEFAULT_FINGERPRINT_CONFIG,
    }),
}));
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/stores/sessionConfigStore.ts
git commit -m "feat(multi-proxy): 创建 sessionConfigStore 管理弹窗状态"
```

---

## Task 6: 创建 SessionConfigDialog 类型定义

**Files:**
- Create: `apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/types.ts`

**Step 1: 创建类型文件**

```typescript
// apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/types.ts
import { IProxy } from "@gc/api";
import { FingerprintPreset } from "@/constants/fingerprintPresets";

export interface ProxySectionProps {
  proxyList: IProxy[];
  isLoading: boolean;
  onRefresh: () => void;
}

export interface FingerprintSectionProps {
  presets: FingerprintPreset[];
}
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/types.ts
git commit -m "feat(multi-proxy): 添加 SessionConfigDialog 类型定义"
```

---

## Task 7: 创建 ProxySection 组件

**Files:**
- Create: `apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/ProxySection.tsx`

**Step 1: 创建组件文件**

```typescript
// apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/ProxySection.tsx
import { FC, useMemo } from "react";
import { Label } from "@gc/ui/components/label";
import { Input } from "@gc/ui/components/input";
import { SearchSelector } from "@gc/ui/custorm-components";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import { IProxy } from "@gc/api";
import { EProtocol, protocolOptions } from "@gc/model";
import { RefreshCcw } from "lucide-react";
import { Button } from "@gc/ui/components/button";
import { cn } from "@gc/lib/utils";

interface Props {
  proxyList: IProxy[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const ProxySection: FC<Props> = ({ proxyList, isLoading, onRefresh }) => {
  const { proxyConfig, setProxyConfig } = useSessionConfigStore();

  const proxyOptions = useMemo(() => {
    return [
      { value: "", label: "不使用代理" },
      ...proxyList.map((p) => ({
        value: p.id,
        label: p.name,
      })),
    ];
  }, [proxyList]);

  const handleProxySelect = (proxyId: string) => {
    if (!proxyId) {
      setProxyConfig(null);
      return;
    }

    const selectedProxy = proxyList.find((p) => p.id === proxyId);
    if (selectedProxy) {
      setProxyConfig({
        proxyId: selectedProxy.id,
        protocol: selectedProxy.protocol,
        host: selectedProxy.host,
        port: selectedProxy.port,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">网络代理</h4>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCcw
            size={14}
            className={cn(isLoading && "animate-spin")}
          />
        </Button>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <Label className="text-muted-foreground text-xs">选择代理</Label>
          <SearchSelector
            value={proxyConfig?.proxyId || ""}
            onChange={handleProxySelect}
            placeholder="请选择代理"
            options={proxyOptions}
          />
        </div>

        {proxyConfig && (
          <>
            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-muted-foreground text-xs">协议</Label>
              <SearchSelector
                value={proxyConfig.protocol}
                onChange={(value) =>
                  setProxyConfig({ ...proxyConfig, protocol: value as EProtocol })
                }
                placeholder="请选择协议"
                options={protocolOptions}
              />
            </div>

            <div className="grid grid-cols-[80px_1fr] items-center gap-2">
              <Label className="text-muted-foreground text-xs">地址</Label>
              <div className="flex items-center gap-1">
                <Input
                  value={proxyConfig.host}
                  onChange={(e) =>
                    setProxyConfig({ ...proxyConfig, host: e.target.value })
                  }
                  placeholder="IP 或域名"
                  className="h-8 flex-1"
                />
                <span className="text-muted-foreground">:</span>
                <Input
                  value={proxyConfig.port}
                  onChange={(e) =>
                    setProxyConfig({ ...proxyConfig, port: e.target.value })
                  }
                  placeholder="端口"
                  className="h-8 w-20"
                  inputMode="numeric"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/ProxySection.tsx
git commit -m "feat(multi-proxy): 创建 ProxySection 组件"
```

---

## Task 8: 创建 FingerprintSection 组件

**Files:**
- Create: `apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/FingerprintSection.tsx`

**Step 1: 创建组件文件**

```typescript
// apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/FingerprintSection.tsx
import { FC } from "react";
import { Label } from "@gc/ui/components/label";
import { Input } from "@gc/ui/components/input";
import { SearchSelector } from "@gc/ui/custorm-components";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import {
  FINGERPRINT_PRESETS,
  type FingerprintPreset,
} from "@/constants/fingerprintPresets";

export const FingerprintSection: FC = () => {
  const { fingerprintConfig, setFingerprintConfig, applyFingerprintPreset } =
    useSessionConfigStore();

  const presetOptions = FINGERPRINT_PRESETS.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const handlePresetChange = (presetId: string) => {
    const preset = FINGERPRINT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      if (preset.id === "custom") {
        setFingerprintConfig({ presetId: "custom" });
      } else {
        applyFingerprintPreset(preset);
      }
    }
  };

  const isCustom = fingerprintConfig.presetId === "custom";

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">浏览器指纹</h4>

      <div className="grid gap-3">
        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <Label className="text-muted-foreground text-xs">预设</Label>
          <SearchSelector
            value={fingerprintConfig.presetId || "chrome-win"}
            onChange={handlePresetChange}
            placeholder="请选择预设"
            options={presetOptions}
          />
        </div>

        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <Label className="text-muted-foreground text-xs">UserAgent</Label>
          <Input
            value={fingerprintConfig.userAgent}
            onChange={(e) =>
              setFingerprintConfig({
                userAgent: e.target.value,
                presetId: "custom",
              })
            }
            placeholder="User Agent"
            className="h-8 text-xs"
            disabled={!isCustom && !!fingerprintConfig.presetId}
          />
        </div>

        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <Label className="text-muted-foreground text-xs">分辨率</Label>
          <div className="flex items-center gap-1">
            <Input
              value={fingerprintConfig.screenWidth}
              onChange={(e) =>
                setFingerprintConfig({
                  screenWidth: parseInt(e.target.value) || 1920,
                  presetId: "custom",
                })
              }
              placeholder="宽度"
              className="h-8 w-20"
              inputMode="numeric"
              disabled={!isCustom && !!fingerprintConfig.presetId}
            />
            <span className="text-muted-foreground">×</span>
            <Input
              value={fingerprintConfig.screenHeight}
              onChange={(e) =>
                setFingerprintConfig({
                  screenHeight: parseInt(e.target.value) || 1080,
                  presetId: "custom",
                })
              }
              placeholder="高度"
              className="h-8 w-20"
              inputMode="numeric"
              disabled={!isCustom && !!fingerprintConfig.presetId}
            />
          </div>
        </div>

        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <Label className="text-muted-foreground text-xs">平台</Label>
          <Input
            value={fingerprintConfig.platform}
            onChange={(e) =>
              setFingerprintConfig({
                platform: e.target.value,
                presetId: "custom",
              })
            }
            placeholder="平台标识"
            className="h-8"
            disabled={!isCustom && !!fingerprintConfig.presetId}
          />
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/FingerprintSection.tsx
git commit -m "feat(multi-proxy): 创建 FingerprintSection 组件"
```

---

## Task 9: 创建 SessionConfigDialog 主组件

**Files:**
- Create: `apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/index.tsx`

**Step 1: 创建主组件文件**

```typescript
// apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/index.tsx
import { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gc/ui/components/dialog";
import { Button } from "@gc/ui/components/button";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import { ProxySection } from "./ProxySection";
import { FingerprintSection } from "./FingerprintSection";
import { useQuery } from "@tanstack/react-query";
import { apiProxies } from "@gc/api";
import { webviewManger } from "@gc/webview";
import { useNavigate } from "react-router";
import { ERouterPath } from "@gc/model";
import { Separator } from "@gc/ui/components/separator";
import { PlatformIcon } from "@/components/icons";

export const SessionConfigDialog: FC = () => {
  const navigate = useNavigate();
  const {
    isOpen,
    mode,
    selectedPlatform,
    proxyConfig,
    fingerprintConfig,
    close,
    cancel,
  } = useSessionConfigStore();

  const {
    data: proxyList = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["proxies"],
    queryFn: apiProxies,
    enabled: isOpen,
  });

  const handleSubmit = async () => {
    if (mode === "create" && selectedPlatform) {
      // 创建新会话，传入代理和指纹配置
      const app = await webviewManger.create(selectedPlatform, "");

      if (app) {
        // TODO: 保存代理和指纹配置到 userStore
        navigate(`${ERouterPath.singleChat}/${app.id}`);
      }
    }

    close();
  };

  const handleCancel = async () => {
    await cancel();
  };

  const title =
    mode === "create"
      ? `新建会话 - ${selectedPlatform || ""}`
      : "编辑会话配置";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedPlatform && (
              <PlatformIcon platform={selectedPlatform} size={20} />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <ProxySection
            proxyList={proxyList}
            isLoading={isLoading}
            onRefresh={() => refetch()}
          />

          <Separator />

          <FingerprintSection />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "create" ? "创建会话" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/components/dialogs/SessionConfigDialog/index.tsx
git commit -m "feat(multi-proxy): 创建 SessionConfigDialog 主组件"
```

---

## Task 10: 修改 MultiProxySidebar 使用新弹窗

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/left-sidebar/MultiProxySidebar.tsx`

**Step 1: 修改组件使用 sessionConfigStore**

```typescript
// apps/global-chat-desktop/src/components/layouts/left-sidebar/MultiProxySidebar.tsx
import { FC, useRef } from "react";
import { cn } from "@gc/lib/utils.ts";
import { defaultPlatformConfigList, EPlatform } from "@gc/model";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { defaultTransition } from "@gc/utils";
import { PlatformIcon } from "@/components/icons";
import { useIsOverflowing } from "@/components/layouts/left-sidebar/useIsOverflowing.ts";
import { ConditionalRender, SearchSelector } from "@gc/ui/custorm-components";
import { IconAddOutline } from "@/components/icons/IconAddOutline.tsx";
import { AppList } from "@/components/layouts/left-sidebar/AppList.tsx";
import { Input } from "@gc/ui/components/input.tsx";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";

export const MultiProxySidebar: FC = () => {
  const [isOverFlowingRef, isOverflowing] = useIsOverflowing();
  const inputRef = useRef<HTMLInputElement>(null);
  const openForCreate = useSessionConfigStore((s) => s.openForCreate);

  const scrollToBottom = () => {
    const menuEle = isOverFlowingRef.current?.osInstance()?.elements().content;
    menuEle?.scrollTo({
      top: menuEle?.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className="mb-[8px] h-[44px] pl-[24px]">
        <SearchSelector
          onChange={async (value) => {
            const platformConfig = defaultPlatformConfigList.find(
              (it) => it.platform === value,
            );
            if (!platformConfig) {
              return;
            }

            // 打开配置弹窗
            await openForCreate(platformConfig.platform);
            scrollToBottom();
          }}
          options={defaultPlatformConfigList.map((it) => ({
            label: it.platform,
            value: it.id,
            disabled: !it.support,
          }))}
          itemRender={(it) => (
            <ConditionalRender
              condition={it.value !== EPlatform.Fingerprint}
              fallback={
                <>
                  <PlatformIcon platform={it.value as EPlatform} size={12} />
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    <Input
                      ref={inputRef}
                      placeholder="请输入指纹浏览地址(试验版)"
                      className="h-6"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    />
                  </span>
                </>
              }
            >
              <>
                <PlatformIcon platform={it.value as EPlatform} size={12} />
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {it.value}
                  {it.disabled && "（正在接入...）"}
                </span>
              </>
            </ConditionalRender>
          )}
          contentClassName="w-60"
        >
          <div
            className={cn(
              "group flex h-full w-full cursor-pointer items-center",
            )}
          >
            <div
              className={cn(
                "flex h-full w-full rounded-xl",
                "bg-cover bg-no-repeat text-sm",
                defaultTransition,
                "group-hover:bg-primary/10 group-hover:text-primary",
                "group-active:bg-[url('/src/assets/icons/nav_bg_active.svg')] group-active:text-white",
              )}
            >
              <div className="flex flex-1 items-center gap-[10px] pl-[20px]">
                <IconAddOutline size={20} />
                <span className="w-[84px] capitalize">新建会话</span>
              </div>
            </div>
          </div>
        </SearchSelector>
      </div>

      <OverlayScrollbarsComponent
        options={{ scrollbars: { autoHide: "scroll" } }}
        className="flex-grow overflow-y-scroll"
        ref={isOverFlowingRef}
      >
        <AppList />
      </OverlayScrollbarsComponent>
      <div
        className={cn(
          "invisible mb-3 ml-6 h-px w-[204px] bg-white/50",
          isOverflowing && "visible",
        )}
      />
    </>
  );
};
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/left-sidebar/MultiProxySidebar.tsx
git commit -m "feat(multi-proxy): MultiProxySidebar 使用新建会话弹窗"
```

---

## Task 11: 在 App 中挂载 SessionConfigDialog

**Files:**
- Modify: `apps/global-chat-desktop/src/App.tsx` 或 `apps/global-chat-desktop/src/main.tsx`

**Step 1: 查找并修改入口文件，添加 SessionConfigDialog**

在应用根组件中添加：

```typescript
import { SessionConfigDialog } from "@/components/dialogs/SessionConfigDialog";

// 在 JSX 中添加
<SessionConfigDialog />
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/App.tsx
git commit -m "feat(multi-proxy): 挂载 SessionConfigDialog 到应用根组件"
```

---

## Task 12: 修改 AppList 添加设置按钮和代理信息显示

**Files:**
- Modify: `apps/global-chat-desktop/src/components/layouts/left-sidebar/AppList.tsx`

**Step 1: 添加设置按钮和代理信息**

在 AppList 组件中：

1. 导入 `Settings` 图标和 `useSessionConfigStore`
2. 添加代理信息显示
3. 添加设置按钮

关键修改：

```typescript
import { Settings } from "lucide-react";
import { useSessionConfigStore } from "@/stores/sessionConfigStore";
import { useQuery } from "@tanstack/react-query";
import { apiProxies } from "@gc/api";

// 在组件内部
const openForEdit = useSessionConfigStore((s) => s.openForEdit);
const { data: proxyList = [] } = useQuery({
  queryKey: ["proxies"],
  queryFn: apiProxies,
});

// 获取代理名称的辅助函数
const getProxyName = (appId: string) => {
  const config = userStore.getThirdAppConfigById(appId);
  if (!config?.proxy?.enable) return null;
  const proxy = proxyList.find((p) => p.id === config.proxy.proxyId);
  return proxy?.name || `${config.proxy.host}:${config.proxy.port}`;
};

// 在列表项中添加代理信息显示
{getProxyName(app.id) && (
  <div className="text-muted-foreground truncate text-[10px]">
    📡 {getProxyName(app.id)}
  </div>
)}

// 添加设置按钮
<div
  className={cn("hover:text-primary p-[2px]", defaultTransition)}
  onClick={(evt) => {
    evt.stopPropagation();
    openForEdit(app.id);
  }}
>
  <Settings size={16} />
</div>
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src/components/layouts/left-sidebar/AppList.tsx
git commit -m "feat(multi-proxy): AppList 添加设置按钮和代理信息显示"
```

---

## Task 13: 验证和测试

**Step 1: 启动开发环境**

Run: `cd apps/global-chat-desktop && task dev:all`

**Step 2: 测试新建会话流程**

1. 点击"新建会话"
2. 选择平台
3. 验证弹窗显示
4. 配置代理和指纹
5. 点击创建

**Step 3: 测试模式切换**

1. 在多开代理模式下打开一个 WebView
2. 切换到聚合聊天模式
3. 验证 WebView 被隐藏
4. 切回多开代理模式
5. 验证 WebView 恢复显示

**Step 4: 测试设置按钮**

1. 在列表中点击设置按钮
2. 验证弹窗以编辑模式打开
3. 验证现有配置被加载

---

## 注意事项

1. **WebView 层级**：弹窗打开时必须隐藏 WebView，否则会被遮挡
2. **代理配置生效**：代理配置在 WebView 创建时生效，编辑已有会话需要重启 WebView
3. **API 错误处理**：Proxies API 可能失败，需要处理加载状态和错误状态
4. **状态持久化**：代理和指纹配置需要保存到 userStore

---

## 后续优化（P2）

1. 编辑模式下提示需要重启 WebView
2. 代理连接测试功能
3. 指纹随机生成功能
4. 精简 RightMenuList（移除翻译、客户画像、粉丝统计）
