use crate::gc_webview::webview_layout_options::WebviewLayoutOptions;
use once_cell::sync::OnceCell;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Mutex;

static INSTANCE: OnceCell<SvcWebviewLayout> = OnceCell::new();

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SvcWebviewLayout {
  cached: Mutex<HashMap<String, WebviewLayoutOptions>>,
}

impl Default for SvcWebviewLayout {
  fn default() -> Self {
    Self { cached: Mutex::new(HashMap::new()) }
  }
}

impl SvcWebviewLayout {
  pub fn instance() -> &'static Self {
    INSTANCE.get_or_init(|| SvcWebviewLayout::default())
  }

  pub fn set_webview_layout(&self, id: String, layout: WebviewLayoutOptions) -> anyhow::Result<()> {
    let mut cached = self.cached.lock().map_err(|e| anyhow::anyhow!("Failed to acquire lock: {}", e))?;
    cached.insert(id, layout);
    Ok(())
  }

  pub fn get_webview_layout(&self, id: &str) -> Option<WebviewLayoutOptions> {
    let cached = self.cached.lock().ok()?;
    cached.get(id).cloned()
  }

  /// 一次性取出所有已登记的布局快照。
  ///
  /// 供全局窗口尺寸监听器使用：主窗口变化时遍历这份列表逐个调整子 WebView。
  /// 刻意不返回迭代器/Guard，避免调用方在持有锁的情况下做 `set_size` 这类跨进程调用。
  pub fn snapshot(&self) -> Vec<(String, WebviewLayoutOptions)> {
    let Ok(cached) = self.cached.lock() else {
      return Vec::new();
    };
    cached.iter().map(|(id, layout)| (id.clone(), layout.clone())).collect()
  }

  /// WebView 被关闭时调用，避免布局表持续膨胀、也避免全局监听器访问已销毁的 WebView。
  pub fn remove_webview_layout(&self, id: &str) {
    if let Ok(mut cached) = self.cached.lock() {
      cached.remove(id);
    }
  }

  #[allow(dead_code)]
  pub fn clear_webview_layout(&self) {
    if let Ok(mut cached) = self.cached.lock() {
      cached.clear();
    }
  }
}
