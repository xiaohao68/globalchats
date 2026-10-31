use crate::gc_webview::plugin::{
  close_devtools, close_side_webview, close_webview, create_side_webview, create_webview, get_webviews, hide_side_webview, hide_webview, open_devtools, open_webview, reload_webview, remove_webview,
  resize_side_webview, set_theme, set_webview_bounds, show_side_webview, show_webview, toggle_devtools, toggle_side_webview,
};
use crate::logging::export::{query_logs, export_logs, write_log};
use tauri_plugin_log::{Target, TargetKind, RotationStrategy};

mod gc_webview;
mod logging;
mod setup;
mod utils;
pub mod db;
pub mod auth;

fn clear_logs_before_init() {
  use std::fs;
  use std::path::PathBuf;

  // 清理 Tauri app log 目录（~/Library/Logs/com.socialsmart.globalchats.app/）
  if let Ok(home) = std::env::var("HOME") {
    let log_file = PathBuf::from(home)
      .join("Library")
      .join("Logs")
      .join("com.socialsmart.globalchats.app")
      .join("app.log");
    if log_file.exists() {
      let _ = fs::write(&log_file, "");
    }
  }

  // 清理工作区日志（logs/current/）
  if let Ok(workspace_dir) = logging::get_workspace_log_dir() {
    if workspace_dir.exists() {
      if let Ok(entries) = fs::read_dir(&workspace_dir) {
        for entry in entries.flatten() {
          let path = entry.path();
          if path.is_file() && path.extension().map(|e| e == "log").unwrap_or(false) {
            let _ = fs::remove_file(&path);
          }
        }
      }
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  clear_logs_before_init();

  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(
      tauri_plugin_log::Builder::new()
        .level(log::LevelFilter::Info)
        .targets([
          Target::new(TargetKind::LogDir { file_name: Some("app".into()) }),
          Target::new(TargetKind::Stdout),
          Target::new(TargetKind::Webview),
        ])
        // 单个日志文件上限放大到 20MB。
        // 默认上限只有 1MB，而平台网页（尤其 TikTok）的 console 日志单行就有几 KB，
        // 叠加 KeepOne 策略后会频繁轮转、把「应用启动 → 平台 WebView 创建」这段
        // 最关键的过程直接覆盖掉 —— 排查内嵌网页问题时，看到的日志永远缺前半段。
        .max_file_size(20 * 1024 * 1024)
        .rotation_strategy(RotationStrategy::KeepOne)
        .build()
    )
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      create_webview,
      remove_webview,
      open_webview,
      set_webview_bounds,
      show_webview,
      hide_webview,
      close_webview,
      reload_webview,
      open_devtools,
      close_devtools,
      toggle_devtools,
      //-------------------------------------------------------------------------------------
      // side webview
      //-------------------------------------------------------------------------------------
      close_side_webview,
      create_side_webview,
      show_side_webview,
      hide_side_webview,
      toggle_side_webview,
      resize_side_webview,
      //-------------------------------------------------------------------------------------
      // logging
      //-------------------------------------------------------------------------------------
      query_logs,
      export_logs,
      write_log,
      //-------------------------------------------------------------------------------------
      //
      //-------------------------------------------------------------------------------------
      set_theme,
      //-------------------------------------------------------------------------------------
      // database commands
      //-------------------------------------------------------------------------------------
      db::commands::ensure_local_user_cmd,
      db::commands::get_user_by_username_cmd,
      db::commands::get_platform_accounts_cmd,
      db::commands::get_conversations_cmd,
      db::commands::get_messages_cmd,
      db::commands::get_aggregated_messages_cmd,
      db::commands::enqueue_message_cmd,
      db::commands::get_pending_messages_cmd,
      db::commands::get_customers_cmd,
      db::commands::get_proxy_configs_cmd,
      db::commands::get_monitoring_configs_cmd,
      // 实时监听链路：监听到的客户消息落库 / 清未读
      db::commands::record_incoming_message_cmd,
      db::commands::mark_conversation_read_cmd,
      db::commands::update_conversation_status_cmd,
      db::commands::ensure_platform_account_cmd,
      //-------------------------------------------------------------------------------------
      // 业务员账号管理（管理员界面）
      //-------------------------------------------------------------------------------------
      db::commands::list_users_admin_cmd,
      db::commands::create_user_cmd,
      db::commands::update_user_password_cmd,
      db::commands::set_user_active_cmd,
      db::commands::delete_user_cmd,
      //-------------------------------------------------------------------------------------
      // auth commands
      //-------------------------------------------------------------------------------------
      auth::commands::login_cmd,
      auth::commands::verify_token_cmd,
      //-------------------------------------------------------------------------------------
      // debug / test
      //-------------------------------------------------------------------------------------
      get_webviews,
    ])
    .setup(|app| setup::setup(app))
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
