use crate::gc_webview::webview::GCWebview;
use crate::logging;
use tauri::{App, Manager};

pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
  // 初始化日志系统（panic hook、工作区目录等）
  logging::init_logging(app)?;

  let app_handle = app.handle().clone();

  // 注册全局唯一的窗口尺寸监听器（整个应用仅此一个）。
  // 原来的实现是在每次创建子 WebView 时各自注册 listen，而 Tauri 2 的
  // `on_window_event` 无法注销，导致监听器随平台数量累积、窗口一动就触发多轮
  // `set_size` 重排。现在集中到一处，遍历布局表统一处理。
  if let Err(err) = GCWebview::init_resize_listener(app_handle.clone()) {
    log::warn!("[webview] 全局尺寸监听器注册失败（不影响启动）: {:#}", err);
  }

  GCWebview::create_side_webview(app_handle)?;

  // 启动时直接最大化主窗口。
  // 原因：窗口默认 1366x768 且 decorations=false，内嵌平台网页（LinkedIn 等）
  // 左右两栏会被裁掉；这里启动即铺满屏幕，用户再按左上角绿点可还原。
  if let Some(main) = app.get_webview_window("main") {
    match main.maximize() {
      Ok(()) => log::info!("[window] 主窗口已最大化启动"),
      Err(err) => log::warn!("[window] 启动最大化失败（不影响使用）: {}", err),
    }
  } else {
    log::warn!("[window] 未找到 label=main 的窗口，跳过启动最大化");
  }

  // 初始化本地 SQLite（建库 / 建表 / 补本机账号 / 启动备份）。
  // 必须在启动时初始化，否则所有 db::* / auth::* command 都会报「数据库未初始化」。
  // 与 PostgreSQL 时代不同：SQLite 只要 APPDATA 可写就一定成功，
  // 所以这里失败是真故障（磁盘满 / 目录只读），日志里会留完整堆栈。
  tauri::async_runtime::block_on(async {
    if let Err(err) = crate::db::init_db().await {
      log::error!("[db] 初始化失败，数据库相关功能不可用: {:#}", err);
    }
  });

  Ok(())
}
