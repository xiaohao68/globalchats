# Global Chats 数据库设计 v2 - 修复对比说明

**版本**: v2 (2026-10-10)
**作者**: WorkBuddy AI
**审核反馈来源**: 第三方模型评审

---

## 一、v1 → v2 修复对比表

| 编号 | 严重级 | v1 问题 | v2 修复 | 修复方式 |
|---|---|---|---|---|
| **E1** | 致命 | 无 user 表 | ✅ 已有 | `user` 表 + 全表 user_id FK |
| **E2** | 致命 | `monitoring_config` 按 (user, platform) 唯一 → 一人只能一号 | ✅ 已修 | 改为按 `platform_account_id` 唯一，支持一人多号 |
| **E3** | 重要 | 无发送队列 | ✅ 已加 | 新增 `message_outbox` 表（status 状态机） |
| **E4** | 重要 | 无代理/指纹字段 | ✅ 已加 | 新增 `proxy_config` 表 + `platform_account.user_agent/fingerprint/proxy_id` 字段 |
| **E5** | 重要 | 无附件表 | ✅ 已加 | 新增 `attachment` 表（图片/视频/文件/语音） |
| **E6** | 重要 | message 无 agent 归属 | ✅ 已修 | `message.agent_user_id` FK 回 user 表 |
| **E7** | 中等 | message 无幂等键 | ✅ 已修 | `UNIQUE(conversation_id, external_message_id)` |
| **E8** | 中等 | customer 唯一约束不严 | ✅ 已修 | 改为 `UNIQUE(user_id, external_id)` 跨平台全局 |
| **E9** | 中等 | 全表缺时间戳 | ✅ 已修 | 所有表都有 `created_at/updated_at` |
| **E10** | 中等 | conversation 缺 status/assignee | ✅ 已修 | 加 `status (active/archived/closed/snoozed)` 和 `assignee_id` |
| **E11** | 中等 | 无增量同步游标 | ✅ 已修 | `monitoring_config.sync_cursor JSONB` |

---

## 二、决策点确认（D1-D3）

| 决策点 | 选择 | 含义 |
|---|---|---|
| D1 账号归属模式 | ✅ 业务员各自绑定自己的账号（私有） | 简单清晰，admin 可看全部但默认各自看各自 |
| D2 是否要聚合页直接回复 | ✅ 要，走发送队列 | 不直接调平台 API，先入 message_outbox 异步发送 |
| D3 是否保留代理/指纹防关联 | ✅ 要 | 多账号防封是核心价值，proxy_config + fingerprint 字段是核心 |

---

## 三、v2 表结构（10 张表）

```
┌─────────────────────────────────────────────────────────────┐
│                      顶层：user (业务员)                      │
│  id, username, password_hash, display_name, role, status   │
└──────────────────┬──────────────────────────────────────────┘
                   │ 1:N
       ┌───────────┼────────────────┬────────────────┐
       ▼           ▼                ▼                ▼
┌──────────┐ ┌──────────┐  ┌───────────────┐  ┌──────────────┐
│  proxy   │ │ platform │  │  monitoring   │  │ customer     │
│  config  │ │  account │  │    config     │  │              │
└──────────┘ └────┬─────┘  └───────┬───────┘  └──────┬───────┘
              N:1 │             N:1 │             N:1│
                  ▼                ▼                ▼
            ┌──────────┐    ┌──────────┐     ┌──────────────┐
            │  user    │    │ platform │     │  customer    │
            │          │    │  account │     │  _label      │
            └──────────┘    └──────────┘     └──────────────┘
                                  │
                                  │ 1:N
                                  ▼
                            ┌──────────────┐
                            │ conversation │──→ assignee_id → user
                            │              │
                            └──────┬───────┘
                                   │ 1:N
                          ┌────────┴────────┐
                          ▼                 ▼
                    ┌──────────┐      ┌──────────────┐
                    │ message  │      │message_outbox│
                    │          │      │(发送队列)     │
                    └────┬─────┘      └──────────────┘
                         │ 1:N
                         ▼
                   ┌──────────┐
                   │attachment│
                   │ (附件)   │
                   └──────────┘
```

### 1. user（业务员）
- `id`, `username` (UK), `password_hash`, `display_name`, `email`, `role (admin/member)`, `is_active`, `last_login_at`, 时间戳

### 2. platform_account（平台账号，一人可多个）
- `id`, `user_id` (FK), `platform (telegram/...)`, `account_name`, `external_id`, `login_status`
- **E4 防关联**：`user_agent`, `fingerprint (JSONB)`, `proxy_id (FK→proxy_config)`
- `UNIQUE(user_id, platform, external_id)` ← 允许张三在 Telegram 有多个号

### 3. proxy_config（代理池）
- `id`, `user_id`, `proxy_type (http/https/socks5)`, `host`, `port`, `username`, `password`, `country`, `is_active`

### 4. monitoring_config（每个平台账号独立配置）
- `id`, `user_id`, `platform_account_id` (FK, UK)
- `is_active`, `monitoring_mode (realtime/polling/disabled)`, `poll_interval_sec`
- **E11**：`last_sync_at`, `sync_cursor (JSONB)`, `last_error`

### 5. customer（客户/联系人）
- `id`, `user_id`, `platform_account_id`, `external_id`, `name`, `is_group`, `is_online`
- **E8**：`UNIQUE(user_id, external_id)`（跨平台全局唯一）

### 6. customer_label（客户标签）
- `id`, `user_id`, `customer_id`, `label_name`, `color`
- `UNIQUE(user_id, customer_id, label_name)`

### 7. conversation（会话）
- `id`, `user_id`, `platform_account_id`, `customer_id`
- `last_message_preview`, `last_message_at`, `unread_count`
- **E10**：`status (active/archived/closed/snoozed)`, `assignee_id` (FK→user)
- `is_pinned`, `is_archived`

### 8. message（消息，核心数据）
- `id`, `user_id`, `conversation_id`
- **E6**：`agent_user_id` (FK→user, NULL=客户发的)
- **E7**：`external_message_id` + `UNIQUE(conversation_id, external_message_id)`
- `sender_type`, `sender_name`, `content`, `content_type`, `platform`, `sent_at`, `received_at`, `status`

### 9. attachment（附件）
- `id`, `user_id`, `message_id`, `file_type`, `file_url`, `local_path`
- `file_name`, `file_size`, `mime_type`, `width`, `height`, `duration`, `thumbnail_url`

### 10. message_outbox（发送队列）
- `id`, `user_id`, `conversation_id`, `agent_user_id`
- `content`, `content_type`, `media_url`
- **状态机**：`status (pending/sending/sent/failed)` + `retry_count` + `max_retry` + `last_error`
- `scheduled_at`（定时发送）, `sent_at`（实际发送时间）, `external_message_id`（成功后回填）

---

## 四、关键 SQL 验证查询

```sql
-- 1. 验证 E2 修复：张三可以在 Telegram 有多个号
SELECT u.display_name, pa.platform, pa.account_name
FROM "user" u
JOIN platform_account pa ON pa.user_id = u.id
WHERE u.username = 'zhangsan' AND pa.platform = 'telegram';
-- 期望：2 行（主号 + 业务号）

-- 2. 验证 E7 修复：同一消息入库两次会失败
INSERT INTO message (user_id, conversation_id, external_message_id, ...)
VALUES (2, 1, 'tg_msg_001', ...);
-- 期望：UNIQUE 约束报错（已存在）

-- 3. 验证 E10 修复：可按 assignee 找会话
SELECT c.id, c.last_message_preview, c.status, u.display_name AS owner
FROM conversation c
LEFT JOIN "user" u ON u.id = c.assignee_id
WHERE c.assignee_id = 2 AND c.status = 'active';
-- 期望：张三所有未归档的活跃会话

-- 4. 验证 E11 修复：每个平台账号独立增量游标
SELECT pa.account_name, mc.monitoring_mode, mc.last_sync_at, mc.sync_cursor
FROM monitoring_config mc
JOIN platform_account pa ON pa.id = mc.platform_account_id
WHERE mc.user_id = 2;
-- 期望：每个账号有独立的 last_sync_at + cursor

-- 5. 验证 E4 修复：每个平台账号独立代理
SELECT pa.account_name, pa.user_agent, p.host, p.port, p.country
FROM platform_account pa
LEFT JOIN proxy_config p ON p.id = pa.proxy_id
WHERE pa.user_id = 2;
-- 期望：每个账号有自己绑定的代理

-- 6. 聚合页面查询：所有平台未读消息按时间倒序（用于聚合视图）
SELECT m.id, m.platform, c.name AS customer_name, m.content, m.received_at, m.unread_count
FROM message m
JOIN conversation c ON c.id = m.conversation_id
WHERE m.user_id = 2 AND c.unread_count > 0
ORDER BY m.received_at DESC
LIMIT 20;

-- 7. 发送队列查询：待发送/失败重发
SELECT o.id, o.content, o.status, o.retry_count, o.last_error, o.scheduled_at
FROM message_outbox o
WHERE o.user_id = 2 AND o.status IN ('pending', 'failed')
ORDER BY o.scheduled_at ASC;
```

---

## 五、执行方式

```bash
# 1. 登录 PostgreSQL
psql -U postgres -d globalchats

# 2. 执行 schema
\i C:/Users/Kulon/Desktop/gc/database/schema_v2.sql

# 3. 验证表数量
\dt
-- 期望：10 张表

# 4. 验证数据
SELECT COUNT(*) FROM "user";           -- 3
SELECT COUNT(*) FROM platform_account; -- 6
SELECT COUNT(*) FROM message;          -- 12
```

---

## 六、与 v1 对比的优势

| 维度 | v1 | v2 |
|---|---|---|
| 表数量 | 7 | 10 |
| 索引 | 12 | 24 |
| 多账号支持 | ❌ | ✅ 一人多号 + 独立代理 |
| 发送链路 | ❌ | ✅ 异步队列 + 失败重试 |
| 附件存储 | ❌ | ✅ 独立 attachment 表 |
| 防关联 | ❌ | ✅ proxy + fingerprint + UA |
| 会话分配 | ❌ | ✅ assignee + status |
| 增量同步 | ❌ | ✅ sync_cursor |
| 幂等防重 | ❌ | ✅ external_message_id UNIQUE |
