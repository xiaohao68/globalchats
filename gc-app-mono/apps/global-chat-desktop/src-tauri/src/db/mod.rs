use anyhow::Result;
use chrono::NaiveDateTime;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions, SqliteRow};
use sqlx::{SqlitePool, Row};
use std::path::PathBuf;
use std::sync::OnceLock;

pub mod backup;
pub mod commands;

static DB_POOL: OnceLock<SqlitePool> = OnceLock::new();

// ============================================================
// 2026-10-20：数据库从 PostgreSQL 换成 SQLite
//
// 为什么要换：本产品的最终形态是「一人一台电脑、双击 exe 就用」，
// 数据不需要汇总给老板、不需要多端同步。PostgreSQL 要求业务员自己装数据库、
// 起服务、填连接地址 —— 这正是分发环节最大的阻力。
// SQLite 是一个**编进 exe 的库**（libsqlite3-sys 把 C 源码一起编译），
// 落盘就是一个文件，表 / 索引 / 事务 / 唯一约束全都有，
// 唯一做不到的是「被远程连」，而我们恰恰不需要。
//
// 类型映射（schema_v2.sql → SQLite）：
//   SERIAL / BIGSERIAL → INTEGER PRIMARY KEY AUTOINCREMENT
//   TIMESTAMP          → TEXT（存 `%F %T%.f`，sqlx 的 NaiveDateTime 编解码格式）
//   BOOLEAN            → INTEGER（0/1）
//   JSONB              → TEXT
//   BIGINT             → INTEGER
// 时间一律存 **UTC**（CURRENT_TIMESTAMP 与 Utc::now().naive_utc()），
// 前端 `parseServerTime()` 会补 `Z` 按 UTC 解释，两边这才对得上。
// ============================================================

/// 数据库文件放哪：`%APPDATA%/GlobalChats/gc.db`
pub fn data_dir() -> PathBuf {
  let base = std::env::var("APPDATA")
    .or_else(|_| std::env::var("HOME"))
    .map(PathBuf::from)
    .unwrap_or_else(|_| PathBuf::from("."));
  base.join("GlobalChats")
}

pub fn database_path() -> PathBuf {
  data_dir().join("gc.db")
}

/// 初始化数据库：建目录 → 连库 → 建表 → 补本机账号 → 备份
///
/// 与以前连 PostgreSQL 最大的不同：**这里不会连不上**。
/// 只要 APPDATA 目录可写就一定成功，所以失败时不必再「放行让窗口照常打开」。
pub async fn init_db() -> Result<()> {
  if DB_POOL.get().is_some() {
    return Ok(());
  }

  let dir = data_dir();
  std::fs::create_dir_all(&dir)
    .map_err(|e| anyhow::anyhow!("创建数据目录失败 {:?}: {}", dir, e))?;
  let path = database_path();
  log::info!("[db] 数据库文件: {:?}", path);

  // 用 SqliteConnectOptions 而不是 sqlite:// 连接串：
  // Windows 下 `sqlite://C:/...` 会把盘符当成 URL 的 host，解析经常出问题。
  let options = SqliteConnectOptions::new()
    .filename(&path)
    .create_if_missing(true)
    // 外键默认关闭，不打开的话 ON DELETE CASCADE 全是摆设
    .foreign_keys(true)
    // 多个任务并发写时不要立刻报 SQLITE_BUSY
    .busy_timeout(std::time::Duration::from_secs(5));

  let pool = SqlitePoolOptions::new()
    .max_connections(4)
    .connect_with(options)
    .await?;

  DB_POOL
    .set(pool)
    .map_err(|_| anyhow::anyhow!("DB pool already initialized"))?;

  run_migrations().await?;

  // 本机固定账号：去掉登录后，所有数据都挂在这个账号下
  let user = ensure_local_user().await?;
  log::info!("[db] 本机账号: {} (id={})", user.username, user.id);

  // 兜底代理：保证每个平台账号都有出口 IP。
  // 少了这一步 WebView 会裸连，LinkedIn 会按中国 IP 作废登录态
  // （表现＝「登过了下次还要登」），详见 ensure_default_proxy 注释。
  if let Err(e) = bind_default_proxy(user.id).await {
    log::warn!("[db] 绑定默认代理失败（不影响启动，但平台可能裸连）: {e}");
  }

  // 每次启动顺手备份一次（只保留最近 7 份，见 backup.rs）
  backup::backup_now().await;

  log::info!("[db] 初始化完成");
  Ok(())
}

fn get_pool() -> Result<&'static SqlitePool> {
  DB_POOL
    .get()
    .ok_or_else(|| anyhow::anyhow!("数据库未初始化"))
}

/// 建表。全是 `IF NOT EXISTS`，重复启动安全；改表结构时新增语句即可。
async fn run_migrations() -> Result<()> {
  let pool = get_pool()?;
  for statement in SCHEMA_SQL {
    sqlx::query(statement).execute(pool).await?;
  }
  Ok(())
}

/// 10 张表（与 schema_v2.sql 一一对应，去掉了 PostgreSQL 专属语法）。
///
/// 注意：`CREATE TABLE` 里必须把外键直接写进去 —— SQLite 不支持
/// `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`。
const SCHEMA_SQL: &[&str] = &[
  // 1. user —— 业务员账号（去登录后只剩「本机」这一个）
  r#"CREATE TABLE IF NOT EXISTS "user" (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       username      TEXT    NOT NULL UNIQUE,
       password_hash TEXT    NOT NULL DEFAULT '',
       display_name  TEXT    NOT NULL,
       email         TEXT,
       role          TEXT    NOT NULL DEFAULT 'member',
       is_active     INTEGER NOT NULL DEFAULT 1,
       last_login_at TEXT,
       created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
     )"#,
  // 2. platform_account —— 平台账号（一人多号）
  r#"CREATE TABLE IF NOT EXISTS platform_account (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id       INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       platform      TEXT    NOT NULL,
       account_name  TEXT,
       external_id   TEXT,
       avatar_url    TEXT,
       login_status  TEXT    NOT NULL DEFAULT 'logged_out',
       last_login_at TEXT,
       cookie_data   TEXT,
       user_agent    TEXT,
       fingerprint   TEXT,
       proxy_id      INTEGER REFERENCES proxy_config(id) ON DELETE SET NULL,
       created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, platform, external_id)
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_platform_account_user   ON platform_account(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_platform_account_proxy  ON platform_account(proxy_id)"#,
  // 3. proxy_config —— 代理配置
  r#"CREATE TABLE IF NOT EXISTS proxy_config (
       id           INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id      INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       proxy_type   TEXT    NOT NULL,
       host         TEXT    NOT NULL,
       port         INTEGER NOT NULL,
       username     TEXT,
       password     TEXT,
       country      TEXT,
       is_active    INTEGER NOT NULL DEFAULT 1,
       last_test_at TEXT,
       last_test_ok INTEGER,
       remark       TEXT,
       created_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at   TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_proxy_user   ON proxy_config(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_proxy_active ON proxy_config(user_id, is_active)"#,
  // 4. monitoring_config —— 监听配置
  r#"CREATE TABLE IF NOT EXISTS monitoring_config (
       id                  INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id             INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       platform_account_id INTEGER NOT NULL REFERENCES platform_account(id) ON DELETE CASCADE,
       is_active           INTEGER NOT NULL DEFAULT 1,
       monitoring_mode     TEXT    NOT NULL DEFAULT 'realtime',
       poll_interval_sec   INTEGER DEFAULT 30,
       last_sync_at        TEXT,
       last_error          TEXT,
       sync_cursor         TEXT,
       config              TEXT,
       created_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(platform_account_id)
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_monitoring_user    ON monitoring_config(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_monitoring_sync_at ON monitoring_config(last_sync_at DESC)"#,
  // 5. customer —— 客户
  r#"CREATE TABLE IF NOT EXISTS customer (
       id                  INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id             INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       platform_account_id INTEGER NOT NULL REFERENCES platform_account(id) ON DELETE CASCADE,
       external_id         TEXT    NOT NULL,
       name                TEXT,
       avatar_url          TEXT,
       phone               TEXT,
       email               TEXT,
       is_group            INTEGER NOT NULL DEFAULT 0,
       member_count        INTEGER,
       is_online           INTEGER NOT NULL DEFAULT 0,
       last_seen_at        TEXT,
       raw_data            TEXT,
       created_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, external_id)
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_customer_user     ON customer(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_customer_platform ON customer(platform_account_id)"#,
  // 6. customer_label —— 客户标签
  r#"CREATE TABLE IF NOT EXISTS customer_label (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id    INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
       label_name TEXT    NOT NULL,
       color      TEXT    DEFAULT '#25D366',
       created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, customer_id, label_name)
     )"#,
  // 7. conversation —— 会话
  r#"CREATE TABLE IF NOT EXISTS conversation (
       id                       INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id                  INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       platform_account_id      INTEGER NOT NULL REFERENCES platform_account(id) ON DELETE CASCADE,
       customer_id              INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
       external_conversation_id TEXT,
       conversation_type        TEXT    NOT NULL DEFAULT 'private',
       last_message_preview     TEXT,
       last_message_at          TEXT,
       unread_count             INTEGER NOT NULL DEFAULT 0,
       status                   TEXT    NOT NULL DEFAULT 'active',
       assignee_id              INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
       is_pinned                INTEGER NOT NULL DEFAULT 0,
       is_archived              INTEGER NOT NULL DEFAULT 0,
       created_at               TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at               TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(platform_account_id, customer_id, external_conversation_id)
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_conversation_user     ON conversation(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_conversation_customer ON conversation(customer_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_conversation_last_msg ON conversation(last_message_at DESC)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_conversation_assignee ON conversation(assignee_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_conversation_status   ON conversation(user_id, status)"#,
  // 8. message —— 消息（幂等键 UNIQUE(conversation_id, external_message_id) 是整个监听的命根子）
  r#"CREATE TABLE IF NOT EXISTS message (
       id                  INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id             INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       conversation_id     INTEGER NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
       agent_user_id       INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
       external_message_id TEXT    NOT NULL,
       sender_type         TEXT    NOT NULL DEFAULT 'customer',
       sender_external_id  TEXT,
       sender_name         TEXT,
       content             TEXT,
       content_type        TEXT    NOT NULL DEFAULT 'text',
       media_url           TEXT,
       platform            TEXT    NOT NULL,
       sent_at             TEXT,
       received_at         TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       status              TEXT    NOT NULL DEFAULT 'received',
       raw_data            TEXT,
       created_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(conversation_id, external_message_id)
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_message_user         ON message(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_message_conversation ON message(conversation_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_message_platform     ON message(platform)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_message_received     ON message(received_at DESC)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_message_agent        ON message(agent_user_id)"#,
  // 9. attachment —— 附件
  r#"CREATE TABLE IF NOT EXISTS attachment (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id       INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       message_id    INTEGER NOT NULL REFERENCES message(id) ON DELETE CASCADE,
       file_type     TEXT    NOT NULL,
       file_url      TEXT,
       local_path    TEXT,
       file_name     TEXT,
       file_size     INTEGER,
       mime_type     TEXT,
       width         INTEGER,
       height        INTEGER,
       duration      INTEGER,
       thumbnail_url TEXT,
       created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_attachment_user    ON attachment(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_attachment_message ON attachment(message_id)"#,
  // 10. message_outbox —— 发送队列
  r#"CREATE TABLE IF NOT EXISTS message_outbox (
       id                  INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id             INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       conversation_id     INTEGER NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
       agent_user_id       INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
       content             TEXT,
       content_type        TEXT    NOT NULL DEFAULT 'text',
       media_url           TEXT,
       status              TEXT    NOT NULL DEFAULT 'pending',
       retry_count         INTEGER NOT NULL DEFAULT 0,
       max_retry           INTEGER NOT NULL DEFAULT 3,
       last_error          TEXT,
       scheduled_at        TEXT,
       sent_at             TEXT,
       external_message_id TEXT,
       created_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
     )"#,
  r#"CREATE INDEX IF NOT EXISTS idx_outbox_user         ON message_outbox(user_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_outbox_conversation ON message_outbox(conversation_id)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_outbox_status       ON message_outbox(status, scheduled_at)"#,
  r#"CREATE INDEX IF NOT EXISTS idx_outbox_agent        ON message_outbox(agent_user_id)"#,
];

/// 「本机」固定账号。
///
/// 去掉登录后不再有多业务员的概念，但 `user_id` 是 10 张表的外键、
/// 也是数据隔离的维度，不能删 —— 所以固定创建（并复用）一个账号，
/// 所有监听数据都挂在它名下。用户名固定 `local`，换机器也不会变。
pub async fn ensure_local_user() -> Result<User> {
  let pool = get_pool()?;

  let existing: Option<(i32, String, String, String, i32)> = sqlx::query_as(
    r#"SELECT id, username, display_name, role, is_active
         FROM "user" ORDER BY id LIMIT 1"#,
  )
  .fetch_optional(pool)
  .await?;

  if let Some((id, username, display_name, role, _is_active)) = existing {
    return Ok(User {
      id,
      username,
      display_name,
      email: None,
      role,
      is_active: true,
      created_at: chrono::Utc::now().naive_utc(),
    });
  }

  let id: i32 = sqlx::query_scalar(
    r#"INSERT INTO "user" (username, password_hash, display_name, role, is_active)
       VALUES ('local', '', '本机', 'admin', 1)
       ON CONFLICT (username) DO NOTHING
       RETURNING id"#,
  )
  .fetch_optional(pool)
  .await?
  .unwrap_or_else(|| {
    // 并发下被别人先插了，再查一次
    0
  });

  let id = if id == 0 {
    sqlx::query_scalar::<_, i32>(r#"SELECT id FROM "user" WHERE username = 'local'"#)
      .fetch_one(pool)
      .await?
  } else {
    id
  };

  Ok(User {
    id,
    username: "local".to_string(),
    display_name: "本机".to_string(),
    email: None,
    role: "admin".to_string(),
    is_active: true,
    created_at: chrono::Utc::now().naive_utc(),
  })
}

/// 「本机默认代理」——没有就补一条，有就复用第一条。
///
/// 背景（2026-10-20 真事故，也是「业务员要不要反复登录」的直接答案）：
/// 迁到 SQLite 之后 `proxy_config` 是一张空表、`platform_account.proxy_id` 全是 NULL，
/// 于是内嵌 WebView **完全不带代理、直接裸连**。对 LinkedIn 这种按出口 IP 判定地区的
/// 平台来说这是致命的 —— 中国 IP 会被立刻判定为异常，登录态当场作废、页面 302 到
/// `/signIn`，表现正是「明明登过一次，下次打开又要登」。
///
/// 业务员不会自己配代理，所以这里兜底一条 Clash 系默认地址（127.0.0.1:7897）：
/// 装了 Clash / Clash Verge 就开箱即用；没装也只是「连不上」并红字提示，
/// **绝不会退化成直连中国 IP 把账号送进风控**。
pub async fn ensure_default_proxy(user_id: i32) -> Result<i32> {
  let pool = get_pool()?;

  let existing: Option<i32> = sqlx::query_scalar(
    "SELECT id FROM proxy_config WHERE user_id = $1 AND is_active = 1 ORDER BY id LIMIT 1",
  )
  .bind(user_id)
  .fetch_optional(pool)
  .await?;

  if let Some(id) = existing {
    return Ok(id);
  }

  let id: i32 = sqlx::query_scalar(
    r#"INSERT INTO proxy_config (user_id, proxy_type, host, port, country, is_active, remark)
       VALUES ($1, 'http', '127.0.0.1', 7897, 'CN', 1, '默认本地代理（Clash 等）')
       RETURNING id"#,
  )
  .bind(user_id)
  .fetch_one(pool)
  .await?;

  log::info!("[db] 已补默认代理 http://127.0.0.1:7897 (id={id})");
  Ok(id)
}

/// 把「还没绑代理」的平台账号绑到默认代理上（幂等，可每次启动跑）。
///
/// 存在的意义：老账号（迁移前登记的、或早年 `ensure_platform_account` 建的）
/// `proxy_id` 是 NULL，前端 `buildProxyUrl` 拿不到东西 → WebView 裸连 →
/// LinkedIn 风控踢人。启动兜一遍，保证「有账号就有出口 IP」。
pub async fn bind_default_proxy(user_id: i32) -> Result<usize> {
  let proxy_id = ensure_default_proxy(user_id).await?;
  let pool = get_pool()?;

  let res = sqlx::query(
    "UPDATE platform_account SET proxy_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND proxy_id IS NULL",
  )
  .bind(proxy_id)
  .bind(user_id)
  .execute(pool)
  .await?;

  let n = res.rows_affected() as usize;
  if n > 0 {
    log::info!("[db] 已给 {n} 个平台账号补上默认代理 (proxy_id={proxy_id})");
  }
  Ok(n)
}

// ============================================================
// 说明：数据库设计（schema_v2.sql）里所有时间字段都是
// TIMESTAMP（不带时区），因此 Rust 侧统一用 chrono::NaiveDateTime。
// 若误用 DateTime<Utc>（对应 TIMESTAMPTZ），sqlx 解码会直接报
// ColumnDecode 错误。
// 所有取值一律用 try_get（失败返回 Err），不再用 get（失败会 panic
// 并打挂 tokio 工作线程，导致前端 invoke 永远等不到响应）。
// ============================================================

// ============================================================
// 用户表 CRUD
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct User {
  pub id: i32,
  pub username: String,
  pub display_name: String,
  pub email: Option<String>,
  pub role: String,
  pub is_active: bool,
  pub created_at: NaiveDateTime,
}

pub async fn get_user_by_username(username: &str) -> Result<Option<User>> {
  let pool = get_pool()?;
  let row = sqlx::query(
    "SELECT id, username, display_name, email, role, is_active, created_at FROM \"user\" WHERE username = $1"
  )
  .bind(username)
  .fetch_optional(pool)
  .await?;

  let Some(r) = row else {
    return Ok(None);
  };

  Ok(Some(User {
    id: r.try_get("id")?,
    username: r.try_get("username")?,
    display_name: r.try_get("display_name")?,
    email: r.try_get("email")?,
    role: r.try_get("role")?,
    is_active: r.try_get("is_active")?,
    created_at: r.try_get("created_at")?,
  }))
}

/// 登录专用：连 `password_hash` 一起取出来。
///
/// 为什么单独写一条而不是给 `User` 加字段：`User` 是 `Serialize` 的，
/// 会被塞进 `LoginResult.user` **原样返回给前端** —— 把密码哈希带上等于泄漏。
/// 所以登录走这个函数，哈希只在 Rust 侧用，用完即弃。
pub async fn get_user_credential(username: &str) -> Result<Option<(User, String)>> {
  let pool = get_pool()?;
  let row = sqlx::query(
    "SELECT id, username, display_name, email, role, is_active, created_at, password_hash
     FROM \"user\" WHERE username = $1",
  )
  .bind(username)
  .fetch_optional(pool)
  .await?;

  let Some(r) = row else {
    return Ok(None);
  };

  let user = User {
    id: r.try_get("id")?,
    username: r.try_get("username")?,
    display_name: r.try_get("display_name")?,
    email: r.try_get("email")?,
    role: r.try_get("role")?,
    is_active: r.try_get("is_active")?,
    created_at: r.try_get("created_at")?,
  };
  let password_hash: String = r.try_get("password_hash")?;

  Ok(Some((user, password_hash)))
}

// ============================================================
// 业务员账号管理（管理员界面用）
//
// 设计要点：
//   · 这些函数**都不碰 password_hash 的明文**，哈希一律由调用方（命令层）算好再传进来；
//   · 删除账号是危险操作：customer / conversation 的外键是 ON DELETE CASCADE，
//     删人会把他的客户和消息一起清掉，所以先 `count_user_data` 让上层拦一道。
// ============================================================

pub async fn list_users() -> Result<Vec<User>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT id, username, display_name, email, role, is_active, created_at
     FROM \"user\" ORDER BY id",
  )
  .fetch_all(pool)
  .await?;

  rows
    .iter()
    .map(|r| {
      Ok(User {
        id: r.try_get("id")?,
        username: r.try_get("username")?,
        display_name: r.try_get("display_name")?,
        email: r.try_get("email")?,
        role: r.try_get("role")?,
        is_active: r.try_get("is_active")?,
        created_at: r.try_get("created_at")?,
      })
    })
    .collect()
}

/// 管理员界面用的账号行：比 `User` 多两个「他名下有多少数据」的计数，
/// 删号前要让老板看见代价（customer / conversation 是 ON DELETE CASCADE）。
#[derive(Debug, serde::Serialize)]
pub struct UserAdminRow {
  pub id: i32,
  pub username: String,
  pub display_name: Option<String>,
  pub email: Option<String>,
  pub role: String,
  pub is_active: bool,
  pub created_at: NaiveDateTime,
  pub customer_count: i64,
  pub conversation_count: i64,
}

pub async fn list_users_admin() -> Result<Vec<UserAdminRow>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT u.id, u.username, u.display_name, u.email, u.role, u.is_active, u.created_at,
            (SELECT COUNT(*) FROM customer     c WHERE c.user_id = u.id) AS customer_count,
            (SELECT COUNT(*) FROM conversation v WHERE v.user_id = u.id) AS conversation_count
     FROM \"user\" u
     ORDER BY u.id",
  )
  .fetch_all(pool)
  .await?;

  rows
    .iter()
    .map(|r| {
      Ok(UserAdminRow {
        id: r.try_get("id")?,
        username: r.try_get("username")?,
        display_name: r.try_get("display_name")?,
        email: r.try_get("email")?,
        role: r.try_get("role")?,
        is_active: r.try_get("is_active")?,
        created_at: r.try_get("created_at")?,
        customer_count: r.try_get("customer_count")?,
        conversation_count: r.try_get("conversation_count")?,
      })
    })
    .collect()
}

/// 取某人的角色（管理员界面的权限闸门用）。账号不存在返回 None。
pub async fn get_user_role(user_id: i32) -> Result<Option<String>> {
  let pool = get_pool()?;
  let role: Option<String> =
    sqlx::query_scalar("SELECT role FROM \"user\" WHERE id = $1")
      .bind(user_id)
      .fetch_optional(pool)
      .await?;
  Ok(role)
}

pub async fn create_user(
  username: &str,
  password_hash: &str,
  display_name: &str,
  email: Option<&str>,
  role: &str,
) -> Result<i32> {
  let pool = get_pool()?;
  let id: i32 = sqlx::query_scalar(
    "INSERT INTO \"user\" (username, password_hash, display_name, email, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (username) DO NOTHING
     RETURNING id",
  )
  .bind(username)
  .bind(password_hash)
  .bind(display_name)
  .bind(email)
  .bind(role)
  .fetch_optional(pool)
  .await?
  // 用户名已存在时 RETURNING 拿不到行，返回 0 让上层提示「重名」
  .unwrap_or(0);
  Ok(id)
}

pub async fn update_user_password(user_id: i32, password_hash: &str) -> Result<()> {
  let pool = get_pool()?;
  sqlx::query("UPDATE \"user\" SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2")
    .bind(password_hash)
    .bind(user_id)
    .execute(pool)
    .await?;
  Ok(())
}

/** 停用 / 启用（停用后登录会被拒绝，但数据保留） */
pub async fn set_user_active(user_id: i32, is_active: bool) -> Result<()> {
  let pool = get_pool()?;
  sqlx::query("UPDATE \"user\" SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2")
    .bind(is_active)
    .bind(user_id)
    .execute(pool)
    .await?;
  Ok(())
}

/** 删号前先看他名下有多少客户 / 会话 —— 这些数据会被级联删掉 */
pub async fn count_user_data(user_id: i32) -> Result<(i64, i64)> {
  let pool = get_pool()?;
  let customers: i64 =
    sqlx::query_scalar("SELECT COUNT(*) FROM customer WHERE user_id = $1")
      .bind(user_id)
      .fetch_one(pool)
      .await?;
  let conversations: i64 =
    sqlx::query_scalar("SELECT COUNT(*) FROM conversation WHERE user_id = $1")
      .bind(user_id)
      .fetch_one(pool)
      .await?;
  Ok((customers, conversations))
}

pub async fn delete_user(user_id: i32) -> Result<()> {
  let pool = get_pool()?;
  sqlx::query("DELETE FROM \"user\" WHERE id = $1")
    .bind(user_id)
    .execute(pool)
    .await?;
  Ok(())
}

// ============================================================
// 平台账号 CRUD
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct PlatformAccount {
  pub id: i32,
  pub user_id: i32,
  pub platform: String,
  pub account_name: Option<String>,
  pub external_id: Option<String>,
  pub login_status: String,
  pub user_agent: Option<String>,
  pub proxy_id: Option<i32>,
}

pub async fn get_platform_accounts(user_id: i32) -> Result<Vec<PlatformAccount>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT id, user_id, platform, account_name, external_id, login_status, user_agent, proxy_id FROM platform_account WHERE user_id = $1 ORDER BY platform, account_name"
  )
  .bind(user_id)
  .fetch_all(pool)
  .await?;

  rows
    .iter()
    .map(|r| -> Result<PlatformAccount> {
      Ok(PlatformAccount {
        id: r.try_get("id")?,
        user_id: r.try_get("user_id")?,
        platform: r.try_get("platform")?,
        account_name: r.try_get("account_name")?,
        external_id: r.try_get("external_id")?,
        login_status: r.try_get("login_status")?,
        user_agent: r.try_get("user_agent")?,
        proxy_id: r.try_get("proxy_id")?,
      })
    })
    .collect()
}

// ============================================================
// 会话 CRUD
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Conversation {
  pub id: i32,
  pub user_id: i32,
  pub platform_account_id: i32,
  pub customer_id: i32,
  pub conversation_type: String,
  pub last_message_preview: Option<String>,
  pub last_message_at: Option<NaiveDateTime>,
  pub unread_count: i32,
  pub status: String,
  pub assignee_id: Option<i32>,
}

pub async fn get_conversations(user_id: i32, status: Option<&str>) -> Result<Vec<Conversation>> {
  let pool = get_pool()?;
  let rows = if let Some(s) = status {
    sqlx::query(
      "SELECT id, user_id, platform_account_id, customer_id, conversation_type, last_message_preview, last_message_at, unread_count, status, assignee_id FROM conversation WHERE user_id = $1 AND status = $2 ORDER BY last_message_at DESC"
    )
    .bind(user_id)
    .bind(s)
    .fetch_all(pool)
    .await?
  } else {
    sqlx::query(
      "SELECT id, user_id, platform_account_id, customer_id, conversation_type, last_message_preview, last_message_at, unread_count, status, assignee_id FROM conversation WHERE user_id = $1 ORDER BY last_message_at DESC"
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?
  };

  rows
    .iter()
    .map(|r| -> Result<Conversation> {
      Ok(Conversation {
        id: r.try_get("id")?,
        user_id: r.try_get("user_id")?,
        platform_account_id: r.try_get("platform_account_id")?,
        customer_id: r.try_get("customer_id")?,
        conversation_type: r.try_get("conversation_type")?,
        last_message_preview: r.try_get("last_message_preview")?,
        last_message_at: r.try_get("last_message_at")?,
        unread_count: r.try_get("unread_count")?,
        status: r.try_get("status")?,
        assignee_id: r.try_get("assignee_id")?,
      })
    })
    .collect()
}

// ============================================================
// 消息 CRUD
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Message {
  pub id: i32,
  pub user_id: i32,
  pub conversation_id: i32,
  pub agent_user_id: Option<i32>,
  pub external_message_id: String,
  pub sender_type: String,
  pub sender_name: Option<String>,
  pub content: Option<String>,
  pub content_type: String,
  pub platform: String,
  pub sent_at: Option<NaiveDateTime>,
  pub received_at: NaiveDateTime,
  pub status: String,
}

fn map_message(r: &SqliteRow) -> Result<Message> {
  Ok(Message {
    id: r.try_get("id")?,
    user_id: r.try_get("user_id")?,
    conversation_id: r.try_get("conversation_id")?,
    agent_user_id: r.try_get("agent_user_id")?,
    external_message_id: r.try_get("external_message_id")?,
    sender_type: r.try_get("sender_type")?,
    sender_name: r.try_get("sender_name")?,
    content: r.try_get("content")?,
    content_type: r.try_get("content_type")?,
    platform: r.try_get("platform")?,
    sent_at: r.try_get("sent_at")?,
    received_at: r.try_get("received_at")?,
    status: r.try_get("status")?,
  })
}

pub async fn get_messages(conversation_id: i32, limit: i32) -> Result<Vec<Message>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT id, user_id, conversation_id, agent_user_id, external_message_id, sender_type, sender_name, content, content_type, platform, sent_at, received_at, status FROM message WHERE conversation_id = $1 ORDER BY received_at DESC LIMIT $2"
  )
  .bind(conversation_id)
  .bind(limit)
  .fetch_all(pool)
  .await?;

  rows.iter().map(map_message).collect()
}

/// 聚合消息 - 所有平台最新消息
pub async fn get_aggregated_messages(user_id: i32, limit: i32) -> Result<Vec<Message>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT m.id, m.user_id, m.conversation_id, m.agent_user_id, m.external_message_id, m.sender_type, m.sender_name, m.content, m.content_type, m.platform, m.sent_at, m.received_at, m.status FROM message m JOIN conversation c ON c.id = m.conversation_id WHERE m.user_id = $1 AND c.unread_count > 0 ORDER BY m.received_at DESC LIMIT $2"
  )
  .bind(user_id)
  .bind(limit)
  .fetch_all(pool)
  .await?;

  rows.iter().map(map_message).collect()
}

// ============================================================
// 实时监听落库（incoming message）
// ============================================================
//
// 链路：平台 WebView 里的注入脚本监听到客户新消息
//       → webviewChannel 交给宿主 main webview
//       → 宿主 invoke record_incoming_message_cmd
//       → 落到 message / conversation / customer 三张表
//       → 聚合栏重新拉取会话列表
//
// 三条设计保证：
// ① 幂等：同一条消息会被 DOM 观察器反复抓到（列表重渲染、翻页、重新挂载），
//    必须只入库一次、未读只加一次。做法是先插 message，
//    靠 UNIQUE(conversation_id, external_message_id) 兜住；
//    若返回 None 说明是重复 → 立刻返回，绝不再动会话的未读。
// ② 自愈：客户 / 会话不存在时自动补齐，前端不需要先建客户。
// ③ 时间：库里时间列全是 TIMESTAMP（不带时区），所以统一用 NaiveDateTime。

/// 落库用的单条入站消息（字段名与前端 payload 一一对应，camelCase）。
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomingMessageInput {
  pub user_id: i32,
  pub platform_account_id: i32,
  /// 平台字符串（telegram / linkedin / ...），回填 message.platform
  pub platform: String,
  /// 会话在平台侧的 id（LinkedIn 就是 URL 里的 thread id）
  pub conversation_external_id: String,
  pub customer_external_id: String,
  pub customer_name: Option<String>,
  pub customer_avatar: Option<String>,
  pub is_group: Option<bool>,
  /// 平台侧消息 id；监听方拿不到时由注入脚本按「会话id+时间+正文」合成一个
  pub message_external_id: String,
  pub content: Option<String>,
  pub content_type: Option<String>,
  /// customer / agent / system，默认 customer
  pub sender_type: Option<String>,
  pub sender_name: Option<String>,
  /// 平台侧发送时间（RFC3339），解析失败则退化为「现在」
  pub sent_at: Option<String>,
}

/// 落库结果，回给前端做即时提示。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomingMessageResult {
  pub conversation_id: i32,
  pub customer_id: i32,
  pub message_id: i32,
  /// false = 幂等命中（这条消息之前已经存过），未读没有增加
  pub is_new: bool,
}

/// 把一条监听到的消息落库（客户 / 会话不存在会自动创建）。
pub async fn record_incoming_message(input: IncomingMessageInput) -> Result<IncomingMessageResult> {
  let pool = get_pool()?;

  let content_type = input.content_type.clone().unwrap_or_else(|| "text".to_string());
  let sender_type = input.sender_type.clone().unwrap_or_else(|| "customer".to_string());
  let is_group = input.is_group.unwrap_or(false);
  let conversation_type = if is_group { "group" } else { "private" };

  // 平台侧时间解析失败不要报错 —— 监听链路宁可时间不准，也不能丢消息
  let sent_at: NaiveDateTime = input
    .sent_at
    .as_deref()
    .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
    .map(|dt| dt.naive_utc())
    // 统一用 UTC：表里 CURRENT_TIMESTAMP 也是 UTC，前端 parseServerTime() 补 Z 也按 UTC 解释
    .unwrap_or_else(|| chrono::Utc::now().naive_utc());

  // ---------------------------------------------------------------
  // 1. 客户：UNIQUE(user_id, external_id)
  //    用 DO UPDATE 而不是 DO NOTHING —— 平台上改了昵称/头像要跟上。
  // ---------------------------------------------------------------
  let customer_id: i32 = sqlx::query_scalar(
    "INSERT INTO customer (user_id, platform_account_id, external_id, name, avatar_url, is_group)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, external_id)
     DO UPDATE SET
       name                = COALESCE(EXCLUDED.name, customer.name),
       avatar_url          = COALESCE(EXCLUDED.avatar_url, customer.avatar_url),
       platform_account_id = EXCLUDED.platform_account_id,
       is_group            = EXCLUDED.is_group,
       updated_at          = CURRENT_TIMESTAMP
     RETURNING id",
  )
  .bind(input.user_id)
  .bind(input.platform_account_id)
  .bind(&input.customer_external_id)
  .bind(&input.customer_name)
  .bind(&input.customer_avatar)
  .bind(is_group)
  .fetch_one(pool)
  .await?;

  // ---------------------------------------------------------------
  // 2. 会话：先确保存在，拿到 id（暂时不动预览与未读）
  //    注意 external_conversation_id 必须非空 —— PostgreSQL 里 NULL 不参与
  //    唯一性比较，若传 NULL，每次都会新插一行会话出来。
  // ---------------------------------------------------------------
  let conversation_id: i32 = sqlx::query_scalar(
    "INSERT INTO conversation
       (user_id, platform_account_id, customer_id, external_conversation_id,
        conversation_type, last_message_at, unread_count)
     VALUES ($1, $2, $3, $4, $5, $6, 0)
     ON CONFLICT (platform_account_id, customer_id, external_conversation_id)
     DO UPDATE SET updated_at = CURRENT_TIMESTAMP
     RETURNING id",
  )
  .bind(input.user_id)
  .bind(input.platform_account_id)
  .bind(customer_id)
  .bind(&input.conversation_external_id)
  .bind(conversation_type)
  .bind(sent_at)
  .fetch_one(pool)
  .await?;

  // ---------------------------------------------------------------
  // 2.5 补扫去重（2026-10-20 修：老板实测发现「最后一条是重复的」）
  //
  // 补扫用的 id 是 `catchup:<会话键>:<正文哈希>`，跟实时监听拿到的平台真实 id
  // **根本不是一个东西**，所以同一条消息会被存两遍：
  //   ① 软件开着时实时监听收到 → 存 `2-MTc5…`（真实 id），未读 +1
  //   ② 切平台导致 WebView 重建、或下次启动补扫 → 存 `catchup:…`，未读又 +1
  // 数据库唯一键挡不住（两个 id 本来就不相等），表现正是老板看到的
  // 「一条消息两条记录 / 未读虚高 / 聚合页出现两张一样的卡」。
  //
  // 所以这里补一层：补扫上报的消息，若该会话**最后一条正文已经一模一样**，
  // 判定为同一条，按「已存在」收工（is_new=false，不动未读、不刷红点）。
  // 只拦 `catchup:` 前缀；实时监听永远用平台真实 id，不受影响。
  // ---------------------------------------------------------------
  if input.message_external_id.starts_with("catchup:") {
    let last: Option<(i32, Option<String>)> = sqlx::query_as(
      "SELECT id, content FROM message
        WHERE conversation_id = $1
        ORDER BY id DESC LIMIT 1",
    )
    .bind(conversation_id)
    .fetch_optional(pool)
    .await?;

    if let Some((_last_id, last_content)) = last {
      let same = last_content.as_deref().unwrap_or("") == input.content.as_deref().unwrap_or("");
      if same {
        log::info!(
          "[db] 来信落库 platform={} conv={} is_new=false 原因=补扫正文相同（未读不累加）",
          input.platform,
          conversation_id
        );
        return Ok(IncomingMessageResult {
          conversation_id,
          customer_id,
          message_id: 0,
          is_new: false,
        });
      }
    }
  }

  // ---------------------------------------------------------------
  // 3. 消息：靠 UNIQUE(conversation_id, external_message_id) 做幂等。
  //    fetch_optional 拿到 None 就是「已经存过」，直接收工。
  // ---------------------------------------------------------------
  let inserted_message_id: Option<i32> = sqlx::query_scalar(
    "INSERT INTO message
       (user_id, conversation_id, external_message_id, sender_type, sender_name,
        content, content_type, platform, sent_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'received')
     ON CONFLICT (conversation_id, external_message_id) DO NOTHING
     RETURNING id",
  )
  .bind(input.user_id)
  .bind(conversation_id)
  .bind(&input.message_external_id)
  .bind(&sender_type)
  .bind(&input.sender_name)
  .bind(&input.content)
  .bind(&content_type)
  .bind(&input.platform)
  .bind(sent_at)
  .fetch_optional(pool)
  .await?;

  let Some(message_id) = inserted_message_id else {
    // 幂等命中：这条消息之前已经落过库，未读不能再加
    log::info!(
      "[db] 来信落库 platform={} conv={} is_new=false 原因=唯一键已存在 ext_id={}（未读不累加）",
      input.platform,
      conversation_id,
      input.message_external_id
    );
    return Ok(IncomingMessageResult {
      conversation_id,
      customer_id,
      message_id: 0,
      is_new: false,
    });
  };

  // ---------------------------------------------------------------
  // 4. 只有「客户发来的新消息」才推高未读并刷新预览。
  //    自己（agent）发出去的消息不该算未读。
  // ---------------------------------------------------------------
  if sender_type == "customer" {
    // status 只把 'handled' 拉回 'active'：业务员手动标过「已处理」的会话，
    // 客户又发新消息时必须重新冒出来，否则聚合页会永久漏掉这个客户。
    // 但 archived / closed 是用户主动归档/关闭的，不能被新消息悄悄改掉。
    sqlx::query(
      "UPDATE conversation
         SET last_message_preview = $1,
             last_message_at      = $2,
             unread_count         = unread_count + 1,
             status               = CASE WHEN status = 'handled' THEN 'active' ELSE status END,
             updated_at           = CURRENT_TIMESTAMP
       WHERE id = $3",
    )
    .bind(&input.content)
    .bind(sent_at)
    .bind(conversation_id)
    .execute(pool)
    .await?;
  } else {
    sqlx::query(
      "UPDATE conversation
         SET last_message_preview = $1,
             last_message_at      = $2,
             updated_at           = CURRENT_TIMESTAMP
       WHERE id = $3",
    )
    .bind(&input.content)
    .bind(sent_at)
    .bind(conversation_id)
    .execute(pool)
    .await?;
  }

  // 关键排障日志：以后「红点莫名亮了/没灭」直接搜这行，
  // 一眼看出这条消息到底是不是新插入的、有没有把未读 +1。
  // （前端那句 `[监听] 新消息已入库` 在主窗口 console 里，不进 app.log，靠不住。）
  let preview: String = input
    .content
    .as_deref()
    .unwrap_or("")
    .chars()
    .take(30)
    .collect();
  log::info!(
    "[db] 来信落库 platform={} conv={} msg={} sender={} is_new=true 未读{} ext_id={} 正文={}",
    input.platform,
    conversation_id,
    message_id,
    sender_type,
    if sender_type == "customer" { "+1" } else { "不变" },
    input.message_external_id,
    preview
  );

  Ok(IncomingMessageResult {
    conversation_id,
    customer_id,
    message_id,
    is_new: true,
  })
}

/// 未读快照（按平台汇总）。
///
/// 为什么要有这个结构：`mark_conversation_read` 清完未读后，前端原本要**再查一次**
/// `getConversations` 才能重算红点，而那次查询和这里的 UPDATE 是并发跑在
/// 不同连接上的（连接池 4 条）——查早了就读到旧值，红点留着不灭。
/// 业务员看到的就是「点进去已读，红点时灭时不灭」。
/// 现在让这条命令**自己把最新未读一起带回去**，前端直接拿来用，不用再查。
#[derive(Debug, Clone, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnreadSnapshot {
  /// platform → 未读数（只含 > 0 的平台，没出现的按 0 处理）
  pub by_platform: std::collections::HashMap<String, i32>,
  /// 全部平台合计
  pub total: i32,
}

/// 把某个会话标记为已读，并返回该业务员的最新未读快照。
pub async fn mark_conversation_read(conversation_id: i32) -> Result<UnreadSnapshot> {
  let pool = get_pool()?;
  sqlx::query("UPDATE conversation SET unread_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1")
    .bind(conversation_id)
    .execute(pool)
    .await?;

  // UPDATE 已经 await 完成，这里查到的必然是清零之后的值。
  // 前端拿到就直接覆盖红点，不再依赖「再拉一次列表」的时序。
  unread_snapshot_of_conversation_owner(conversation_id).await
}

/// 取某条会话所属业务员的未读快照。
/// 过滤条件必须和前端 `Dashboard.load()` / `AggregatedView.load()` 完全一致
/// （排除 archived / closed），否则红点会和列表对不上。
async fn unread_snapshot_of_conversation_owner(conversation_id: i32) -> Result<UnreadSnapshot> {
  let pool = get_pool()?;

  let user_id: Option<i32> = sqlx::query_scalar("SELECT user_id FROM conversation WHERE id = $1")
    .bind(conversation_id)
    .fetch_optional(pool)
    .await?;

  let Some(user_id) = user_id else {
    // 会话不存在（一般是过期行）：返回 total = -1 表示「这次别动角标」，
    // 绝不能用空快照把前端所有红点清零。
    return Ok(UnreadSnapshot {
      by_platform: std::collections::HashMap::new(),
      total: -1,
    });
  };

  let rows: Vec<(String, i64)> = sqlx::query_as(
    "SELECT pa.platform AS platform, COALESCE(SUM(c.unread_count), 0) AS n
       FROM conversation c
       JOIN platform_account pa ON pa.id = c.platform_account_id
      WHERE c.user_id = $1
        AND c.status NOT IN ('archived', 'closed')
      GROUP BY pa.platform",
  )
  .bind(user_id)
  .fetch_all(pool)
  .await?;

  let mut by_platform = std::collections::HashMap::new();
  let mut total = 0i32;
  for (platform, n) in rows {
    let n = n as i32;
    total += n;
    if n > 0 {
      by_platform.insert(platform, n);
    }
  }

  Ok(UnreadSnapshot { by_platform, total })
}

/// 手动改会话状态（聚合页「已处理」/「恢复」）。
pub async fn update_conversation_status(conversation_id: i32, status: &str) -> Result<()> {
  let pool = get_pool()?;
  sqlx::query("UPDATE conversation SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2")
    .bind(status)
    .bind(conversation_id)
    .execute(pool)
    .await?;
  Ok(())
}

/// 「自动登记」：确保「某业务员在某平台」有一条 platform_account 记录，返回它的 id。
///
/// 为什么必须有这条记录：宿主收到监听消息后要补 `platform_account_id` 才能落库，
/// 补不出来就**直接把消息丢掉**（见 Dashboard 里那句 warn）。以前新业务员登录后
/// 在内嵌网页里能正常聊，但库里没有他的「户口」，监听等于不存在。
///
/// 幂等：先按 (user_id, platform) 查，命中就直接返回；没命中才插一条，
/// `external_id` 用固定的 `auto:<platform>` —— 因为表上的唯一约束是
/// `(user_id, platform, external_id)`，而 **PostgreSQL 里 NULL 不参与唯一性比较**，
/// 若把 external_id 留空，反复调用会插出一堆重复行。
///
/// 注意：这里**不碰任何平台凭据**（密码/ Cookie 都在该机器 WebView 的分区目录里），
/// 也不谎报登录状态 —— `login_status` 走表默认值 `logged_out`。
pub async fn ensure_platform_account(
  user_id: i32,
  platform: &str,
  account_name: Option<&str>,
) -> Result<i32> {
  let pool = get_pool()?;

  let existing: Option<i32> = sqlx::query_scalar(
    "SELECT id FROM platform_account WHERE user_id = $1 AND platform = $2 ORDER BY id LIMIT 1",
  )
  .bind(user_id)
  .bind(platform)
  .fetch_optional(pool)
  .await?;

  if let Some(id) = existing {
    return Ok(id);
  }

  let auto_external_id = format!("auto:{platform}");
  let default_name = format!("自动登记 · {platform}");

  // 新账号一出生就绑上出口 IP：不绑的话 WebView 会裸连，
  // LinkedIn 这类按 IP 判地区的平台会当场作废登录态。
  let proxy_id = ensure_default_proxy(user_id).await?;

  let id: i32 = sqlx::query_scalar(
    "INSERT INTO platform_account (user_id, platform, account_name, external_id, proxy_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, platform, external_id)
     DO UPDATE SET updated_at = CURRENT_TIMESTAMP
     RETURNING id",
  )
  .bind(user_id)
  .bind(platform)
  .bind(account_name.unwrap_or(default_name.as_str()))
  .bind(&auto_external_id)
  .bind(proxy_id)
  .fetch_one(pool)
  .await?;

  Ok(id)
}

// ============================================================
// 发送队列 CRUD (E3)
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct MessageOutbox {
  pub id: i32,
  pub user_id: i32,
  pub conversation_id: i32,
  pub agent_user_id: i32,
  pub content: Option<String>,
  pub content_type: String,
  pub status: String,
  pub retry_count: i32,
  pub max_retry: i32,
  pub last_error: Option<String>,
  pub scheduled_at: Option<NaiveDateTime>,
  pub sent_at: Option<NaiveDateTime>,
}

/// 插入待发送消息到队列
pub async fn enqueue_message(
  user_id: i32,
  conversation_id: i32,
  agent_user_id: i32,
  content: &str,
  content_type: &str,
) -> Result<i32> {
  let pool = get_pool()?;
  let row = sqlx::query(
    "INSERT INTO message_outbox (user_id, conversation_id, agent_user_id, content, content_type, status) VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id"
  )
  .bind(user_id)
  .bind(conversation_id)
  .bind(agent_user_id)
  .bind(content)
  .bind(content_type)
  .fetch_one(pool)
  .await?;

  Ok(row.try_get("id")?)
}

/// 获取待发送消息
pub async fn get_pending_messages(limit: i32) -> Result<Vec<MessageOutbox>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT id, user_id, conversation_id, agent_user_id, content, content_type, status, retry_count, max_retry, last_error, scheduled_at, sent_at FROM message_outbox WHERE status = 'pending' ORDER BY scheduled_at ASC LIMIT $1"
  )
  .bind(limit)
  .fetch_all(pool)
  .await?;

  rows
    .iter()
    .map(|r| -> Result<MessageOutbox> {
      Ok(MessageOutbox {
        id: r.try_get("id")?,
        user_id: r.try_get("user_id")?,
        conversation_id: r.try_get("conversation_id")?,
        agent_user_id: r.try_get("agent_user_id")?,
        content: r.try_get("content")?,
        content_type: r.try_get("content_type")?,
        status: r.try_get("status")?,
        retry_count: r.try_get("retry_count")?,
        max_retry: r.try_get("max_retry")?,
        last_error: r.try_get("last_error")?,
        scheduled_at: r.try_get("scheduled_at")?,
        sent_at: r.try_get("sent_at")?,
      })
    })
    .collect()
}

/// 更新发送状态
pub async fn update_outbox_status(id: i32, status: &str, external_message_id: Option<&str>) -> Result<()> {
  let pool = get_pool()?;
  sqlx::query(
    "UPDATE message_outbox SET status = $1, external_message_id = $2, sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END, updated_at = CURRENT_TIMESTAMP WHERE id = $3"
  )
  .bind(status)
  .bind(external_message_id)
  .bind(id)
  .execute(pool)
  .await?;
  Ok(())
}

// ============================================================
// 客户 CRUD
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Customer {
  pub id: i32,
  pub user_id: i32,
  pub platform_account_id: i32,
  pub external_id: String,
  pub name: Option<String>,
  pub is_group: bool,
  pub is_online: bool,
}

pub async fn get_customers(user_id: i32) -> Result<Vec<Customer>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT id, user_id, platform_account_id, external_id, name, is_group, is_online FROM customer WHERE user_id = $1 ORDER BY name"
  )
  .bind(user_id)
  .fetch_all(pool)
  .await?;

  rows
    .iter()
    .map(|r| -> Result<Customer> {
      Ok(Customer {
        id: r.try_get("id")?,
        user_id: r.try_get("user_id")?,
        platform_account_id: r.try_get("platform_account_id")?,
        external_id: r.try_get("external_id")?,
        name: r.try_get("name")?,
        is_group: r.try_get("is_group")?,
        is_online: r.try_get("is_online")?,
      })
    })
    .collect()
}

// ============================================================
// 代理配置 CRUD (E4)
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ProxyConfig {
  pub id: i32,
  pub user_id: i32,
  pub proxy_type: String,
  pub host: String,
  pub port: i32,
  pub username: Option<String>,
  pub password: Option<String>,
  pub country: Option<String>,
  pub is_active: bool,
}

pub async fn get_proxy_configs(user_id: i32) -> Result<Vec<ProxyConfig>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT id, user_id, proxy_type, host, port, username, password, country, is_active FROM proxy_config WHERE user_id = $1 AND is_active = 1 ORDER BY country"
  )
  .bind(user_id)
  .fetch_all(pool)
  .await?;

  rows
    .iter()
    .map(|r| -> Result<ProxyConfig> {
      Ok(ProxyConfig {
        id: r.try_get("id")?,
        user_id: r.try_get("user_id")?,
        proxy_type: r.try_get("proxy_type")?,
        host: r.try_get("host")?,
        port: r.try_get("port")?,
        username: r.try_get("username")?,
        password: r.try_get("password")?,
        country: r.try_get("country")?,
        is_active: r.try_get("is_active")?,
      })
    })
    .collect()
}

// ============================================================
// 监听配置 CRUD (E11)
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct MonitoringConfig {
  pub id: i32,
  pub user_id: i32,
  pub platform_account_id: i32,
  pub is_active: bool,
  pub monitoring_mode: String,
  pub last_sync_at: Option<NaiveDateTime>,
}

pub async fn get_monitoring_configs(user_id: i32) -> Result<Vec<MonitoringConfig>> {
  let pool = get_pool()?;
  let rows = sqlx::query(
    "SELECT id, user_id, platform_account_id, is_active, monitoring_mode, last_sync_at FROM monitoring_config WHERE user_id = $1 ORDER BY platform_account_id"
  )
  .bind(user_id)
  .fetch_all(pool)
  .await?;

  rows
    .iter()
    .map(|r| -> Result<MonitoringConfig> {
      Ok(MonitoringConfig {
        id: r.try_get("id")?,
        user_id: r.try_get("user_id")?,
        platform_account_id: r.try_get("platform_account_id")?,
        is_active: r.try_get("is_active")?,
        monitoring_mode: r.try_get("monitoring_mode")?,
        last_sync_at: r.try_get("last_sync_at")?,
      })
    })
    .collect()
}
