# 聚合聊天同步功能设计文档

**日期**: 2026-02-03
**状态**: 已确认，待实施
**相关模块**: apps/global-chat-desktop/src/modules/aggregated-chat

---

## 1. 概述

本设计文档定义聚合聊天模块作为**消费客户端**与服务端的消息同步机制。

### 1.1 同步模式

聚合聊天模块采用 **纯轮询模式** 从服务端同步消息：

- **协议**: GraphQL API (`imtpWhatsappPollMessages`)
- **频率**: 全局统一轮询，每 5 秒一次
- **存储**: 仅内存存储 (Memory Only)，页面刷新后重新全量加载
- **错误处理**: 静默重试 3 次，指数退避

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     聚合聊天模块 (Consumer)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   UI Store   │  │  Chat Store  │  │    Sync Store    │  │
│  │  (持久化UI)   │  │  (内存数据)   │  │  (同步状态管理)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│                    ┌──────┴──────┐                         │
│                    │  SyncEngine │ ◄── 全局轮询调度器        │
│                    │  (新组件)   │                         │
│                    └──────┬──────┘                         │
│                           │ pollMessages()                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ GraphQL
┌───────────────────────────┼─────────────────────────────────┐
│  gc-saas-server          │  游标过滤：updatedAt > clientCursor│
│  (IMTP WhatsApp)         │  返回：messages + nextCursor     │
└───────────────────────────┴─────────────────────────────────┘
```

---

## 2. 核心设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 同步策略 | 纯轮询模式 | 后端接口支持，实现简单，足够当前需求 |
| 本地存储 | Memory Only | 保持架构简单，页面刷新后重新全量加载 |
| 轮询方式 | 全局统一轮询 (5秒) | 实现简单，资源占用可控 |
| 错误处理 | 静默重试 (3次) | 用户体验友好，避免过度打扰 |
| 游标存储 | 内存 Map | 按 imUserId 存储 clientCursor |

---

## 3. 数据模型

### 3.1 同步游标

```typescript
interface SyncCursor {
  imUserId: string;        // WhatsApp 账号ID
  clientCursor: string;    // 最后同步时间戳 (ms)
  lastSyncAt: number;      // 上次成功同步时间
}
```

### 3.2 API 接口

**请求**:
```typescript
interface ImtpPollMessagesInput {
  imUserId: string;        // 指定账号
  clientCursor?: string;   // 游标 (可选，首次不传)
  limit: number;           // 默认100，最大200
}
```

**响应**:
```typescript
interface ImtpPollMessagesResult {
  messages: ImtpMessage[];
  nextCursor: string | null;  // 下批数据游标
  hasMore: boolean;           // 是否还有更多
}
```

### 3.3 消息数据结构

```typescript
interface ImtpMessage {
  id: string;
  keyId: string;           // 消息唯一标识
  keyRemoteJid: string;    // 对话JID
  data: {
    messageTimestamp: number;
    content: string;
    sender: {
      id: string;
      name: string;
    };
  };
  version: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. 同步流程

### 4.1 首次加载流程

```
用户打开聚合聊天
       │
       ▼
┌──────────────┐
│ initialLoad()│
└──────┬───────┘
       │
       ├──► 获取账号列表 (getAccounts)
       │
       ├──► 获取对话列表 (getConversations, limit=50)
       │
       └──► 初始化游标为当前时间戳
```

### 4.2 轮询同步流程

```
启动轮询 (5秒间隔)
       │
       ▼
┌──────────────┐
│    poll()    │
└──────┬───────┘
       │
       ├──► 遍历所有账号
       │         │
       │         ├──► 调用 pollMessages({imUserId, clientCursor})
       │         │
       │         ├──► 有数据? ──► mergeData() 合并到 ChatStore
       │         │
       │         └──► 更新游标 (nextCursor)
       │
       └──► 重置重试计数
```

### 4.3 增量合并策略

当轮询返回新消息时：

1. **消息合并**: 按 `keyId` 去重，新消息追加到对应对话
2. **对话更新**: 更新 `lastMessage` / `lastActivityAt` / `unreadCount`
3. **排序维护**: 对话按 `lastActivityAt` 降序排列

---

## 5. 错误处理

### 5.1 错误处理策略

| 场景 | 处理方式 |
|------|----------|
| 网络瞬时失败 | 静默重试，指数退避 (1s → 2s → 4s) |
| 连续3次失败 | 显示错误提示，暂停轮询，用户手动恢复 |
| 服务端返回空数据 | 正常继续，不更新游标 |
| 页面切换后台 | 保持轮询（5秒间隔资源占用可接受） |

### 5.2 重试逻辑

```typescript
private handleError(error: Error): void {
  this.retryCount++;
  if (this.retryCount <= this.MAX_RETRIES) {
    // 指数退避
    const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000);
    setTimeout(() => this.poll(), delay);
  } else {
    // 显示错误，暂停轮询
    useSyncStore.getState().setError('同步失败，请检查网络连接');
  }
}
```

---

## 6. 组件设计

### 6.1 SyncEngine 类

```typescript
class SyncEngine {
  private pollTimer: NodeJS.Timeout | null = null;
  private cursors: Map<string, string> = new Map();
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 3;
  private readonly POLL_INTERVAL = 5000;

  async initialLoad(): Promise<void>;
  startPolling(): void;
  stopPolling(): void;
  private async poll(): Promise<void>;
  private handleError(error: Error): void;
}
```

### 6.2 状态管理扩展

**SyncStore 新增状态**:
```typescript
interface SyncState {
  isPolling: boolean;
  lastSyncAt: number | null;
  error: string | null;
  errorCount: number;

  // Actions
  startPolling(): void;
  stopPolling(): void;
  setError(error: string | null): void;
}
```

**ChatStore 新增 Action**:
```typescript
interface ChatState {
  // ... 现有状态

  // 新增
  mergeData(params: {
    accountId: string;
    messages: ImtpMessage[];
  }): void;
}
```

---

## 7. UI 集成

### 7.1 生命周期管理

```typescript
// AggregatedChat.tsx
function AggregatedChat() {
  useEffect(() => {
    syncEngine.initialLoad().then(() => {
      syncEngine.startPolling();
    });

    return () => {
      syncEngine.stopPolling();
    };
  }, []);

  // ...
}
```

### 7.2 同步状态指示器

在侧边栏头部添加轻量级状态指示：

| 状态 | UI 表现 |
|------|---------|
| 正常 | 绿色小点或隐藏 |
| 同步中 | 旋转图标 |
| 失败 | 红色警告图标 + 点击重试 |

---

## 8. 文件变更清单

### 新增文件

```
services/
├── SyncEngine.ts                    # 同步调度器 (核心)
└── index.ts                         # 导出 syncEngine 实例

api/
└── imtpWhatsappPollMessages.ts      # GraphQL API 封装
```

### 修改文件

```
store/
├── syncStore.ts                     # 添加 polling 状态
└── chatStore.ts                     # 添加 mergeData action

components/
├── AggregatedChat.tsx               # 集成生命周期
└── sidebar/
    └── ChatSidebarHeader.tsx        # 添加同步状态指示器
```

---

## 9. 接口对接

### 9.1 GraphQL API

```graphql
mutation ImtpWhatsappPollMessages($input: ImtpPollMessagesInput!) {
  imtpWhatsappPollMessages(input: $input) {
    messages {
      id
      keyId
      keyRemoteJid
      data {
        messageTimestamp
        content
        sender {
          id
          name
        }
      }
      version
      createdAt
      updatedAt
    }
    nextCursor
    hasMore
  }
}
```

### 9.2 与后端 IMTP 对接

聚合聊天模块通过 `@gc/api` 包调用后端 IMTP WhatsApp 模块提供的 `imtpWhatsappPollMessages` 接口，实现消费客户端的消息拉取同步。

---

## 10. 性能考虑

### 10.1 轮询优化

- **5秒间隔**: 平衡实时性和服务器压力
- **批量获取**: 每次最多 100 条消息
- **增量同步**: 仅获取 `updatedAt > clientCursor` 的数据

### 10.2 内存管理

- 消息仅内存存储，页面关闭自动释放
- 对话列表限制加载数量（首次 50 条）
- 消息列表虚拟滚动（已存在功能）

---

## 11. 后续优化方向

1. **WebSocket 实时推送**: 当后端支持 WebSocket 时，可降级为 WebSocket + 轮询补偿模式
2. **IndexedDB 本地持久化**: 如需离线查看历史，可添加 IndexedDB 存储层
3. **智能轮询频率**: 根据用户活跃度动态调整轮询间隔

---

## 12. 参考文档

- [IMTP WhatsApp 同步算法设计](../../IMTP%20WhatsApp%20客户端-服务器同步算法设计.md)
- [聚合聊天架构文档](../architecture/aggregated-chat.md) (如存在)
