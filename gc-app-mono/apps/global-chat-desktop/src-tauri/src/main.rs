// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dotenv::dotenv;
use std::borrow::Cow;
use std::env;
use tauri::is_dev;

fn main() {
  // 在开发环境使用运行时环境变量，生产环境使用编译时环境变量
  #[cfg(debug_assertions)]
  let (dsn, env_mode) = {
    let _ = dotenv().ok();
    (env::var("SENTRY_DSN").unwrap_or_default(), env::var("MODE").unwrap_or_default())
  };

  // 原来写的是 `env!("SENTRY_DSN")` —— 编译期宏，变量不存在直接编译失败。
  // 2026-10-20 打包就是这个卡住的：`error: environment variable SENTRY_DSN not defined`。
  //
  // 改成 `option_env!`：没有就是空串，下面 `!dsn.is_empty()` 判空后**不初始化 Sentry**。
  // 这也正是我们想要的结果 —— Sentry 配的是 `send_default_pii: true`（会上传个人信息），
  // 发给业务员的本地版不该向任何外部服务上报数据。
  #[cfg(not(debug_assertions))]
  let (dsn, env_mode) = (
    option_env!("SENTRY_DSN").unwrap_or_default().to_string(),
    option_env!("MODE").unwrap_or_default().to_string(),
  );

  // 只在非空 DSN 时初始化 Sentry
  if !is_dev() && !dsn.is_empty() {
    let _guard = sentry::init((
      dsn,
      sentry::ClientOptions {
        release: sentry::release_name!(),
        environment: Some(Cow::from(env_mode)),
        traces_sample_rate: 1.0,
        send_default_pii: true,
        debug: true,
        ..Default::default()
      },
    ));
  }

  global_chat_desktop_lib::run()
}
