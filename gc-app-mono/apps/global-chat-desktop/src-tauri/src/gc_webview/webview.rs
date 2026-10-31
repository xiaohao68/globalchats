use crate::gc_webview::file_utils::get_unique_filename;
use crate::gc_webview::svc_webview_layout::SvcWebviewLayout;
use crate::gc_webview::webview_layout_options::WebviewLayoutOptions;
use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use std::fs;
use std::time::Duration;
use tauri::webview::{DownloadEvent, NewWindowResponse, PageLoadEvent};
use tauri::{is_dev, AppHandle, Emitter, LogicalPosition, Manager, Runtime, Theme, WebviewBuilder, WebviewUrl, WindowEvent};
use tokio::time::sleep;
use uuid::Uuid;

// #[derive(Clone)]
pub struct GCWebview {}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewOptions {
  #[serde(default)]
  pub id: String,
  pub platform: Option<String>,
  pub url: Option<WebviewUrl>,
  pub layout: Option<WebviewLayoutOptions>,
  pub active: Option<bool>,
  pub visible: Option<bool>,
  pub accept_first_mouse: Option<bool>,
  pub data_store_identifier: Option<String>,
  pub user_agent: Option<String>,
  pub proxy_url: Option<String>,
}

/// 代理不可用时抛给前端的事件载荷。
///
/// 前端据此在平台头部提示「该账号的代理连不上，已自动改为直连」，
/// 避免用户看到一张 Edge 自带的报错页却不知道为什么。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyUnavailablePayload {
  pub webview_id: String,
  pub proxy_url: String,
  pub reason: String,
}

/// 「访问被重定向到已停服的本地化站点」事件载荷。
///
/// 现象：点开 LinkedIn 后右侧一整片纯白，界面上没有任何报错。
/// 真实原因不在本机代码：平台会按**出口 IP** 判定地区，一旦判定为受限地区，
/// 就把请求 302 重定向到本地化站点（linkedin.com → linkedin.cn）。
/// 而该站点（/incareer/*）早已停服，返回 HTTP 451 Unavailable For Legal Reasons，
/// 于是 WebView 里渲染出来的就是一张空白页 —— 用户完全无从判断是网络、代理还是程序的问题。
///
/// 这条事件的作用就是把这个「沉默的失败」显式讲出来，并指向正确的解法：
/// 给该平台账号配置一个境外出口 IP 的代理。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformRegionBlockedPayload {
  pub webview_id: String,
  /// 被重定向到的地址（用于提示与排障）
  pub url: String,
}

/// 「平台把页面踢到了登录/验证页」事件载荷。
///
/// 为什么需要这条事件（2026-10-20 真事故）：
///   重启电脑后 Clash 还没起来 → 代理 TCP 预检失败 → 本模块自动降级直连
///   → 出口变成中国 IP → LinkedIn 判定异常 → 弹「验证手机号」→ 页面被踢到 `/signIn`。
///   此时 preload 里的监听脚本**还活着、心跳照跑**，但 `isWatchablePage()` 恒为 false，
///   于是路线 A / 路线 B 全被跳过，连「开机补扫」的触发点都到不了。
///   表现就是：软件看着一切正常，实际上一条消息都收不到，而且日志里全是 8 秒一条的 debug 噪音。
///
/// 这条事件把「沉默的失效」变成界面上一条明确的红条：
/// 「登录态失效，请重新登录」。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformNeedReloginPayload {
  pub webview_id: String,
  /// 被踢到的地址（用于提示与排障）
  pub url: String,
}

/// 代理连通性预检的超时上限。
/// 取 1.5s：本地代理被拒绝连接是毫秒级返回，只有「地址能解析但没人应答」才会等满。
const PROXY_PROBE_TIMEOUT: Duration = Duration::from_millis(1500);

/// 默认 User-Agent：伪装成一个正常的 Windows Chrome。
///
/// 为什么需要（2026-10-21 业务员实测）：
///   WebView2 的默认 UA 带 `Edg/xxx` 标识，LinkedIn 这类平台会据此判定为
///   「内嵌浏览器 / 自动化环境」，表现是登录后**每 4~6 秒在 /signIn 和 /login 之间
///   循环跳转**，监听脚本永远建不了基线，一条消息都上报不了。
///   同一个网络下用普通 Chrome 打开却完全正常 —— 差异就在 UA。
///
/// 注意：不要加 `Edg/` 或 `WebView`，也不要用太老的 Chrome 版本号（平台会判为过时浏览器）。
const DEFAULT_BROWSER_UA: &str =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/// 建窗口之前先探一次代理的 TCP 连通性（含 DNS 解析）。
///
/// 为什么必须探：WebView2 的代理只能在**创建窗口时**确定，一旦代理不可达，
/// 网页里渲染出来的是 Edge 自带的「你尚未连接 ERR_PROXY_CONNECTION_FAILED」报错页。
/// 这时窗口已经建好，运行时换代理不会生效，用户只能盯着一个死页面，也拿不到任何提示。
/// 典型触发场景：数据库 proxy_config 里存的是占位/失效地址
/// （种子数据里就有一条 `us-proxy.example.com:1080`，该域名根本不存在）。
///
/// 探通了才把代理交给 WebView；探不通就退回直连，至少保证平台网页能打开。
pub fn probe_proxy(proxy_url: &str) -> anyhow::Result<()> {
  let url = tauri::Url::parse(proxy_url).map_err(|err| anyhow!("代理地址格式不合法: {err}"))?;
  let host = url.host_str().ok_or_else(|| anyhow!("代理地址缺少主机名"))?;
  let port = url.port().unwrap_or(match url.scheme() {
    "https" => 443,
    "socks5" | "socks5h" => 1080,
    _ => 80,
  });

  let socket = std::net::ToSocketAddrs::to_socket_addrs(&(host, port))
    .map_err(|err| anyhow!("代理域名无法解析 {host}: {err}"))?
    .next()
    .ok_or_else(|| anyhow!("代理域名无法解析: {host}"))?;

  std::net::TcpStream::connect_timeout(&socket, PROXY_PROBE_TIMEOUT)
    .map_err(|err| anyhow!("代理无法连接 {host}:{port} — {err}"))?;

  Ok(())
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum WebviewChannelPageLoadEnum {
  Navigation,
  Started,
  Finished,
}
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageLoadPayload {
  pub status: WebviewChannelPageLoadEnum,
}
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebviewChannelPayload {
  #[serde(default)]
  pub sender_id: String,
  pub receiver_ids: Vec<String>,
  pub r#type: String,
  pub payload: PageLoadPayload,
}

impl GCWebview {
  pub fn create<R: Runtime>(app: AppHandle<R>, options: WebviewOptions) -> anyhow::Result<(), anyhow::Error> {
    // 记录「创建前已存在的 WebView 清单」。
    // 用途：判断 LRU 回收是否真的生效、以及是否有旧版路径（webviewManger.create）
    // 创建的 WebView 在后台堆积 —— 多个 WebView 叠加时，上层那个会盖住下层，
    // 用户看到的就是「点了没反应 / 一片空白」。
    let existing: Vec<String> = app.webviews().keys().cloned().collect();
    log::info!(
      "[{}] 创建内嵌 WebView，创建前已存在 {} 个: {:?}",
      options.id,
      existing.len(),
      existing
    );

    let app_clone1 = app.clone();
    let app_clone2 = app.clone();
    let id_clone1 = options.id.clone();
    let id_clone2 = options.id.clone();
    let window = app.get_window("main").ok_or(anyhow!("window not found"))?;
    let mut builder = match options.url {
      Some(url) => WebviewBuilder::new(options.id.clone(), url),
      None => Err(anyhow!("webview url not found"))?,
    };

    builder = builder
      .transparent(false)
      .on_page_load(move |_webview, page_load_payload| {
        let sender_id = id_clone1.clone();
        let main_webview = app_clone1.get_webview("main").ok_or(anyhow!("main webview not found")).unwrap();

        log::info!("page_load_payload event: {:?}", page_load_payload.event());
        match page_load_payload.event() {
          PageLoadEvent::Started => {
            main_webview
              .emit(
                "WebviewChannel",
                WebviewChannelPayload {
                  sender_id,
                  receiver_ids: vec!["main".to_string()],
                  r#type: "loadingProgress".to_string(),
                  payload: PageLoadPayload {
                    status: WebviewChannelPageLoadEnum::Started,
                  },
                },
              )
              .unwrap();
          }
          PageLoadEvent::Finished => {
            main_webview
              .emit(
                "WebviewChannel",
                WebviewChannelPayload {
                  sender_id,
                  receiver_ids: vec!["main".to_string()],
                  r#type: "loadingProgress".to_string(),
                  payload: PageLoadPayload {
                    status: WebviewChannelPageLoadEnum::Finished,
                  },
                },
              )
              .unwrap();
          }
        }
      })
      .on_navigation(move |url| {
        let sender_id = id_clone2.clone();
        let main_webview = app_clone2.get_webview("main").ok_or(anyhow!("main webview not found")).unwrap();

        // ------------------------------------------------------------
        // 地区受限检测（把「沉默的白屏」变成一句能看懂的话）
        //
        // 平台按出口 IP 判定地区。判定为受限地区时会把请求重定向到本地化站点，
        // 而 linkedin.cn/incareer/* 已停服 → HTTP 451 → 页面全白且无任何提示。
        // 这里把重定向事实抛给前端，提示用户「该账号需要走境外代理」。
        // ------------------------------------------------------------
        let full_url = url.as_str().to_string();
        let host = url.host_str().unwrap_or("");
        let region_blocked = host.ends_with("linkedin.cn")
          || full_url.contains("/check/china/")
          || full_url.contains("/incareer/");
        if region_blocked {
          log::warn!(
            "[{}] 访问被重定向到已停服的本地化站点（页面会是空白的，需为该账号配置境外代理）: {}",
            id_clone2,
            full_url
          );
          let _ = main_webview.emit(
            "PlatformRegionBlocked",
            PlatformRegionBlockedPayload {
              webview_id: id_clone2.clone(),
              url: full_url.clone(),
            },
          );
        }

        // ------------------------------------------------------------
        // 登录态失效检测（2026-10-20 新增，真事故驱动）
        //
        // 事故链条：重启后代理没起来 → 直连中国 IP → 平台判定异常 → 页面被踢到登录页。
        // 监听脚本仍在跑，但永远判不到「可监听页面」，于是**静默地一条消息都收不到**。
        // 这里把「被踢到登录页」显式抛给前端，界面直接显示红条，业务员知道要去重新登录。
        // ------------------------------------------------------------
        let lower = full_url.to_lowercase();
        let kicked_to_login = !region_blocked
          && (lower.contains("/signin")
            || lower.contains("/login")
            || lower.contains("/checkpoint")
            || lower.contains("/uas/"));
        if kicked_to_login {
          log::warn!(
            "[{}] 平台把页面踢到了登录/验证页（监听会失效，需要重新登录并确认代理已启动）: {}",
            id_clone2,
            full_url
          );
          let _ = main_webview.emit(
            "PlatformNeedRelogin",
            PlatformNeedReloginPayload {
              webview_id: id_clone2.clone(),
              url: full_url.clone(),
            },
          );
        } else {
          // 页面回到了正常区域（登录成功 / 进到消息页）→ 通知前端把红条收起来。
          // 2026-10-21 补：之前红条只能手动关，业务员如果直接在网页里登录成功，
          // 红条会一直挂着「监听已停止」，反而误导人。这里幂等清空，开销可忽略。
          let _ = main_webview.emit(
            "PlatformReloginResolved",
            PlatformNeedReloginPayload {
              webview_id: id_clone2.clone(),
              url: full_url.clone(),
            },
          );
        }

        main_webview
          .emit(
            "WebviewChannel",
            WebviewChannelPayload {
              sender_id,
              receiver_ids: vec!["main".to_string()],
              r#type: "loadingProgress".to_string(),
              payload: PageLoadPayload {
                status: WebviewChannelPageLoadEnum::Navigation,
              },
            },
          )
          .is_ok()
      });

    if let Some(_platform) = options.platform {
      if is_dev() {
        let script_path = String::from("../dist/preload/index.js");
        log::info!("platforms: {script_path}");
        let script_content = fs::read_to_string(script_path).map_err(|err| anyhow!("{:?}", err))?;
        builder = builder.initialization_script(script_content);
      } else {
        builder = builder.initialization_script(include_str!("../../../dist/preload/index.js"));
      }
    }

    if let Some(accept_first_mouse) = options.accept_first_mouse {
      builder = builder.accept_first_mouse(accept_first_mouse);
    }

    if let Some(data_store_identifier) = options.data_store_identifier {
      let uuid = Uuid::parse_str(&data_store_identifier)?;

      #[cfg(target_os = "windows")]
      {
        let app_local_data_dir = app.path().app_local_data_dir()?;
        let data_dir = app_local_data_dir.join("Partitions").join(uuid.to_string());
        builder = builder.data_directory(data_dir);
      }

      #[cfg(target_os = "macos")]
      {
        builder = builder.data_store_identifier(uuid.into_bytes());
      }
    }
    // user_agent
    //
    // 优先用账号绑定的 UA；没绑就用 DEFAULT_BROWSER_UA 伪装成正常 Chrome。
    // 原来「没绑就用 WebView2 默认值」是个坑：默认 UA 带 Edg/，LinkedIn 会
    // 判定为自动化环境，表现为登录后在 /signIn 与 /login 之间循环跳转（见常量注释）。
    let ua = options
      .user_agent
      .clone()
      .unwrap_or_else(|| DEFAULT_BROWSER_UA.to_string());
    // 注意：这里用 options.id 而不是 id_clone2 ——
    // id_clone2 在上面 `.on_navigation(move |url| ...)` 时已经被 move 进闭包了
    log::info!("[{}] 使用 UA: {}", options.id, ua);
    builder = builder.user_agent(&ua);
    // proxy
    //
    // 连通性预检已上移到 plugin 层（`resolve_proxy_or_direct`），在那里用阻塞线程池执行。
    // 原先在这里同步调用 probe_proxy（最长 1.5s）会占住 tokio worker 线程，
    // 快速切换平台时多个 create 并发就把事件循环堵死，add_child 卡住不动。
    // 到这一步 options.proxy_url 要么是「探通过的」，要么已被清空退回直连。
    if let Some(proxy_url) = options.proxy_url.clone() {
      if !proxy_url.is_empty() {
        log::info!("[{}] 使用代理 {proxy_url}", options.id);
        builder = builder.proxy_url(proxy_url.parse()?);
      }
    }

    // download
    builder = builder.on_download(move |webview, event| {
      match event {
        DownloadEvent::Requested { url: _url, destination } => {
          let download_dir = webview.app_handle().path().download_dir().unwrap();
          let mut download_path = download_dir.join(&destination);
          if download_path.exists() {
            download_path = get_unique_filename(&download_path);
          }

          *destination = download_path
        }
        DownloadEvent::Finished { url, path, success } => {
          println!("downloaded {} to {:?}, success: {}", url, path, success);
        }
        _ => (),
      }
      true
    });

    // ------------------------------------------------------------
    // 新窗口（window.open / target="_blank"）处理
    // ------------------------------------------------------------
    // 关键：
    // 1) wry 在没有注册这个回调时，默认对 NewWindowRequested 直接 SetHandled(true)，
    //    也就是「静默拒绝」所有新窗口。表现为：点击 Google / Apple 登录按钮、
    //    reCAPTCHA 人机验证弹窗时「完全没有反应」。
    // 2) 这里交还给 WebView2 的默认实现（Allow）。弹窗会继承同一个 WebView2 环境，
    //    也就是同一 data_directory / 代理 / User-Agent / Cookie，
    //    OAuth 回跳与 reCAPTCHA 才能正常走完。
    let new_window_webview_id = options.id.clone();
    builder = builder.on_new_window(move |url, _features| {
      let _ = crate::logging::write_to_workspace(
        crate::logging::LogLevel::Info,
        "webview",
        &format!("[{}] 打开新窗口: {}", new_window_webview_id, url),
      );
      NewWindowResponse::Allow
    });

    let webview = match &options.layout {
      Some(layout) => {
        let scale_factor = window.scale_factor()?;
        let parent_size = window.inner_size()?.to_logical::<f32>(scale_factor);
        let position = LogicalPosition::new(layout.left, layout.top);

        let size = layout.to_size(&parent_size);
        // 记录「创建那一刻」的真实矩形：这是内嵌网页错位/隐形时唯一的现场证据。
        log::info!(
          "[{}] create_webview 矩形 left={} top={} right={:?} bottom={:?} → {:.0}x{:.0}，父窗口 {:.0}x{:.0}",
          options.id,
          layout.left,
          layout.top,
          layout.right,
          layout.bottom,
          size.width,
          size.height,
          parent_size.width,
          parent_size.height
        );
        window.add_child(builder, position, size)?
      }
      None => {
        log::info!("[{}] create_webview 未指定布局 → 铺满父窗口", options.id);
        window.add_child(builder, window.inner_position()?, window.inner_size()?)?
      }
    };

    if let Some(layout) = options.layout {
      Self::register_layout(options.id, layout)?;
    }

    if let Some(visible) = options.visible {
      if visible {
        webview.show()?;
      } else {
        webview.hide()?;
      }
    }

    // 创建完成后立刻回读一次注册表。
    // 正常情况这里应该比「创建前」多出本次的 id；
    // 若没有，说明这个子 WebView 注册失败（后续 show/hide/close/set_bounds 全部会
    // 因为 app.get_webview() 查不到而静默失效），是内嵌网页「不显示 / 不切换」的元凶。
    let after: Vec<String> = app.webviews().keys().cloned().collect();
    log::info!(
      "[{}] create_webview 完成，注册表现有 {} 个: {:?}",
      webview.label(),
      after.len(),
      after
    );

    Ok(())
  }
  /// 登记子 WebView 的布局，供全局尺寸监听器在窗口变化时重算。
  ///
  /// 这里刻意**不注册** `on_window_event`：
  /// Tauri 2 的 `Window::on_window_event` 没有返回值、无法注销，原实现每创建一个
  /// WebView 就永久累积一个闭包（6 个平台 = 6 个监听器，窗口一动就触发 6 次
  /// `set_size`，且已关闭的 WebView 仍会被访问）。
  /// 现在改为在 `setup` 阶段注册唯一一个全局监听器（见 `init_resize_listener`），
  /// 此处只更新布局表。
  pub fn register_layout(webview_id: String, layout: WebviewLayoutOptions) -> anyhow::Result<(), anyhow::Error> {
    SvcWebviewLayout::instance().set_webview_layout(webview_id, layout)
  }

  /// 注册全局唯一的窗口尺寸监听器（整个应用只调用一次，在 setup 阶段）。
  pub fn init_resize_listener<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), anyhow::Error> {
    let window = app.get_window("main").ok_or(anyhow!("window not found"))?;
    let app_handle = app.clone();
    window.on_window_event(move |event| {
      if let WindowEvent::Resized(size) = event {
        Self::sync_all_bounds(&app_handle, *size);
      }
    });
    log::info!("[webview] 全局窗口尺寸监听器已注册（仅此一个，替代原先每 WebView 一个的实现）");
    Ok(())
  }

  /// 主窗口尺寸变化时，统一重算所有**已登记且仍存活**的子 WebView 尺寸。
  fn sync_all_bounds<R: Runtime>(app: &AppHandle<R>, physical_size: tauri::PhysicalSize<u32>) {
    let layouts = SvcWebviewLayout::instance().snapshot();
    if layouts.is_empty() {
      return;
    }
    let Some(window) = app.get_window("main") else {
      return;
    };
    let Ok(scale_factor) = window.scale_factor() else {
      return;
    };
    let parent_size = physical_size.to_logical::<f32>(scale_factor);

    for (id, layout) in layouts {
      // 已关闭的 WebView 会返回 None，直接跳过
      // （布局表在 close 时已清理，这里是双保险）
      if let Some(webview) = app.get_webview(&id) {
        if let Err(err) = webview.set_size(layout.to_size(&parent_size)) {
          log::warn!("[webview] 尺寸同步失败 {}: {}", id, err);
        }
      }
    }
  }

  // pub fn resize<R: Runtime>(app_handle: AppHandle<R>, webview_id: String, layout: WebviewLayoutOptions) -> anyhow::Result<(), anyhow::Error> {
  //   let window = app_handle.get_window("main").ok_or(anyhow!("window not found"))?;
  //   let webview = app_handle.get_webview(&webview_id).ok_or(anyhow!("webview not found"))?;
  //   let scale_factor = window.scale_factor()?;
  //   let parent_size = window.inner_size()?.to_logical::<f32>(scale_factor);
  //   let size = layout.to_size(&parent_size);
  //   SvcWebviewLayout::instance().set_webview_layout(webview_id, layout)?;
  //   webview.set_size(size)?;
  //   Ok(())
  // }

  /// 重新设置子 WebView 的位置与大小（前端 DOM 布局变化时调用）。
  /// 与 create 不同的是：已存在的 WebView 也会被移动/缩放，不会重建。
  pub fn set_bounds<R: Runtime>(app: AppHandle<R>, webview_id: String, layout: WebviewLayoutOptions) -> anyhow::Result<(), anyhow::Error> {
    let window = app.get_window("main").ok_or(anyhow!("window not found"))?;
    let webview = app.get_webview(&webview_id).ok_or(anyhow!("webview not found: {}", webview_id))?;
    let scale_factor = window.scale_factor()?;
    let parent_size = window.inner_size()?.to_logical::<f32>(scale_factor);

    let size = layout.to_size(&parent_size);
    let position = LogicalPosition::new(layout.left, layout.top);

    // 把每次下发的矩形记下来。
    // 内嵌网页「整片空白 / 位置不对」这类问题，根因几乎都在这一次布局换算上
    // （算出的宽高为 0、或旧矩形没被纠正），没有这条日志就只能靠猜。
    log::info!(
      "[{webview_id}] set_bounds left={} top={} right={:?} bottom={:?} → {:.0}x{:.0} @({:.0},{:.0})，父窗口 {:.0}x{:.0}",
      layout.left, layout.top, layout.right, layout.bottom,
      size.width, size.height, position.x, position.y,
      parent_size.width, parent_size.height
    );

    // 尺寸保护：布局参数异常时会算出 0 或负数，WebView 会变成一个不可见的隐形窗口
    // （用户看到的就是「网页打不开」）。这种值直接不下发，保留上一次的有效矩形。
    if size.width < 1.0 || size.height < 1.0 {
      log::warn!(
        "[{webview_id}] 布局换算出的尺寸无效（{:.0}x{:.0}），已忽略这次修改",
        size.width, size.height
      );
      return Ok(());
    }

    SvcWebviewLayout::instance().set_webview_layout(webview_id, layout)?;
    webview.set_position(position)?;
    webview.set_size(size)?;

    Ok(())
  }

  /// 彻底移除子 WebView：关闭 + 清空浏览数据（登录态一并清除）。
  /// 注意：这是「重置平台」语义，日常切换平台请用 `close`，否则用户需要重新登录。
  pub fn remove<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), anyhow::Error> {
    if let Some(webview) = app.get_webview(&webview_id) {
      webview.close()?;
      webview.clear_all_browsing_data()?;
    }
    SvcWebviewLayout::instance().remove_webview_layout(&webview_id);
    Ok(())
  }

  pub fn update<R: Runtime>(app: AppHandle<R>, options: WebviewOptions) -> anyhow::Result<(), anyhow::Error> {
    let webview = app.get_webview(&options.id).ok_or(anyhow!("webview not found"))?;

    if let Some(visible) = options.visible {
      if visible {
        webview.show()?;
      } else {
        webview.hide()?;
      }
    }
    if let Some(active) = options.active {
      if !active {
        webview.close()?;
      }
    }

    Ok(())
  }

  pub fn show<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), anyhow::Error> {
    let webview = app.get_webview(&webview_id).ok_or_else(|| anyhow!("Webview not found"))?;
    webview.show()?;
    Ok(())
  }
  pub fn hide<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), anyhow::Error> {
    if let Some(webview) = app.get_webview(&webview_id) {
      webview.hide()?;
    }
    Ok(())
  }
  /// 关闭子 WebView 并释放其占用的内存/进程，**但保留磁盘上的登录态**。
  ///
  /// 与 `remove` 的关键区别：这里刻意不调用 `clear_all_browsing_data()`。
  /// 每个平台的 Cookie / localStorage 都落在独立的数据分区目录里
  /// （`<app_local_data>/Partitions/<uuid>/`），关闭 WebView 不会删除这些文件，
  /// 所以再次打开同一平台时登录态仍然有效，用户不需要重新扫码登录。
  ///
  /// 这是「按需回收 WebView 以控制内存」策略的基础：点开 6 个平台不会再让
  /// 6 个完整浏览器实例永久常驻。
  pub fn close<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), anyhow::Error> {
    if let Some(webview) = app.get_webview(&webview_id) {
      webview.close()?;
    }
    // 从布局表移除：避免全局尺寸监听器继续访问已销毁的 WebView，也避免表无限膨胀
    SvcWebviewLayout::instance().remove_webview_layout(&webview_id);
    Ok(())
  }
  pub fn open_devtools<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), anyhow::Error> {
    #[cfg(debug_assertions)]
    {
      let webview = app.get_webview(&webview_id).ok_or(anyhow!("Webview not found"))?;
      webview.open_devtools();
    }

    Ok(())
  }
  pub fn close_devtools<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), anyhow::Error> {
    #[cfg(debug_assertions)]
    {
      let webview = app.get_webview(&webview_id).ok_or(anyhow!("Webview not found"))?;
      webview.close_devtools();
    }
    Ok(())
  }
  pub fn toggle_devtools<R: Runtime>(app: AppHandle<R>, webview_id: String) -> anyhow::Result<(), anyhow::Error> {
    #[cfg(debug_assertions)]
    {
      let webview = app.get_webview(&webview_id).ok_or(anyhow!("Webview not found"))?;
      let is_devtools_open = webview.is_devtools_open();
      if is_devtools_open {
        webview.close_devtools();
      } else {
        webview.open_devtools();
      }
    }
    Ok(())
  }

  pub async fn reload_webview<R: Runtime>(app: AppHandle<R>, options: WebviewOptions) -> anyhow::Result<(), anyhow::Error> {
    if let Some(webview) = app.get_webview(&options.id) {
      webview.close()?;
      sleep(Duration::from_secs_f32(0.3)).await;
    }

    Self::create(app, options)?;

    Ok(())
  }
}

impl GCWebview {
  pub fn create_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), anyhow::Error> {
    let id = "secondary".to_string();
    let window = app.get_window("main").ok_or(anyhow!("window not found"))?;
    let secondary_window = app.get_window(&id).ok_or(anyhow!("{} window not found", &id))?;

    let layout = WebviewLayoutOptions {
      left: 1025.,
      top: 47.,
      right: Some(74.),
      bottom: Some(15.),
      width: Some(341.),
      height: None,
    };

    let scale_factor = window.scale_factor()?;
    let parent_size = window.inner_size()?.to_logical::<f32>(scale_factor);
    let parent_position = window.inner_position()?.to_logical::<f32>(scale_factor);
    let position = layout.to_sideview_position(&parent_size, &parent_position);
    let size = layout.to_sideview_size(&parent_size);
    secondary_window.set_size(size)?;
    secondary_window.set_position(position)?;

    Self::auto_resize_side_webview(app, layout)?;

    Ok(())
  }

  pub fn auto_resize_side_webview<R: Runtime>(app: AppHandle<R>, layout: WebviewLayoutOptions) -> anyhow::Result<(), anyhow::Error> {
    let id = "secondary".to_string();

    let window = app.get_window("main").ok_or(anyhow!("window not found"))?;
    let secondary_window = app.get_window(&id).ok_or(anyhow!("{} window not found", &id))?;
    let scale_factor = window.scale_factor()?;
    let _window = window.clone();

    SvcWebviewLayout::instance().set_webview_layout(id.clone(), layout)?;

    window.on_window_event(move |window_event| match window_event {
      WindowEvent::Resized(x) => {
        if let Some(webview_layout) = SvcWebviewLayout::instance().get_webview_layout(&id) {
          let parent_size = x.to_logical::<f32>(scale_factor);
          let parent_position = _window.inner_position().unwrap().to_logical::<f32>(scale_factor);
          let size = webview_layout.to_sideview_size(&parent_size);
          let position = webview_layout.to_sideview_position(&parent_size, &parent_position);
          if let Err(x) = secondary_window.set_size(size) {
            log::error!("{}", x);
          }
          if let Err(x) = secondary_window.set_position(position) {
            log::error!("{}", x);
          }
        }
      }
      WindowEvent::Moved(x) => {
        if let Some(webview_layout) = SvcWebviewLayout::instance().get_webview_layout(&id) {
          let parent_size = _window.inner_size().unwrap().to_logical::<f32>(scale_factor);
          let parent_position = x.to_logical::<f32>(scale_factor);
          let position = webview_layout.to_sideview_position(&parent_size, &parent_position);
          if let Err(x) = secondary_window.set_position(position) {
            log::error!("{}", x);
          }
        }
      }
      WindowEvent::Focused(_x) => {
        // secondary_window.set_always_on_top(x.clone()).unwrap();
      }
      _ => {}
    });

    Ok(())
  }

  pub fn close_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), anyhow::Error> {
    if let Some(window) = app.get_window("secondary") {
      window.close()?;
    }
    Ok(())
  }

  pub fn show_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), anyhow::Error> {
    if let Some(window) = app.get_window("secondary") {
      window.show()?;
      return Ok(());
    }
    // Self::create_side_webview(app)?;
    Ok(())
  }
  pub fn hide_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), anyhow::Error> {
    if let Some(window) = app.get_window("secondary") {
      window.hide()?;
    }
    Ok(())
  }
  pub fn toggle_side_webview<R: Runtime>(app: AppHandle<R>) -> anyhow::Result<(), anyhow::Error> {
    if let Some(window) = app.get_window("secondary") {
      match window.is_visible()? {
        true => {
          window.hide()?;
        }
        false => {
          window.show()?;
        }
      }
    }
    Ok(())
  }
  pub fn resize_side_webview<R: Runtime>(app: AppHandle<R>, layout: WebviewLayoutOptions) -> anyhow::Result<(), anyhow::Error> {
    let main_window = app.get_window("main").ok_or(anyhow!("window not found"))?;
    let secondary_window = app.get_window("secondary").ok_or(anyhow!("window not found"))?;

    let scale_factor = main_window.scale_factor()?;
    let parent_size = main_window.inner_size()?.to_logical::<f32>(scale_factor);
    let parent_position = main_window.inner_position()?.to_logical::<f32>(scale_factor);
    let position = layout.to_position(&parent_position);
    let size = layout.to_size(&parent_size);
    secondary_window.set_size(size)?;
    secondary_window.set_position(position)?;

    Ok(())
  }
}

// theme
impl GCWebview {
  pub fn set_theme<R: Runtime>(app: AppHandle<R>, theme: Theme) -> anyhow::Result<(), anyhow::Error> {
    let main_window = app.get_window("main").ok_or(anyhow!("window not found"))?;
    let secondary_window = app.get_window("secondary").ok_or(anyhow!("window not found"))?;
    main_window.set_theme(Some(theme))?;
    secondary_window.set_theme(Some(theme))?;
    Ok(())
  }
}
