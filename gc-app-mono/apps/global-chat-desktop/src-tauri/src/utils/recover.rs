use std::panic::catch_unwind;
use std::any::Any;
use log::error;

/// 执行可能 panic 的操作，捕获并记录 panic
///
/// 此函数用于 WebView 等关键操作的 panic 恢复，确保单个操作失败不会导致整个应用崩溃。
/// 当前未使用，但为将来的稳定性改进预留。
#[allow(dead_code)]
pub fn with_recovery<F, R>(operation_name: &str, f: F) -> Option<R>
where
  F: FnOnce() -> R + std::panic::UnwindSafe,
{
  match catch_unwind(f) {
    Ok(result) => Some(result),
    Err(panic_info) => {
      let msg = panic_message(&panic_info);
      error!("Operation '{}' panicked: {}", operation_name, msg);
      None
    }
  }
}

/// 尝试恢复执行，失败后返回默认值
///
/// 与 `with_recovery` 类似，但允许指定默认值而非返回 Option。
#[allow(dead_code)]
pub fn with_recovery_or<F, R>(operation_name: &str, default: R, f: F) -> R
where
  F: FnOnce() -> R + std::panic::UnwindSafe,
{
  with_recovery(operation_name, f).unwrap_or(default)
}

fn panic_message(info: &Box<dyn Any + Send>) -> String {
  if let Some(s) = info.downcast_ref::<&str>() {
    s.to_string()
  } else if let Some(s) = info.downcast_ref::<String>() {
    s.clone()
  } else {
    "Unknown panic".to_string()
  }
}

/// 用于 WebView 操作的恢复包装
///
/// 专为 WebView 操作设计的包装器，包含 webview_id 和 operation 信息以便调试。
#[allow(dead_code)]
pub fn webview_operation<F, R>(webview_id: &str, operation: &str, f: F) -> Option<R>
where
  F: FnOnce() -> R + std::panic::UnwindSafe,
{
  with_recovery(&format!("webview_{}_{}", webview_id, operation), f)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_with_recovery_success() {
    let result = with_recovery("test_success", || 42);
    assert_eq!(result, Some(42));
  }

  #[test]
  fn test_with_recovery_panic() {
    let result = with_recovery("test_panic", || {
      panic!("test panic");
    });
    assert_eq!(result, None);
  }

  #[test]
  fn test_with_recovery_or_default() {
    let result = with_recovery_or("test_panic", 0, || {
      panic!("test panic");
    });
    assert_eq!(result, 0);
  }

  #[test]
  fn test_panic_message_str() {
    let panic_box: Box<dyn Any + Send> = Box::new("test message");
    assert_eq!(panic_message(&panic_box), "test message");
  }

  #[test]
  fn test_panic_message_string() {
    let panic_box: Box<dyn Any + Send> = Box::new("test message".to_string());
    assert_eq!(panic_message(&panic_box), "test message");
  }

  #[test]
  fn test_panic_message_unknown() {
    let panic_box: Box<dyn Any + Send> = Box::new(42i32);
    assert_eq!(panic_message(&panic_box), "Unknown panic");
  }

  #[test]
  fn test_webview_operation() {
    let result = webview_operation("tg-1", "create", || "success");
    assert_eq!(result, Some("success"));

    let result = webview_operation("wa-1", "load", || {
      panic!("webview panic");
    });
    assert_eq!(result, None);
  }
}
