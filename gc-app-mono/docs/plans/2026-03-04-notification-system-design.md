# 聚合聊天 — 系统通知设计

## 目标

当收到新消息且应用不在前台时，通过操作系统原生通知提醒用户，类似微信/飞书的 IM 通知体验。

## 技术基础

- `@tauri-apps/plugin-notification` v2.3.3 已安装
- Rust 端 `tauri_plugin_notification` 已初始化
- `notification:default` 权限已配置

## 方案

采用 **chatStore 内直接触发通知**（方案 A）：在数据合并方法中检测新消息，调用通知服务。

## 通知服务（NotificationService）

**文件**: `src/modules/aggregated-chat/services/notificationService.ts`

### 职责

1. **窗口焦点检测** — `document.visibilityState` 判断是否在前台
2. **发送系统通知** — 调用 `@tauri-apps/plugin-notification`
3. **按对话合并** — 同一对话 5 秒内多条消息只发一个通知
4. **点击处理** — 聚焦窗口 + 跳转到对应对话

### 通知内容格式

- **标题**: 发送者名称（群聊时 `群名 - 发送者名称`）
- **正文**: 消息内容预览（截断到 100 字符）；合并时显示 `你有 N 条新消息`

### 通知抑制条件

当以下条件**同时满足**时不弹通知：
- 窗口在前台（`isFocused === true`）
- 当前选中的对话就是新消息所属对话

其他情况都弹通知。

### 不触发通知的情况

- `initialLoad` 首次加载时（避免启动轰炸）
- 自己发出的消息（`direction === Outgoing`）
- 窗口前台且正在查看该对话

## chatStore 集成

### mergeImtpMessages — 新消息通知

去重后、`set()` 之前：
1. 筛选 `direction === Incoming` 的新消息
2. 按 `conversationId` 分组
3. 调用 `notificationService.notifyNewMessages(conversationId, messages)`

### mergeImtpConversations — 未读清零关闭通知

对比旧 `unreadCount` 和新 `unreadCount`：
- 新值 < 旧值 → 调用 `notificationService.dismiss(conversationId)`

## 点击通知交互

1. `getCurrentWindow().setFocus()` 聚焦窗口
2. 设置 `uiStore.selectedConversationId` 跳转对话
3. 通知 payload 中携带 `conversationId`

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `services/notificationService.ts` | **新增** — 通知服务 |
| `store/chatStore.ts` | **修改** — merge 方法中调用通知 |
| `AggregatedChat.tsx` | **修改** — 初始化通知服务 |

无需修改 Rust 端或 Tauri 配置。
