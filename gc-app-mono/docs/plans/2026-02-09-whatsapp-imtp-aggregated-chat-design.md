# WhatsApp IMTP 上报与聚合聊天完善设计

> 日期: 2026-02-09
> 状态: 已实施

## 概述

完善 WhatsApp 上报逻辑和聚合聊天的获取/发送消息逻辑，统一使用 IMTP 协议对接 gc-saas 服务端。

## 变更范围

### 1. WhatsApp 上报逻辑（gc-engine → gc-saas）

#### 问题
- `imtpBackend.ts` 字段映射与 gc-saas 服务端不匹配
- API 层 GraphQL 结构使用扁平命名，服务端使用嵌套命名空间
- 缺少 Participants 和 Accounts 上报

#### 修复
- **字段映射修正**: `keyId` → `messageId`, `keyRemoteJid` → `remoteJid`, 新增 `fromMe`/`participant`
- **GraphQL 结构**: 改为嵌套 `mutation { imtp { whatsapp { hijackPush*(...) } } }`
- **账号上报**: `pushCurrentUser` 调用 `hijackPushAccounts`，获取服务端分配的 `accountId`
- **联系人上报**: `pushContacts` 改为调用 `hijackPushParticipants`
- **对话上报**: `pushConversations` 使用正确的 `ImtpWhatsappHijackPushConversationsInput`

### 2. 聚合聊天拉取逻辑（gc-saas → 主应用）

#### 问题
- SyncEngine 只轮询 messages，缺少 conversations 和 participants
- 使用错误的 GraphQL 查询结构

#### 修复
- **SyncEngine 重写**: 支持 accounts/conversations/messages/participants 四种数据类型的增量轮询
- **游标管理**: 每个账号维护独立的 conversations/messages/participants 游标
- **chatStore 新增方法**: `mergeImtpConversations`, `mergeImtpParticipants`, `setAccounts`
- **syncStore 简化**: 委托给 SyncEngine，新增 `syncNow` 方法

### 3. 聚合聊天发送消息（前端框架）

#### 现状
gc-saas 服务端尚未实现反向发送接口（Aggregate → Hijack）

#### 前端框架
- `chatStore.sendMessage`: 乐观更新 + 消息状态管理（Sending → Sent → Failed）
- 预留 API 调用位置，等服务端接口就绪后对接

## 新增文件

| 文件 | 说明 |
|------|------|
| `packages/api/src/api/apiImtpWhatsappPushParticipants.ts` | 推送参与者 |
| `packages/api/src/api/apiImtpWhatsappPushAccounts.ts` | 推送账号 |
| `packages/api/src/api/apiImtpWhatsappPollConversations.ts` | 轮询对话 |
| `packages/api/src/api/apiImtpWhatsappPollParticipants.ts` | 轮询参与者 |
| `packages/api/src/api/apiImtpWhatsappPollAccounts.ts` | 轮询账号 |

## 修改文件

| 文件 | 变更 |
|------|------|
| `packages/gc-engine/src/middleware/backend/imtpBackend.ts` | 字段映射修正、新增 accountId 管理 |
| `packages/api/src/api/apiImtpWhatsappPushMessages.ts` | GraphQL 嵌套结构 |
| `packages/api/src/api/apiImtpWhatsappPushConversations.ts` | GraphQL 嵌套结构 |
| `packages/api/src/api/apiImtpWhatsappPollMessages.ts` | GraphQL 嵌套结构 + 完整字段 |
| `packages/api/src/api/index.ts` | 导出新 API |
| `apps/.../aggregated-chat/services/SyncEngine.ts` | 完整重写 |
| `apps/.../aggregated-chat/store/chatStore.ts` | 新增 merge 方法 + sendMessage |
| `apps/.../aggregated-chat/store/syncStore.ts` | 委托 SyncEngine |

## 数据流

```
上报: WhatsApp WebView → MessageService → ReporterAdapter → ImtpBackend → hijackPush* → gc-saas
拉取: gc-saas → aggregatePoll* → SyncEngine → chatStore.merge* → UI
发送: UI → chatStore.sendMessage → (TODO: 服务端接口) → gc-saas → hijack端
```

## 后续工作

1. gc-saas 服务端实现 `aggregateSendMessage` mutation
2. gc-saas 服务端实现 `hijackPollOutgoingMessages` query
3. 客户端对接真实发送消息接口
