-- ============================================================
-- Global Chats 多用户多平台聚合系统 - 数据库建表脚本 v2
-- 数据库: globalchats
-- 类型: PostgreSQL 18.3
-- 日期: 2026-10-10
-- 作者: WorkBuddy AI
--
-- v2 修复的 11 个问题（来自第三方评审）:
--   E1 ✅ 已有 user 表
--   E2 ✅ monitoring_config 改为按 platform_account 唯一（一人多号）
--   E3 ✅ 新增 message_outbox 发送队列表
--   E4 ✅ 新增 proxy_config 代理表 + user_agent/fingerprint 字段
--   E5 ✅ 新增 attachment 附件表
--   E6 ✅ message.agent_user_id FK 回 user
--   E7 ✅ message.external_message_id 设为 UNIQUE（幂等）
--   E8 ✅ customer 跨平台 (user_id, external_id) 唯一
--   E9 ✅ 全表 created_at/updated_at
--   E10 ✅ conversation 加 status/assignee_id
--   E11 ✅ monitoring_config 加 sync_cursor JSONB
-- ============================================================

-- 清理旧表（如有）
DROP TABLE IF EXISTS attachment CASCADE;
DROP TABLE IF EXISTS message_outbox CASCADE;
DROP TABLE IF EXISTS message CASCADE;
DROP TABLE IF EXISTS conversation CASCADE;
DROP TABLE IF EXISTS customer_label CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS monitoring_config CASCADE;
DROP TABLE IF EXISTS proxy_config CASCADE;
DROP TABLE IF EXISTS platform_account CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- ============================================================
-- 1. user 表 - 业务员账号（多用户核心）
-- ============================================================
CREATE TABLE "user" (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    email           VARCHAR(255),
    role            VARCHAR(20)  NOT NULL DEFAULT 'member',  -- admin / member
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  "user"             IS '业务员账号表';
COMMENT ON COLUMN "user".role        IS 'admin=管理员(看全部) / member=业务员(只看自己)';

-- ============================================================
-- 2. platform_account 表 - 平台账号（一人多号支持）
-- ============================================================
CREATE TABLE platform_account (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    platform        VARCHAR(20)  NOT NULL,  -- telegram/tiktok/linkedin/messenger/facebook/teams
    account_name    VARCHAR(255),           -- 平台账号显示名
    external_id     VARCHAR(255),           -- 平台侧账号ID
    avatar_url      TEXT,
    login_status    VARCHAR(20)  NOT NULL DEFAULT 'logged_out',  -- logged_in / logged_out
    last_login_at   TIMESTAMP,
    cookie_data     TEXT,                   -- 存储登录cookie（加密）
    -- E4: 防指纹字段（每个平台账号独立 UA/指纹，防止多账号被关联）
    user_agent      TEXT,                   -- 自定义 User-Agent
    fingerprint     JSONB,                  -- 浏览器指纹 (canvas/font/timezone)
    proxy_id        INTEGER,                -- 该账号使用哪个代理（E4）
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    -- 注意：去掉了 UNIQUE(user_id, platform) - 改为人-平台-账号都唯一
    UNIQUE(user_id, platform, external_id)
);
COMMENT ON TABLE  platform_account            IS '业务员的各平台账号（一人多号）';
COMMENT ON COLUMN platform_account.user_agent IS '该账号独立 UA（防关联）';
COMMENT ON COLUMN platform_account.fingerprint IS '浏览器指纹（防关联）';
CREATE INDEX idx_platform_account_user        ON platform_account(user_id);
CREATE INDEX idx_platform_account_proxy       ON platform_account(proxy_id);

-- ============================================================
-- 3. proxy_config 表 - 代理配置（E4 防关联核心）
-- ============================================================
CREATE TABLE proxy_config (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    proxy_type      VARCHAR(10)  NOT NULL,  -- http/https/socks5
    host            VARCHAR(255) NOT NULL,
    port            INTEGER      NOT NULL,
    username        VARCHAR(255),           -- 代理认证账号
    password        VARCHAR(255),           -- 代理认证密码
    country         VARCHAR(50),            -- 国家代码 (US/JP/DE 等)
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_test_at    TIMESTAMP,
    last_test_ok    BOOLEAN,
    remark          VARCHAR(255),
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  proxy_config           IS '业务员代理池（每个平台账号可绑定一个独立代理防关联）';
COMMENT ON COLUMN proxy_config.proxy_type IS 'http/https/socks5';
CREATE INDEX idx_proxy_user              ON proxy_config(user_id);
CREATE INDEX idx_proxy_active            ON proxy_config(user_id, is_active);

-- 给 platform_account.proxy_id 加外键
ALTER TABLE platform_account
    ADD CONSTRAINT fk_platform_account_proxy
    FOREIGN KEY (proxy_id) REFERENCES proxy_config(id) ON DELETE SET NULL;

-- ============================================================
-- 4. monitoring_config 表 - 监听配置（E2 改：按账号独立配置）
-- ============================================================
CREATE TABLE monitoring_config (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    platform_account_id INTEGER      NOT NULL REFERENCES platform_account(id) ON DELETE CASCADE,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    monitoring_mode     VARCHAR(20)  NOT NULL DEFAULT 'realtime',   -- realtime / polling / disabled
    poll_interval_sec   INTEGER      DEFAULT 30,                    -- 轮询间隔
    last_sync_at        TIMESTAMP,
    last_error          TEXT,
    -- E11: 增量同步游标（每个账号独立存）
    sync_cursor         JSONB,                                       -- 平台侧 offset/cursor
    config              JSONB,                                       -- 平台特有配置
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE(platform_account_id)  -- 每个平台账号只能有一条监听配置
);
COMMENT ON TABLE  monitoring_config                 IS '每个平台账号独立的监听配置';
COMMENT ON COLUMN monitoring_config.sync_cursor    IS '平台侧增量游标（E11）';
COMMENT ON COLUMN monitoring_config.poll_interval_sec IS '轮询模式时的间隔秒数';
CREATE INDEX idx_monitoring_user                   ON monitoring_config(user_id);

-- ============================================================
-- 5. customer 表 - 客户/联系人（E8 跨平台唯一）
-- ============================================================
CREATE TABLE customer (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    platform_account_id INTEGER      NOT NULL REFERENCES platform_account(id) ON DELETE CASCADE,
    external_id         VARCHAR(255) NOT NULL,     -- 平台侧用户ID
    name                VARCHAR(255),
    avatar_url          TEXT,
    phone               VARCHAR(50),
    email               VARCHAR(255),
    is_group            BOOLEAN      NOT NULL DEFAULT FALSE,   -- 是否群聊
    member_count        INTEGER,                                -- 群成员数
    is_online           BOOLEAN      NOT NULL DEFAULT FALSE,   -- 在线状态
    last_seen_at        TIMESTAMP,
    -- E4: 备注/标签字段保留
    raw_data            JSONB,                                  -- 平台特有数据
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    -- E8: 一个用户下，external_id 全局唯一（跨平台也不会重复入库）
    UNIQUE(user_id, external_id)
);
COMMENT ON TABLE  customer            IS '客户/联系人（每个业务员独立）';
COMMENT ON COLUMN customer.external_id IS '平台侧用户唯一标识';
CREATE INDEX idx_customer_user            ON customer(user_id);
CREATE INDEX idx_customer_platform        ON customer(platform_account_id);

-- ============================================================
-- 6. customer_label 表 - 客户标签/分类
-- ============================================================
CREATE TABLE customer_label (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    customer_id     INTEGER      NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    label_name      VARCHAR(50)  NOT NULL,
    color           VARCHAR(7)   DEFAULT '#25D366',
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, customer_id, label_name)
);
COMMENT ON TABLE customer_label IS '客户标签/分类（如：重点客户、待跟进、已成交）';

-- ============================================================
-- 7. conversation 表 - 会话（E10 加 status/assignee）
-- ============================================================
CREATE TABLE conversation (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    platform_account_id     INTEGER      NOT NULL REFERENCES platform_account(id) ON DELETE CASCADE,
    customer_id             INTEGER      NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    external_conversation_id VARCHAR(255),                    -- 平台侧会话ID
    conversation_type       VARCHAR(20)  NOT NULL DEFAULT 'private',  -- private / group
    last_message_preview    TEXT,                               -- 最新消息预览
    last_message_at         TIMESTAMP,                          -- 最新消息时间
    unread_count            INTEGER      NOT NULL DEFAULT 0,    -- 未读消息数
    -- E10: 状态与分配
    status                  VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active / archived / closed / snoozed
    assignee_id             INTEGER      REFERENCES "user"(id) ON DELETE SET NULL,  -- 谁负责（管理员可分配）
    is_pinned               BOOLEAN      NOT NULL DEFAULT FALSE,
    is_archived             BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    -- 同一平台账号下，同一 customer 的会话不能重复
    UNIQUE(platform_account_id, customer_id, external_conversation_id)
);
COMMENT ON TABLE  conversation                  IS '会话/聊天线程';
COMMENT ON COLUMN conversation.status          IS 'active=活跃 / archived=已归档 / closed=已关闭 / snoozed=已静音';
COMMENT ON COLUMN conversation.assignee_id     IS '负责此会话的业务员（管理员可分配）';
CREATE INDEX idx_conversation_user             ON conversation(user_id);
CREATE INDEX idx_conversation_customer         ON conversation(customer_id);
CREATE INDEX idx_conversation_last_msg         ON conversation(last_message_at DESC);
CREATE INDEX idx_conversation_assignee         ON conversation(assignee_id);
CREATE INDEX idx_conversation_status           ON conversation(user_id, status);

-- ============================================================
-- 8. message 表 - 消息（E6/E7 修复：agent_user_id + 幂等键）
-- ============================================================
CREATE TABLE message (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    conversation_id     INTEGER      NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    -- E6: 业务员回复归属（NULL 表示客户发的）
    agent_user_id       INTEGER      REFERENCES "user"(id) ON DELETE SET NULL,
    -- E7: 平台侧消息ID（幂等键）
    external_message_id VARCHAR(255) NOT NULL,
    sender_type         VARCHAR(20)  NOT NULL DEFAULT 'customer',  -- customer / agent / system
    sender_external_id  VARCHAR(255),                          -- 发送者平台侧ID
    sender_name         VARCHAR(255),                          -- 发送者显示名
    content             TEXT,                                  -- 消息文本内容
    content_type        VARCHAR(20)  NOT NULL DEFAULT 'text',  -- text/image/video/file/audio/sticker/location/system
    media_url           TEXT,                                  -- 媒体文件URL（如果有）
    platform            VARCHAR(20)  NOT NULL,                 -- 来源平台
    sent_at             TIMESTAMP,                             -- 平台侧发送时间
    received_at         TIMESTAMP    NOT NULL DEFAULT NOW(),   -- 系统接收时间
    status              VARCHAR(20)  NOT NULL DEFAULT 'received',  -- received/read/failed
    raw_data            JSONB,                                 -- 平台原始数据
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    -- E7: 同一会话内平台侧消息ID幂等（防重复入库）
    UNIQUE(conversation_id, external_message_id)
);
COMMENT ON TABLE  message                IS '消息表（核心数据）';
COMMENT ON COLUMN message.agent_user_id  IS 'NULL=客户发的 / 有值=该业务员发的';
COMMENT ON COLUMN message.external_message_id IS '平台侧消息ID，结合 conversation_id 唯一';
CREATE INDEX idx_message_user             ON message(user_id);
CREATE INDEX idx_message_conversation     ON message(conversation_id);
CREATE INDEX idx_message_platform         ON message(platform);
CREATE INDEX idx_message_received         ON message(received_at DESC);
CREATE INDEX idx_message_agent            ON message(agent_user_id);

-- ============================================================
-- 9. attachment 表 - 附件（E5 媒体独立存储）
-- ============================================================
CREATE TABLE attachment (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    message_id      INTEGER      NOT NULL REFERENCES message(id) ON DELETE CASCADE,
    file_type       VARCHAR(20)  NOT NULL,  -- image/video/audio/file/voice/sticker
    file_url        TEXT,                  -- 远程URL（平台源）
    local_path      TEXT,                  -- 本地缓存路径（如果下载过）
    file_name       VARCHAR(255),
    file_size       BIGINT,                -- 字节
    mime_type       VARCHAR(100),
    width           INTEGER,               -- 图片/视频宽度
    height          INTEGER,               -- 图片/视频高度
    duration        INTEGER,               -- 音视频时长（秒）
    thumbnail_url   TEXT,                  -- 缩略图
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE attachment IS '消息附件（图片/视频/文件/语音）';
CREATE INDEX idx_attachment_user     ON attachment(user_id);
CREATE INDEX idx_attachment_message  ON attachment(message_id);

-- ============================================================
-- 10. message_outbox 表 - 发送队列（E3 业务闭环核心）
-- ============================================================
CREATE TABLE message_outbox (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    conversation_id     INTEGER      NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
    agent_user_id       INTEGER      NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,  -- 谁发的
    content             TEXT,
    content_type        VARCHAR(20)  NOT NULL DEFAULT 'text',
    media_url           TEXT,
    -- 状态机: pending -> sending -> sent / failed
    status              VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending/sending/sent/failed
    retry_count         INTEGER      NOT NULL DEFAULT 0,
    max_retry           INTEGER      NOT NULL DEFAULT 3,
    last_error          TEXT,
    scheduled_at        TIMESTAMP,                              -- 定时发送
    sent_at             TIMESTAMP,                              -- 实际发送时间
    external_message_id VARCHAR(255),                           -- 平台侧返回的消息ID（成功后填）
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  message_outbox               IS '消息发送队列（业务员发送的消息先入队再投递平台）';
COMMENT ON COLUMN message_outbox.status        IS 'pending=待发 / sending=发送中 / sent=已发 / failed=失败';
CREATE INDEX idx_outbox_user                   ON message_outbox(user_id);
CREATE INDEX idx_outbox_conversation           ON message_outbox(conversation_id);
CREATE INDEX idx_outbox_status                 ON message_outbox(status, scheduled_at);
CREATE INDEX idx_outbox_agent                  ON message_outbox(agent_user_id);

-- ============================================================
-- 索引优化（补充）
-- ============================================================
CREATE INDEX idx_monitoring_sync_at            ON monitoring_config(last_sync_at DESC);

-- ============================================================
-- 插入测试数据
-- ============================================================

-- 测试业务员账号（密码 123456，bcrypt 占位 hash）
INSERT INTO "user" (username, password_hash, display_name, email, role) VALUES
    ('admin',    '$2b$10$placeholder_hash_here', '管理员',   'admin@company.com',    'admin'),
    ('zhangsan', '$2b$10$placeholder_hash_here', '张三',     'zhangsan@company.com', 'member'),
    ('lisi',     '$2b$10$placeholder_hash_here', '李四',     'lisi@company.com',     'member');

-- 代理池（E4）
INSERT INTO proxy_config (user_id, proxy_type, host, port, country, remark) VALUES
    (2, 'http', '127.0.0.1', 7897, 'CN', '本地ClashVerge代理'),
    (2, 'socks5', 'us-proxy.example.com', 1080, 'US', '美国号专用'),
    (3, 'http', '127.0.0.1', 7897, 'CN', '本地ClashVerge代理');

-- 平台账号（E2 修复：一人多号，张三在 Telegram 也有 2 个号）
INSERT INTO platform_account (user_id, platform, account_name, external_id, login_status, user_agent, proxy_id) VALUES
    -- 张三
    (2, 'telegram', '张三主号',  'zhangsan_tg_main',  'logged_in',  'Mozilla/5.0 ... Mac OS',  1),
    (2, 'telegram', '张三业务号','zhangsan_tg_biz',    'logged_in',  'Mozilla/5.0 ... Windows', 2),
    (2, 'facebook', '张三的Facebook', 'zhangsan_fb',  'logged_in',  'Mozilla/5.0 ... Mac OS',  1),
    (2, 'linkedin', '张三的LinkedIn', 'zhangsan_li',  'logged_out', NULL,                     NULL),
    -- 李四
    (3, 'telegram', '李四的Telegram', 'lisi_tg',      'logged_in',  'Mozilla/5.0 ... Linux',   3),
    (3, 'messenger','李四的Messenger','lisi_ms',      'logged_in',  'Mozilla/5.0 ... Linux',   3);

-- 监听配置（E2 修复：按 platform_account_id 唯一）
INSERT INTO monitoring_config (user_id, platform_account_id, is_active, monitoring_mode, poll_interval_sec, last_sync_at, sync_cursor) VALUES
    (2, 1, TRUE,  'realtime', NULL, NOW() - INTERVAL '5 min',  '{"offset": 1234}'::jsonb),
    (2, 2, TRUE,  'realtime', NULL, NOW() - INTERVAL '10 min', '{"offset": 567}'::jsonb),
    (2, 3, TRUE,  'realtime', NULL, NOW() - INTERVAL '3 min',  NULL),
    (2, 4, FALSE, 'disabled', NULL, NULL,                     NULL),
    (3, 5, TRUE,  'realtime', NULL, NOW() - INTERVAL '8 min',  NULL),
    (3, 6, TRUE,  'realtime', NULL, NOW() - INTERVAL '2 min',  NULL);

-- 客户（E8 修复：跨平台唯一）
INSERT INTO customer (user_id, platform_account_id, external_id, name, is_group, is_online) VALUES
    -- 张三
    (2, 1, 'john_davis',    'John Davis',    FALSE, TRUE),
    (2, 1, 'sarah_miller',  'Sarah Miller',  FALSE, FALSE),
    (2, 1, 'ahmed_benali',  'Ahmed Benali',  FALSE, TRUE),
    (2, 2, 'trade_partner', 'Trade Partner A',FALSE, FALSE),  -- 张三业务号的客户
    (2, 3, 'emma_wilson',   'Emma Wilson',   FALSE, FALSE),
    (2, 3, 'trade_group_us','美国贸易群',     TRUE,  FALSE),
    -- 李四
    (3, 5, 'robert_lee',   'Robert Lee',   FALSE, TRUE),
    (3, 5, 'sophia_brown', 'Sophia Brown', FALSE, FALSE),
    (3, 6, 'david_chen',   'David Chen',   FALSE, TRUE);

-- 会话（E10 修复：加 status/assignee）
INSERT INTO conversation (user_id, platform_account_id, customer_id, conversation_type, last_message_preview, last_message_at, unread_count, status, assignee_id) VALUES
    -- 张三
    (2, 1, 1, 'private', 'Hi, interested in your products', NOW() - INTERVAL '2 hours', 2, 'active', 2),
    (2, 1, 2, 'private', 'Can you send the catalog?',       NOW() - INTERVAL '4 hours', 0, 'active', 2),
    (2, 1, 3, 'private', 'Price for bulk order?',           NOW() - INTERVAL '6 hours', 1, 'active', 2),
    (2, 2, 4, 'private', 'Need 1000 units, FOB price?',     NOW() - INTERVAL '1 hour',  3, 'active', 2),
    (2, 3, 5, 'private', 'Do you ship to Germany?',         NOW() - INTERVAL '1 hour',  1, 'active', 2),
    (2, 3, 6, 'group',   '大家好，新订单已收到',              NOW() - INTERVAL '3 hours', 0, 'active', 2),
    (2, 1, 2, 'private', 'Old conversation',                NOW() - INTERVAL '30 days', 0, 'archived', 2),
    -- 李四
    (3, 5, 7, 'private', 'Saw your post about the product', NOW() - INTERVAL '3 hours', 0, 'active', 3),
    (3, 5, 8, 'private', 'Can we schedule a call?',         NOW() - INTERVAL '5 hours', 1, 'active', 3),
    (3, 6, 9, 'private', 'Meeting notes attached',          NOW() - INTERVAL '1 hour',  1, 'active', 3);

-- 消息（E6 修复：agent_user_id；E7 修复：external_message_id 唯一）
INSERT INTO message (user_id, conversation_id, agent_user_id, external_message_id, sender_type, sender_name, content, content_type, platform, received_at) VALUES
    -- 张三的会话1
    (2, 1, NULL, 'tg_msg_001', 'customer', 'John Davis', 'Hi, I saw your products online. Are they available for export?', 'text', 'telegram', NOW() - INTERVAL '5 hours'),
    (2, 1, 2,    'tg_msg_002', 'agent',    '张三',        'Yes! We ship worldwide. What products are you interested in?',  'text', 'telegram', NOW() - INTERVAL '4.5 hours'),
    (2, 1, NULL, 'tg_msg_003', 'customer', 'John Davis', 'Hi, interested in your products. Can you send me the catalog?', 'text', 'telegram', NOW() - INTERVAL '2 hours'),
    -- 张三的会话4（业务号）
    (2, 4, NULL, 'tg_msg_101', 'customer', 'Trade Partner A', 'Need 1000 units, FOB price?',   'text', 'telegram', NOW() - INTERVAL '1 hour'),
    (2, 4, NULL, 'tg_msg_102', 'customer', 'Trade Partner A', 'Please quote ASAP',             'text', 'telegram', NOW() - INTERVAL '50 min'),
    (2, 4, NULL, 'tg_msg_103', 'customer', 'Trade Partner A', 'Waiting for your reply',        'text', 'telegram', NOW() - INTERVAL '1 hour'),
    -- 张三的会话5（Facebook）
    (2, 5, NULL, 'fb_msg_001', 'customer', 'Emma Wilson',  'Do you ship to Germany?',                                   'text', 'facebook', NOW() - INTERVAL '1 hour'),
    -- 张三的会话2
    (2, 2, NULL, 'tg_msg_011', 'customer', 'Sarah Miller', 'Can you send the catalog?',                                 'text', 'telegram', NOW() - INTERVAL '4 hours'),
    -- 张三的会话3
    (2, 3, NULL, 'tg_msg_021', 'customer', 'Ahmed Benali', 'Price for bulk order?',                                     'text', 'telegram', NOW() - INTERVAL '6 hours'),
    -- 李四
    (3, 8, NULL, 'tg_msg_201', 'customer', 'Robert Lee',   'Saw your post about the new product. Can you tell me more?', 'text', 'telegram',  NOW() - INTERVAL '3 hours'),
    (3, 9, NULL, 'tg_msg_211', 'customer', 'Sophia Brown', 'Can we schedule a call this week?',                         'text', 'telegram',  NOW() - INTERVAL '5 hours'),
    (3, 10,NULL, 'ms_msg_001', 'customer', 'David Chen',   'Meeting notes attached',                                    'text', 'messenger', NOW() - INTERVAL '1 hour');

-- 附件（E5 修复：独立附件表）
INSERT INTO attachment (user_id, message_id, file_type, file_url, file_name, file_size, mime_type, width, height) VALUES
    (2, 1, 'image', 'https://cdn.telegram.org/john/product.jpg', 'product.jpg', 245678, 'image/jpeg', 800, 600),
    (2, 4, 'image', 'https://cdn.telegram.org/partner/sample.png','sample.png', 102400, 'image/png',  1024, 768),
    (3, 11,'file',  'https://cdn.messenger.com/david/notes.pdf',  'notes.pdf',   524288, 'application/pdf', NULL, NULL);

-- 发送队列（E3 修复：业务员发的消息先入队）
INSERT INTO message_outbox (user_id, conversation_id, agent_user_id, content, content_type, status, sent_at, external_message_id) VALUES
    (2, 1, 2, 'Yes! We ship worldwide. What products are you interested in?', 'text', 'sent', NOW() - INTERVAL '4.5 hours', 'tg_msg_002'),
    (3, 8, 3, 'Yes, we have a new model. Let me send you the details.',        'text', 'sent', NOW() - INTERVAL '2.5 hours', 'tg_msg_202');

-- 客户标签
INSERT INTO customer_label (user_id, customer_id, label_name, color) VALUES
    (2, 1, '重点客户', '#FF3B30'),
    (2, 2, '待跟进',   '#FF9500'),
    (2, 3, '已报价',   '#25D366'),
    (2, 5, '新客户',   '#0088CC'),
    (3, 7, '重点客户', '#FF3B30');

-- ============================================================
-- 验证查询
-- ============================================================
-- SELECT * FROM v_user_stats;
-- SELECT * FROM message WHERE user_id = 2 ORDER BY received_at DESC LIMIT 10;
-- SELECT * FROM conversation WHERE assignee_id = 2 AND status = 'active';
-- SELECT COUNT(*) FROM message_outbox WHERE status = 'pending';
