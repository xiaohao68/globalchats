# IMTP WhatsApp 上报架构文档

**日期**: 2026-02-04
**状态**: 已实施
**相关模块**: packages/gc-engine/src/apps/whatsapp, packages/api

---

## 1. 概述

本文档描述 WhatsApp 模块作为**上报客户端**与服务端的消息同步架构。

### 1.1 架构定位

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WhatsApp Web (WebView)                            │
│                    ┌─────────────────────────────────────┐                  │
│                    │      WhatsAppSDKV2 (应用层)          │                  │
│                    │  ┌─────────┐ ┌─────────┐ ┌────────┐ │                  │
│                    │  │AuthSvc  │ │ChatSvc  │ │SyncSvc │ │                  │
│                    │  └────┬────┘ └────┬────┘ └───┬────┘ │                  │
│                    └───────┼───────────┼──────────┼──────┘                  │
│                            │           │          │                         │
│                    ┌───────┴───────────┴──────────┴──────┐                  │
│                    │     ReporterAdapter (上报适配器)     │                  │
│                    │          MessageQueue (队列)         │                  │
│                    └──────────────────┬───────────────────┘                  │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │         ImtpBackend (Backend 层)       │
                    │  ┌─────────────┐    ┌─────────────┐   │
                    │  │  startSync  │───▶│ completeSync│   │
                    │  └──────┬──────┘    └─────────────┘   │
                    │         │                              │
                    │  ┌──────┴──────┐  ┌──────────────┐    │
                    │  │ pushMessages│  │pushConversations│  │
                    │  └─────────────┘  └──────────────┘    │
                    └───────────────────┬───────────────────┘
                                        │ GraphQL
┌───────────────────────────────────────┼─────────────────────────────────────┐
│  gc-saas-server (IMTP WhatsApp)       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  imtpWhatsappStartSync ──▶ imtpWhatsappPushMessages ──▶ imtpWhatsapp │   │
│  │                              (批量上报消息)             CompleteSync  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  聚合聊天模块 (Consumer) - 通过 imtpWhatsappPollMessages 拉取消息              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

| 组件 | 职责 | 路径 |
|------|------|------|
| WhatsAppSDKV2 | 组装各层组件，提供统一 API | `apps/whatsapp/application/` |
| ReporterAdapter | 本地队列 + 异步上报 + 重试 | `apps/whatsapp/adapters/reporter/` |
| ImtpBackend | IMTP 协议实现 | `middleware/backend/imtpBackend.ts` |
| MessageQueue | 内存队列，批量刷新 | `apps/whatsapp/adapters/reporter/` |

---

## 2. 上报流程

### 2.1 实时消息上报

```
用户收到新消息
       │
       ▼
┌──────────────┐
│  WAWebAdapter │ (监听 Store.Msg.on("add"))
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ MessageService│ (过滤自己发送的消息)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ReporterAdapter│ (入队消息队列)
│ messageQueue  │
└──────┬───────┘
       │ (1秒/50条触发刷新)
       ▼
┌──────────────┐
│  ImtpBackend  │
│ pushMessages  │ (按 chatId 分组，转换为 IMTP 格式)
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ apiImtpWhatsappPushMessages          │
│ messages: [{keyId, keyRemoteJid,     │
│            version, data: {...}}]    │
└──────────────────────────────────────┘
```

### 2.2 历史消息同步

```
登录成功
   │
   ▼
┌─────────────────────────┐
│   syncService.perform   │
│     InitialSync()       │
└───────┬─────────────────┘
        │
        ├──▶ startSync(HISTORY) ──▶ 获取 syncId
        │
        ├──▶ syncConversations() ──▶ pushConversations
        │
        ├──▶ syncContacts() ──▶ pushContacts
        │
        ├──▶ syncHistoryMessages() ──▶ pushHistory (分批)
        │       (最近7天，每批100条)
        │
        └──▶ completeSync(count) ──▶ 上报完成
```

---

## 3. IMTP 消息格式

### 3.1 对比 TPCA (旧协议)

**TPCA 格式** (旧):
```typescript
{
  tpcaMessageKey: string;
  tpcaFromUserKey: string;
  tpcaToUserKey: string;
  tpcaContent: string;
  tpcaTime: string; // ISO 8601
}
```

**IMTP 格式** (新):
```typescript
{
  keyId: string;           // 消息唯一标识
  keyRemoteJid: string;    // 对话JID
  version: string;         // 版本号 (注意：string 类型)
  data: {                  // 消息内容包装层
    messageTimestamp: number;
    content: string;
    sender: {
      id: string;
      name: string;
    };
    messageType: string;
  };
}
```

### 3.2 格式转换

在 `ImtpBackend.toImtpMessageInput()` 中完成转换:

```typescript
private toImtpMessageInput(msg: MiddlewareMessage) {
  return {
    keyId: msg.messageId,
    keyRemoteJid: msg.chatId,
    version: String(msg.version),        // number → string
    data: {
      messageTimestamp: msg.timestamp,
      content: msg.content,
      sender: {
        id: msg.senderId,
        name: msg.senderId,              // 使用 senderId 作为 name
      },
      messageType: msg.messageType,
    },
  };
}
```

---

## 4. 同步会话管理

### 4.1 会话生命周期

```typescript
// 1. 开始同步
const syncId = await imtpBackend.startSync(ImtpSyncType.HISTORY);

// 2. 上报数据（可选带上 syncId）
await apiImtpWhatsappPushMessages({
  conversationJid: "12345@s.whatsapp.net",
  messages: [...],
  clientCursor: syncId,  // 关联到同步会话
});

// 3. 完成同步
await imtpBackend.completeSync(syncedCount);
```

### 4.2 同步类型

```typescript
enum ImtpSyncType {
  REALTIME = "realtime",       // 实时消息同步
  INCREMENTAL = "incremental", // 增量同步
  HISTORY = "history",         // 历史消息同步
  FULL = "full",               // 全量同步
}
```

---

## 5. 可靠性机制

### 5.1 内存队列

```typescript
this.messageQueue = new MessageQueue<QueueItem>({
  maxSize: 1000,           // 最大队列长度
  flushInterval: 1000,     // 1秒自动刷新
  flushThreshold: 50,      // 50条触发刷新
});
```

### 5.2 错误重试

队列刷新失败时，消息会重新入队:
```typescript
private async processQueue(items: QueueItem[]): Promise<void> {
  try {
    await this.processGroupedItems(type, data);
  } catch (error) {
    console.error(`Failed to process ${type}:`, error);
    data.forEach((item) => this.messageQueue.enqueue(item)); // 重新入队
  }
}
```

### 5.3 去重机制

GCEngineMiddleware 层提供去重:
```typescript
const isNew = this.#dedupe.checkAndMark(this.scope, key, now);
if (!isNew) dedupedCount += 1;
```

---

## 6. 数据流总结

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           完整数据流图                                       │
└─────────────────────────────────────────────────────────────────────────────┘

WhatsApp Web
    │
    │ 新消息事件
    ▼
┌─────────────────┐
│ MiddlewareMessage │  {messageId, chatId, senderId, content, timestamp, ...}
└────────┬────────┘
         │
         │ 入队
         ▼
┌─────────────────┐
│   MessageQueue   │  (内存队列，批量处理)
└────────┬────────┘
         │ 刷新
         ▼
┌─────────────────┐
│  ImtpBackend     │  (协议转换)
│                 │  - 按 chatId 分组
│                 │  - 转换为 IMTP 格式
│                 │  - version: number → string
│                 │  - 添加 data 包装层
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   apiImtpWhatsappPushMessages        │  GraphQL Mutation
│                                      │
│   input: {                           │
│     conversationJid: string,         │
│     messages: ImtpUpsertMessageInput[],
│     clientCursor?: string            │  // syncId
│   }                                  │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│     gc-saas-server (IMTP)            │
│                                      │
│   imtpWhatsappPushMessages           │
│     ├─ 幂等性检查 (imUserId + keyId)  │
│     ├─ 批量插入/更新                 │
│     └─ 返回: {inserted, updated,     │
│              skipped, failed}        │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│    聚合聊天 (Consumer)                │
│                                      │
│   apiImtpWhatsappPollMessages        │
│     ├─ 游标过滤: updatedAt > cursor   │
│     └─ 返回增量消息                   │
└──────────────────────────────────────┘
```

---

## 7. 文件清单

### 新增文件

| 文件路径 | 说明 |
|---------|------|
| `packages/api/src/api/apiImtpWhatsappPushMessages.ts` | 推送消息 API |
| `packages/api/src/api/apiImtpWhatsappStartSync.ts` | 开始同步 API |
| `packages/api/src/api/apiImtpWhatsappCompleteSync.ts` | 完成同步 API |
| `packages/api/src/api/apiImtpWhatsappPushConversations.ts` | 推送对话 API |
| `packages/gc-engine/src/middleware/backend/imtpBackend.ts` | IMTP Backend 实现 |

### 修改文件

| 文件路径 | 说明 |
|---------|------|
| `packages/api/src/api/index.ts` | 导出 IMTP API |
| `packages/gc-engine/src/apps/whatsapp/core/services/SyncService.ts` | 使用 IMTP 协议 |
| `packages/gc-engine/src/apps/whatsapp/adapters/reporter/ReporterAdapter.ts` | 使用 ImtpBackend |
| `packages/gc-engine/src/apps/whatsapp/application/WhatsAppSDKV2.ts` | 共享 ImtpBackend 实例 |

---

## 8. 注意事项

### 8.1 版本字段类型

IMTP 协议的 `version` 字段是 **string** 类型，而 `MiddlewareMessage` 中定义的是 **number** 类型。转换时注意:
```typescript
version: String(msg.version),  // 必须使用 String() 转换
```

### 8.2 同步会话共享

`SyncService` 和 `ReporterAdapter` 共享同一个 `ImtpBackend` 实例，确保:
- 初始同步和历史上报使用同一个 `syncId`
- 实时消息上报在同步会话期间关联到该会话

### 8.3 消息分组

`pushMessages` 方法会按 `chatId` 分组消息，然后分别调用 API。这是为了:
- 符合 IMTP API 的设计（需要传入 `conversationJid`）
- 便于服务端处理和存储

---

## 9. 参考文档

- [聚合聊天同步功能设计](2026-02-03-aggregated-chat-sync-design.md) - 消费端设计
- [IMTP WhatsApp 同步算法设计](https://github.com/...) - 后端同步算法
