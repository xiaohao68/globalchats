# 聚合聊天模块：移除 Mock 数据，切换到 GraphQL

## 概述

将聚合聊天模块从 mock 数据切换到真实 GraphQL API (`ChatTpcaPoll`)。

## 决策记录

- **方案选择**: 直接替换 mock 为真实 API（方案 A）
- **数据加载**: 纯轮询模式，通过 `ChatTpcaPoll` 获取全量 + 增量数据
- **理由**: 单一数据源，架构简洁，减少维护成本

## 改造后的数据流

```
应用启动
    ↓
AggregatedChat.tsx
useEffect → startPolling(userKey)
    ↓
syncStore.startPolling()
    ↓
PollingService (3s 间隔)
apiTpcaPoll() → ChatTpcaPoll GraphQL Query
返回: users / contacts / messages
    ↓
TpcaDataAdapter.adapt*()
转换为 Account / Contact / Message
    ↓
chatStore.mergeData()
合并、去重、构建 Conversations
    ↓
React 组件响应式更新
```

## 改动清单

### 删除的文件

```
src/modules/aggregated-chat/
├── mock/                      # 整个目录删除
│   ├── accounts.ts
│   ├── conversations.ts
│   ├── messages.ts
│   └── index.ts
└── services/
    └── mockChatService.ts     # 删除
```

### 修改的文件

| 文件 | 改动 |
|------|------|
| `AggregatedChat.tsx` | 移除 `USE_MOCK` 判断，直接调用 `startPolling()` |
| `services/index.ts` | 移除 mock 导出，简化为只导出真实服务 |
| `store/chatStore.ts` | 移除 `loadAccounts()` / `loadConversations()` 中的 mock 逻辑 |

### 保持不变

- `store/uiStore.ts` - UI 状态
- `components/*` - 所有组件
- `types/index.ts` - 类型定义
- `syncStore.ts` - 同步状态管理
- `tpcaDataAdapter.ts` - 数据适配器
- `pollingService.ts` - 轮询服务

## 实施步骤

1. 检查现有轮询实现 - 确认 `syncStore` 和 `pollingService` 可正常工作
2. 修改入口文件 - `AggregatedChat.tsx` 移除 mock 分支
3. 清理 services - 移除 `mockChatService.ts` 和相关导出
4. 清理 store - 移除 `chatStore` 中的 mock 加载逻辑
5. 删除 mock 目录 - 移除所有 mock 数据文件
6. 测试验证 - 确保应用正常启动，数据从 GQL 获取

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络断开 | syncStore 已有重试机制（指数退避，最多 5 次） |
| API 返回错误 | 显示错误提示，保留上次成功的数据 |
| 认证失败 | 提示用户重新登录 |

## 注意事项

- `startPolling(userKey)` 需要 userKey 参数，从登录状态获取
- 开发时需确保能连接 GraphQL 后端
