use anyhow::Result;
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, EncodingKey, DecodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

pub mod commands;

const JWT_SECRET: &[u8] = b"globalchats-jwt-secret-2026";
const TOKEN_EXPIRE_HOURS: i64 = 24;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
  pub sub: i32,        // user_id
  pub username: String,
  pub role: String,    // admin / member
  pub exp: usize,
}

/// 生成 JWT token
pub fn generate_token(user_id: i32, username: &str, role: &str) -> Result<String> {
  let expiration = Utc::now()
    .checked_add_signed(Duration::hours(TOKEN_EXPIRE_HOURS))
    .expect("valid timestamp")
    .timestamp() as usize;

  let claims = Claims {
    sub: user_id,
    username: username.to_string(),
    role: role.to_string(),
    exp: expiration,
  };

  let token = encode(
    &Header::default(),
    &claims,
    &EncodingKey::from_secret(JWT_SECRET),
  )?;
  Ok(token)
}

/// 验证 JWT token
pub fn verify_token(token: &str) -> Result<Claims> {
  let token_data = decode::<Claims>(
    token,
    &DecodingKey::from_secret(JWT_SECRET),
    &Validation::default(),
  )?;
  Ok(token_data.claims)
}

/// 验证密码（bcrypt）
pub fn verify_password(password: &str, hash: &str) -> bool {
  bcrypt::verify(password, hash).unwrap_or(false)
}

/// 生成密码哈希
pub fn hash_password(password: &str) -> Result<String> {
  Ok(bcrypt::hash(password, 10)?)
}
