use super::*;
use crate::db;

#[derive(Debug, serde::Serialize)]
pub struct LoginResult {
  pub success: bool,
  pub token: Option<String>,
  pub user: Option<db::User>,
  pub message: String,
}

/// 登录。
///
/// 2026-10-19 重写：以前是 `password == "123456" || password == 用户名`，
/// **根本没读 password_hash** —— 任何人只要知道别人的用户名就能用 123456 登进去看客户数据。
/// 现在改成真正的 bcrypt 校验：
///   · 密码正确才算通过，不再有通用后门；
///   · `is_active = false` 的账号直接拒绝（方便停用离职业务员，不用删数据）；
///   · 校验失败统一返回「用户名或密码错误」，不给攻击者区分「用户不存在」的信息。
///
/// 改密码：用 `.workbuddy/tools/hashpwd` 生成 bcrypt 密文，填进 `user.password_hash` 即可。
#[tauri::command]
pub async fn login_cmd(username: String, password: String) -> Result<LoginResult, String> {
  let credential = db::get_user_credential(&username)
    .await
    .map_err(|e| e.to_string())?;

  let Some((u, password_hash)) = credential else {
    return Ok(LoginResult {
      success: false,
      token: None,
      user: None,
      // 刻意不区分「用户不存在」和「密码错误」，避免被用来枚举账号名
      message: "用户名或密码错误".to_string(),
    });
  };

  if !u.is_active {
    return Ok(LoginResult {
      success: false,
      token: None,
      user: None,
      message: "该账号已停用".to_string(),
    });
  }

  let ok = bcrypt::verify(&password, &password_hash).unwrap_or(false);
  if !ok {
    return Ok(LoginResult {
      success: false,
      token: None,
      user: None,
      message: "用户名或密码错误".to_string(),
    });
  }

  let token = generate_token(u.id, &u.username, &u.role).map_err(|e| e.to_string())?;
  Ok(LoginResult {
    success: true,
    token: Some(token),
    user: Some(u),
    message: "登录成功".to_string(),
  })
}

#[tauri::command]
pub async fn verify_token_cmd(token: String) -> Result<bool, String> {
  verify_token(&token).map(|_| true).map_err(|_| "Token 无效".to_string())
}
