use crate::gc_webview::webview::{probe_proxy, GCWebview, ProxyUnavailablePayload, WebviewOptions};
use crate::gc_webview::webview_layout_options::WebviewLayoutOptions;
use tauri::{AppHandle, Emitter, Manager, Runtime, Theme};

/// 在**阻塞线程池**里做代理连通性预检，并按结果决定这次创建是否使用代理。
///
/// 为什么必须放到阻塞线程池：
///   `probe_proxy` 是同步阻塞 IO（`TcpStream::connect_timeout`，上限 1.5s）。
///   原实现是在 async command 里直接同步调用它，等于在一个 tokio worker 线程上
///   干等 1.5 秒。用户快速切换平台时会有多个 create 并发进来，几个 worker 被
///   接连占满之后，事件循环就堵死了 —— `window.add_child()` 需要 runtime 协作，
///   于是建到一半卡在那里不动，整界面表现为「点了没反应 / 卡死」。
///   放进阻塞线程池后，探测再慢也只占专用线程，不挡事件循环。
///
/// 探通就用代理；**探不通也保留代理，绝不退回直连**（详见 `Ok(Err(_))` 分支注释：
/// 中国 IP 裸连会让 LinkedIn 当场作废登录态甚至风控封号，代价远大于一张报错页）。
/// 无论哪种情况都抛 `ProxyUnavailable`，由前端红字告知「去把代理打开」。
async fn resolve_proxy_or_direct<R: Runtime>(app: &AppHandle<R>, options: &mut WebviewOptions) {
  let Some(proxy_url) = options.proxy_url.clone() else {
    return;
  };
  if proxy_url.is_empty() {
    return;
  }

  let probe_target = proxy_url.clone();
  let probed = tauri::async_runtime::spawn_blocking(move || probe_proxy(&probe_target)).await;

  match probed {
    Ok(Ok(())) => {
      log::info!("[{}] 代理可用，使用 {proxy_url}", options.id);
    }
    Ok(Err(err)) => {
      // ⚠️ 刻意**不清空** options.proxy_url —— 绝不降级为直连。（2026-10-20 定案）
      //
      // 原实现是「探不通就退回直连」，看着体贴，实际是最危险的一步：
      // LinkedIn / Facebook 这类按**出口 IP** 判定地区的平台，一看到中国 IP
      // 就判定异常 —— 轻则把页面 302 到 /signIn、当场作废登录态
      // （业务员第二天打开又要重新登录，正是老板问的那个现象），
      // 重则直接风控封号。**一次「忘了开 Clash」的代价是永远失去这个账号。**
      //
      // 保留代理照常加载，WebView 会给一张明确的 ERR_PROXY_CONNECTION_FAILED，
      // 配合前端红字提示，用户一眼就知道「去把代理打开」；
      // 而不是对着一张「能打开、也登录着、却永远收不到消息」的假象发呆。
      log::warn!(
        "[{}] 代理不可用 {}：{err} —— 已保留代理并拒绝直连，避免中国 IP 触发平台风控",
        options.id,
        proxy_url
      );
      let _ = app.emit(
        "ProxyUnavailable",
        ProxyUnavailablePayload {
          webview_id: options.id.clone(),
          proxy_url: proxy_url.clone(),
          reason: err.to_string(),
        },
      );
    }
    Err(join_err) => {
      // 预检任务本身异常（取消 / panic）：同样**不退回直连**，原因同上。
      log::warn!(
        "[{}] 代理预检任务异常，仍保留代理拒绝直连: {join_err}",
        options.id
      );
    }
  }
}

#[tauri::command]
pub async fn create_webview<R: Runtime>(app: AppHandle<R>, options: WebviewOptions) -> anyhow::Result<(), String> {
  log::info!("create_webview id:{}", &options.id);

  let mut options = options;
  resolve_proxy_or_direct(&app, &mut options).await;
  GCWebview::create(app, options).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn set_webview_bounds<R: Runtime>(
  app: AppHandle<R>,
  webview_id: String,
  layout: WebviewLayoutOptions,
) -> anyhow::Result<(), String> {
  GCWebview::set_bounds(app, webview_id, layout).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn remove_webview<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), String> {
  log::info!("remove_webview id:{}", &webview_id);

  GCWebview::remove(app, webview_id).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn update_webview<R: Runtime>(app: AppHandle<R>, options: WebviewOptions) -> anyhow::Result<(), String> {
  log::info!("update_webview id:{}", &options.id);

  GCWebview::update(app, options).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn reload_webview<R: Runtime>(app: AppHandle<R>, options: WebviewOptions) -> anyhow::Result<(), String> {
  log::info!("reload_webview id:{}", &options.id);
  let mut options = options;
  resolve_proxy_or_direct(&app, &mut options).await;
  GCWebview::reload_webview(app, options).await.map_err(|err| err.to_string())?;
  Ok(())
}

#[tauri::command]
pub async fn open_webview<R: Runtime>(app: AppHandle<R>, options: WebviewOptions) -> anyhow::Result<(), String> {
  log::info!(
    "open_webview id:{} layout={:?}",
    &options.id,
    options.layout.as_ref().map(|l| format!(
      "left={} top={} right={:?} bottom={:?}",
      l.left, l.top, l.right, l.bottom
    ))
  );

  if let Some(_webview) = app.get_webview(&options.id) {
    log::info!("webview has created id:{}", &options.id);

    // ------------------------------------------------------------
    // 【关键】已存在的 WebView 不能只 show —— 必须用本次布局纠正一次矩形。
    //
    // 子 WebView 是操作系统级窗口，矩形只在「创建那一刻」确定。而窗口尺寸、
    // 中间栏折叠状态、平台头部/提示条高度都可能在它上次创建之后发生变化。
    // 原先这里只调 show_webview，于是「切回来」的旧 WebView 会停在过期的矩形上，
    // 表现为：右侧整片空白、内容错位、或只在画面边缘露出一条残影。
    // ------------------------------------------------------------
    if let Some(layout) = options.layout.clone() {
      if let Err(err) = GCWebview::set_bounds(app.clone(), options.id.clone(), layout) {
        log::warn!(
          "[{}] 已存在的 WebView 布局纠正失败（不影响显示）: {}",
          options.id,
          err
        );
      }
    }

    show_webview(app, options.id).await?;
    return Ok(());
  }

  // 只有真要创建时才做代理预检（已存在的分支只是 show + 纠正矩形，不该被探测拖延）。
  let mut options = options;
  resolve_proxy_or_direct(&app, &mut options).await;
  GCWebview::create(app, options).map_err(|err| err.to_string())?;

  Ok(())
}
#[tauri::command]
pub async fn show_webview<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), String> {
  log::info!("show_webview id:{}", &webview_id);

  GCWebview::show(app, webview_id).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn hide_webview<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), String> {
  log::info!("hide_webview id:{}", &webview_id);
  GCWebview::hide(app, webview_id).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn close_webview<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), String> {
  log::info!("close_webview id:{}", &webview_id);
  GCWebview::close(app, webview_id).map_err(|err| err.to_string())?;
  Ok(())
}

//-------------------------------------------------------------------------------------
// devtools
//-------------------------------------------------------------------------------------

#[tauri::command]
pub async fn open_devtools<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), String> {
  log::info!("open_devtools id:{}", &webview_id);
  GCWebview::open_devtools(app, webview_id).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn close_devtools<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), String> {
  log::info!("close_devtools id:{}", &webview_id);
  GCWebview::close_devtools(app, webview_id).map_err(|err| err.to_string())?;
  Ok(())
}

#[tauri::command]
pub async fn toggle_devtools<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), String> {
  log::info!("toggle_devtools id:{}", &webview_id);
  GCWebview::toggle_devtools(app, webview_id).map_err(|err| err.to_string())?;
  Ok(())
}
//-------------------------------------------------------------------------------------
// side webview
//-------------------------------------------------------------------------------------
#[tauri::command]
pub async fn close_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), String> {
  log::info!("close_side_webview");
  GCWebview::close_side_webview(app).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn create_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), String> {
  log::info!("create_side_webview");
  GCWebview::create_side_webview(app).map_err(|err| err.to_string())?;
  Ok(())
}

#[tauri::command]
pub async fn show_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), String> {
  log::info!("show_side_webview");
  GCWebview::show_side_webview(app).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn hide_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), String> {
  log::info!("hide_side_webview");
  GCWebview::hide_side_webview(app).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn toggle_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), String> {
  log::info!("toggle_side_webview");
  GCWebview::toggle_side_webview(app).map_err(|err| err.to_string())?;
  Ok(())
}
#[tauri::command]
pub async fn resize_side_webview<R: Runtime>(app: AppHandle<R>, layout: WebviewLayoutOptions) -> anyhow::Result<(), String> {
  log::info!("resize_side_webview");
  GCWebview::resize_side_webview(app, layout).map_err(|err| err.to_string())?;
  Ok(())
}

//-------------------------------------------------------------------------------------
// theme
//-------------------------------------------------------------------------------------
#[tauri::command]
pub async fn set_theme<R: Runtime>(app: AppHandle<R>, theme: Theme) -> anyhow::Result<(), String> {
  log::info!("set_theme: {}", theme);
  GCWebview::set_theme(app, theme).map_err(|err| err.to_string())?;
  Ok(())
}

//-------------------------------------------------------------------------------------
// debug / test
//-------------------------------------------------------------------------------------
#[derive(serde::Serialize)]
pub struct WebviewInfo {
  pub id: String,
  pub label: String,
  pub url: Option<String>,
}

#[tauri::command]
pub async fn get_webviews<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<Vec<WebviewInfo>, String> {
  log::info!("get_webviews called");

  let webviews: Vec<WebviewInfo> = app
    .webviews()
    .iter()
    .map(|(id, webview)| {
      let url = webview.url().ok().map(|u| u.to_string());
      WebviewInfo {
        id: id.clone(),
        label: webview.label().to_string(),
        url,
      }
    })
    .collect();

  log::info!("Found {} webviews", webviews.len());
  Ok(webviews)
}

//-------------------------------------------------------------------------------------
// control
//-------------------------------------------------------------------------------------
