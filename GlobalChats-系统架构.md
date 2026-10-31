# GlobalChats 系统完整架构

> 定位：面向跨境客服 / 社媒运营的
>
> **多平台聊天工作台**
>
> —— 一个运营集中管理 Telegram / WhatsApp / TikTok / Messenger / LinkedIn 等外贸平台，聚合收消息、发消息，并支持多账号防关联隔离。
> 依据：工作区源码（
>
> `gc-app-mono`
>
>  桌面端 + 
>
> `gc-main`
>
>  Web / 服务端）+ 
>
> `PROJECT_GUIDE.md`
>
>  \+ 本机实测。



***

## 一、系统形态：双端 / 双工程



| 工程              | 形态                     | 技术栈                                                                           | 说明                               |
| --------------- | ---------------------- | ----------------------------------------------------------------------------- | -------------------------------- |
| **gc-app-mono** | 桌面端（Windows/macOS 客户端） | Tauri 2 + **Rust** + React 19 + TypeScript + Vite + Zustand + Bun + Turborepo | 主战场：多 WebView 承载平台、聚合收件箱、多开代理、翻译 |
| **gc-main**     | Web / 服务端              | Next.js 16 + GraphQL Yoga + Prisma + **PostgreSQL** + pnpm                    | API、数据持久化、认证；也可独立部署为内网 Web 界面    |

> 两个工程是
>
> **并列 workspace**
>
> （非同一 monorepo 根），包管理器不同（Bun vs pnpm），需分别构建启动。



***

## 二、核心技术模型：多 WebView（Multi-Webview）

这是整个系统的核心，由 **Rust 层管理窗口生命周期**：



```
┌───────────────────────── Rust（Tauri） ─────────────────────────┐
│  Main Window（主界面/聚合收件箱）                                │
│  ├── 第三方平台 WebView 1（如 WhatsApp）  ← 每个平台一个独立窗口  │
│  ├── 第三方平台 WebView 2（如 Telegram）                        │
│  └── Secondary 工具窗（翻译等，可选）                           │
│                                                                │
│  Rust 负责：创建/隐藏/关闭 WebView、注入 preload、转发事件      │
└─────────────────────────────────────────────────────────────────┘
```

**核心机制**：



1. Rust 为每个平台创建独立的 WebView，加载该平台的**网页版**（[web.telegram.org](https://web.telegram.org)、[web.whatsapp.com](https://web.whatsapp.com)、[web.tiktok.com](https://web.tiktok.com)…）；

2. 向平台网页注入 **preload 脚本** → 暴露 `GCEngine` 桥 → 调用对应**平台引擎**；

3. 平台引擎**抓取并标准化**该平台的会话 / 消息，汇入聚合收件箱；

4. 主窗口（聚合收件箱）统一展示所有平台的消息。



***

## 三、分层架构

### 1. 展示层（前端 UI）



* **聚合收件箱**（AggregatedChat）：统一展示各平台会话 / 消息，支持搜索、筛选、翻译、回复；

* **多开代理**（MultiProxy）：平台 WebView 管理入口，每个平台一个隔离窗口；

* **会话视图 / 会话占位**：单会话详情；

* **翻译配置 / 代理配置 / 指纹配置**：功能面板（部分接口未对齐，见技术债）；

* 状态管理：**Zustand**（syncStore /sessionConfigStore/chatStore 等）。

### 2. 注入 / 引擎层（平台适配）



```
preload 脚本 → GCEngine（桥） → 平台引擎（Engine）
                                  ├── Telegram Engine
                                  ├── WhatsApp Engine
                                  ├── TikTok Engine
                                  ├── Messenger Engine
                                  ├── LinkedIn Engine
                                  ├── Instagram Engine（默认关）
                                  ├── Facebook Engine（默认关）
                                  └── Teams Engine（默认关）
```



* 平台引擎职责：**监听消息**（DOM 观察 MutationObserver / 内部 Store 挂钩）、识别会话、把消息节点解析为标准结构（发件人 / 内容 / 时间）、发送消息；

* 默认开放 5 个平台，其余 3 个引擎存在但默认关闭。

### 3. 服务层（后端 API）



* **GraphQL API（GraphQL Yoga）**：认证、账号 / 会话 / 消息查询、翻译、代理、模型选择；

* **同步引擎**：桌面端 SyncStore 轮询（5s）拉取账号 / 会话增量；

* **Outbox 命令队列**：消息发送走命令队列（待实现消费者）；

* **API 合同现状**：桌面端使用 `imtp.*`，后端实现 `im.*`（存在历史合同分叉，见 § 六）。

### 4. 数据层



* **Prisma ORM + PostgreSQL**；

* 核心表：账号、会话、消息、Outbox、用户（完整 ER 见数据库设计文档）。

### 5. 桌面运行时层



* **Tauri 2 + Rust**：窗口 / WebView 生命周期、进程管理、指纹隔离基础、代理注入。



***

## 四、数据流

### 消息监听（收）



```
平台网页 DOM/Store 变化
  → 平台引擎（注入脚本）监听解析
  → GCEngine 桥 → Rust → 标准化消息
  → 写入后端 GraphQL（imtp.*/im.*）
  → PostgreSQL 持久化
  → 桌面端 SyncStore 轮询同步 → 聚合收件箱渲染
```

### 消息发送（发）



```
聚合收件箱回复
  → GraphQL 写入 Outbox（PENDING）
  → 消费 Worker（待实现）取命令
  → 通知对应平台 WebView 引擎
  → 引擎在平台网页注入发送动作
  → 更新 Outbox 状态（SENT/FAILED）
```



***

## 五、认证与登录



* 桌面端登录走 `im.login`（已通过后端兼容层打通），返回 JWT；

* 第三方平台登录在各自 WebView 内完成（扫码 / 账号密码），登录态存于 WebView / 账号表（login\_status）。



***

## 六、当前 API 合同与已知技术债



| 问题                  | 说明                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **imtp vs im 合同分叉** | 桌面端用 `imtp.*` + `im.login/translate/modelsByScene/proxies`；后端提供 `im.*`，字段名不同（hijackImUserId vs hijackWorkspaceMemberId 等）。当前靠后端补**兼容层 / 别名层**打通，非真正统一 |
| Outbox 无消费者         | 发送只写 PENDING 队列，仓库无消费 Worker → 消息发不出去                                                                                                                 |
| 平台引擎未在真实平台验证        | 注入抓消息依赖平台网页 DOM，平台升级易失效                                                                                                                               |
| 测试缺失                | gc-main 无测试；桌面端有 Vitest/Playwright                                                                                                                    |
| 安全配置偏松              | Tauri csp:null、devtools:true、unsafe-headers                                                                                                           |
| 密钥风险                | 桌面端 .env 含真实 Sentry token，JWT\_SECRET 有开发回退值                                                                                                          |

> 完整问题清单见《GlobalChats - 系统问题与错误清单.md》。



***

## 七、关键目录结构（依据）



```
gc/
├── PROJECT_GUIDE.md            # 项目指南
├── gc-app-mono/                # 桌面端（Bun/Turborepo）
│   └── apps/global-chat-desktop/
│       ├── src/
│       │   ├── modules/aggregated-chat/   # 聚合聊天
│       │   ├── components/layouts/        # 多开代理/侧边栏
│       │   ├── stores/                    # Zustand（syncStore/sessionConfigStore）
│       │   ├── pages/test/                # Webview 测试页
│       │   └── constants/fingerprintPresets.ts
│       └── src-tauri/                     # Rust（窗口/WebView/注入）
└── gc-main/                    # Web/服务端（pnpm）
    ├── schema.ts               # GraphQL Schema（imtp 兼容层在此补）
    ├── prisma/                 # ORM + PostgreSQL
    └── aaa/prod/               # 历史数据快照（待治理）
```



***

## 八、部署形态（当前）



* **本地 / 内网 Web 版**：`next dev -p 8090 --hostname 0.0.0.0`，公司员工内网可访问演示页；

* **桌面端**：`bun tauri dev`，独立客户端运行多 WebView；

* 未来可打包分发（签名 / 更新 / 权限），详见重新开发路线。