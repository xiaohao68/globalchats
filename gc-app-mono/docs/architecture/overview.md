# 架构概览

本文档描述 Global Chats 的整体系统架构。

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Tauri Desktop App                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │   主应用 (src/) :1420     │  │         第三方平台 WebViews              │  │
│  │                          │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │  │
│  │  ┌────────────────────┐  │  │  │ TG  │ │ WA  │ │ IG  │ │ ... │       │  │
│  │  │ 多开代理 / 聚合聊天 │  │  │  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘       │  │
│  │  └────────────────────┘  │  │     │      │      │      │ InjectJS    │  │
│  │  状态源 / 持久化写入     │  │     └──────┴──────┴──────┴──────       │  │
│  └───────────┬──────────────┘  │              │ GCEngine                │  │
│              ↓                  └──────────────┼─────────────────────────┘  │
│  ┌──────────────────────────────────────────┼─────────────────────────┐    │
│  │   WebView Channel (Tauri Event API)      ↓                         │    │
│  │   requestStoreState / sendStoreState / updateSettings              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Rust Backend (src-tauri)                            │
│   WebView 管理 | Tauri Store | HTTP Plugin | 系统集成 | 开发工具            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心设计

### 双进程架构

| 进程 | 职责 | 技术 |
|------|------|------|
| 主 Renderer | UI 渲染、状态管理、持久化写入 | React + Zustand |
| 平台 WebViews | 加载第三方平台、运行 InjectJS | 原生 WebView |
| Rust Backend | WebView 管理、系统 API、存储 | Tauri 2.x |

### 数据流

```
用户操作 → React UI → Zustand Store → Tauri Event → WebView
                ↓
         settings.json (持久化)
```

### 关键约束

1. **单一写入者**: 只有主 Renderer 可以写入 `settings.json`
2. **消息总线**: 所有 WebView 通过 Tauri Event API 通信
3. **状态同步**: 子 WebView 启动时从主 Renderer 请求状态

## 核心模块

| 模块 | 位置 | 职责 |
|------|------|------|
| GCEngine | `packages/gc-engine/` | 8 个平台的 SDK 实现 |
| Store | `packages/store/` | 三层状态管理 |
| Channel | `packages/channel/` | WebView 间通信 |
| 主应用 | `apps/global-chat-desktop/src/` | React UI |
| InjectJS | `apps/global-chat-desktop/src-preload/` | 注入脚本入口 |
| 聚合聊天 | `src/modules/aggregated-chat/` | 统一消息聚合、同步、通知 |

## 相关文档

- [三层 Store 架构](./store-architecture.md)
- [核心技术深度解析](../core-technologies-deep-dive.md)
- [架构复刻指南](../architecture-replication-guide.md)
