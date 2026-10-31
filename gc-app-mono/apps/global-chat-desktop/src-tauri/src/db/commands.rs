use super::*;

#[tauri::command]
pub async fn get_user_by_username_cmd(username: String) -> Result<Option<User>, String> {
  get_user_by_username(&username).await.map_err(|e| e.to_string())
}

/// 取（必要时创建）本机固定账号。
///
/// 2026-10-20 去掉登录后，前端启动时调这一条拿到 `user_id` 写进 localStorage，
/// 之后所有请求照旧带 userId —— 数据链路一行不用改。
/// 账号在 `init_db()` 里就已经建好了，这里只是把它读出来给前端。
#[tauri::command]
pub async fn ensure_local_user_cmd() -> Result<User, String> {
  ensure_local_user().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_platform_accounts_cmd(user_id: i32) -> Result<Vec<PlatformAccount>, String> {
  get_platform_accounts(user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_conversations_cmd(user_id: i32, status: Option<String>) -> Result<Vec<Conversation>, String> {
  get_conversations(user_id, status.as_deref()).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_messages_cmd(conversation_id: i32, limit: Option<i32>) -> Result<Vec<Message>, String> {
  get_messages(conversation_id, limit.unwrap_or(50)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_aggregated_messages_cmd(user_id: i32, limit: Option<i32>) -> Result<Vec<Message>, String> {
  get_aggregated_messages(user_id, limit.unwrap_or(50)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn enqueue_message_cmd(
  user_id: i32,
  conversation_id: i32,
  agent_user_id: i32,
  content: String,
  content_type: Option<String>,
) -> Result<i32, String> {
  enqueue_message(user_id, conversation_id, agent_user_id, &content, content_type.as_deref().unwrap_or("text"))
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pending_messages_cmd(limit: Option<i32>) -> Result<Vec<MessageOutbox>, String> {
  get_pending_messages(limit.unwrap_or(20)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_customers_cmd(user_id: i32) -> Result<Vec<Customer>, String> {
  get_customers(user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_proxy_configs_cmd(user_id: i32) -> Result<Vec<ProxyConfig>, String> {
  get_proxy_configs(user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_monitoring_configs_cmd(user_id: i32) -> Result<Vec<MonitoringConfig>, String> {
  get_monitoring_configs(user_id).await.map_err(|e| e.to_string())
}

// ------------------------------------------------------------------
// 实时监听：把平台 WebView 里抓到的新消息落库
// ------------------------------------------------------------------
// 调用方是宿主 main webview：注入脚本通过 webviewChannel 把消息交上来，
// 宿主再 invoke 这个命令。返回 is_new=false 表示幂等命中（重复消息）。
#[tauri::command]
pub async fn record_incoming_message_cmd(
  input: IncomingMessageInput,
) -> Result<IncomingMessageResult, String> {
  record_incoming_message(input).await.map_err(|e| e.to_string())
}

/// 聚合栏点开某条会话时清未读。
/// 返回最新未读快照 —— 前端直接用它刷红点，不要再查一次列表（会读到旧值）。
#[tauri::command]
pub async fn mark_conversation_read_cmd(conversation_id: i32) -> Result<UnreadSnapshot, String> {
  mark_conversation_read(conversation_id).await.map_err(|e| e.to_string())
}

/// 「自动登记」：业务员打开某个平台时，若他在该平台还没有 platform_account 记录就补一条。
/// 不补的话，这个平台监听到的消息会因为「找不到可用账号」被丢弃 —— 监听等于不存在。
#[tauri::command]
pub async fn ensure_platform_account_cmd(
  user_id: i32,
  platform: String,
  account_name: Option<String>,
) -> Result<i32, String> {
  ensure_platform_account(user_id, &platform, account_name.as_deref())
    .await
    .map_err(|e| e.to_string())
}

/// 手动改会话状态：目前只用于聚合页的「已处理」（status = 'handled'）与「恢复」（'active'）。
/// 与 archived/closed 的区别：handled 只是**从聚合待办列表里消掉**，
/// 中栏客户列表仍然保留这条会话，业务员还能点进去翻历史。
#[tauri::command]
pub async fn update_conversation_status_cmd(conversation_id: i32, status: String) -> Result<(), String> {
  update_conversation_status(conversation_id, &status)
    .await
    .map_err(|e| e.to_string())
}

// ------------------------------------------------------------------
// 业务员账号管理（只有 role = 'admin' 能用）
//
// 权限闸门为什么放在命令层而不是前端：
//   前端隐藏按钮只是「看不见」，invoke 照样能调。真正拦一道必须在 Rust 侧拿 operator_id 查一次库。
// 明文密码为什么传到这里才哈希：
//   Node / Python 侧都没有 bcrypt，老板不可能自己算哈希；
//   让他直接填明文，由 Rust 用 bcrypt::hash 落库，才是唯一能跑通的路。
// ------------------------------------------------------------------

/// 统一的权限闸门：不是 admin 就直接报错
async fn assert_admin(operator_id: i32) -> Result<(), String> {
  match get_user_role(operator_id).await.map_err(|e| e.to_string())? {
    Some(role) if role == "admin" => Ok(()),
    Some(_) => Err("只有管理员可以做这个操作".to_string()),
    None => Err("操作者账号不存在".to_string()),
  }
}

fn hash_plain(password: &str) -> Result<String, String> {
  if password.trim().is_empty() {
    return Err("密码不能为空".to_string());
  }
  bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|e| format!("密码加密失败: {e}"))
}

#[tauri::command]
pub async fn list_users_admin_cmd(operator_id: i32) -> Result<Vec<UserAdminRow>, String> {
  assert_admin(operator_id).await?;
  list_users_admin().await.map_err(|e| e.to_string())
}

/// 新建业务员账号。返回新账号 id；用户名已存在返回 0（前端提示重名）。
#[tauri::command]
pub async fn create_user_cmd(
  operator_id: i32,
  username: String,
  password: String,
  display_name: Option<String>,
  email: Option<String>,
  role: Option<String>,
) -> Result<i32, String> {
  assert_admin(operator_id).await?;

  let username = username.trim().to_string();
  if username.is_empty() {
    return Err("用户名不能为空".to_string());
  }
  // 只允许 member / admin 两种角色，防止手滑写进别的值导致没人能登录管理界面
  let role = role.unwrap_or_else(|| "member".to_string());
  if role != "member" && role != "admin" {
    return Err("角色只能是 member 或 admin".to_string());
  }

  let hash = hash_plain(&password)?;
  let display = display_name.unwrap_or_else(|| username.clone());
  create_user(&username, &hash, &display, email.as_deref(), &role)
    .await
    .map_err(|e| e.to_string())
}

/// 改密码 / 重置密码。老板自己改、给业务员重置，都走这一条。
#[tauri::command]
pub async fn update_user_password_cmd(
  operator_id: i32,
  user_id: i32,
  password: String,
) -> Result<(), String> {
  assert_admin(operator_id).await?;
  let hash = hash_plain(&password)?;
  update_user_password(user_id, &hash).await.map_err(|e| e.to_string())
}

/// 停用 / 启用。停用后登录被拒，但数据全留着 —— 离职先停用，别急着删。
#[tauri::command]
pub async fn set_user_active_cmd(
  operator_id: i32,
  user_id: i32,
  is_active: bool,
) -> Result<(), String> {
  assert_admin(operator_id).await?;
  if user_id == operator_id && !is_active {
    return Err("不能停用自己的账号".to_string());
  }
  set_user_active(user_id, is_active).await.map_err(|e| e.to_string())
}

/// 删号。**级联删会带走他名下所有客户与会话**，所以：
///   默认只要他还有数据就拒绝；必须前端显式 force = true 才真删。
#[tauri::command]
pub async fn delete_user_cmd(
  operator_id: i32,
  user_id: i32,
  force: Option<bool>,
) -> Result<(), String> {
  assert_admin(operator_id).await?;
  if user_id == operator_id {
    return Err("不能删除自己的账号".to_string());
  }

  let (customers, conversations) = count_user_data(user_id).await.map_err(|e| e.to_string())?;
  if (customers > 0 || conversations > 0) && !force.unwrap_or(false) {
    return Err(format!(
      "该账号名下还有 {customers} 个客户 / {conversations} 个会话，删除会一并清空。确认请勾选「强制删除」。"
    ));
  }

  delete_user(user_id).await.map_err(|e| e.to_string())
}
