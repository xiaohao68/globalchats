//! Panic 捕获模块 - 捕获 panic 并写入日志文件

use backtrace::Backtrace;
use chrono::Local;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::panic::{self, PanicHookInfo};
use std::path::PathBuf;
use std::sync::Once;

static PANIC_HOOK_SET: Once = Once::new();

/// 获取 panic 日志目录
fn get_panic_dir() -> PathBuf {
    let mut current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));

    loop {
        // 检查是否是 Tauri 项目根目录（包含 src-tauri/Cargo.toml）
        if current_dir.join("src-tauri").join("Cargo.toml").exists() {
            return current_dir.join("logs").join("panic");
        }
        // 也检查 .git 作为备选
        if current_dir.join(".git").exists() {
            return current_dir.join("logs").join("panic");
        }

        if !current_dir.pop() {
            break;
        }
    }

    std::env::temp_dir()
        .join("global-chat-desktop")
        .join("logs")
        .join("panic")
}

/// 获取 rust.log 路径
fn get_rust_log_path() -> PathBuf {
    let mut current_dir = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));

    loop {
        // 检查是否是 Tauri 项目根目录（包含 src-tauri/Cargo.toml）
        if current_dir.join("src-tauri").join("Cargo.toml").exists() {
            let today = Local::now().format("%Y-%m-%d").to_string();
            return current_dir
                .join("logs")
                .join("current")
                .join(format!("rust_{}.log", today));
        }
        // 也检查 .git 作为备选
        if current_dir.join(".git").exists() {
            let today = Local::now().format("%Y-%m-%d").to_string();
            return current_dir
                .join("logs")
                .join("current")
                .join(format!("rust_{}.log", today));
        }

        if !current_dir.pop() {
            break;
        }
    }

    let today = Local::now().format("%Y-%m-%d").to_string();
    std::env::temp_dir()
        .join("global-chat-desktop")
        .join("logs")
        .join(format!("rust_{}.log", today))
}

/// 确保目录存在
fn ensure_dir(dir: &std::path::Path) {
    if !dir.exists() {
        let _ = fs::create_dir_all(dir);
    }
}

/// 格式化 panic 信息
fn format_panic_info(info: &PanicHookInfo) -> String {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let location = info.location().map(|loc| {
        format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
    }).unwrap_or_else(|| "unknown location".to_string());

    let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
        s.to_string()
    } else if let Some(s) = info.payload().downcast_ref::<String>() {
        s.clone()
    } else {
        "Unknown panic payload".to_string()
    };

    let backtrace = Backtrace::new();
    let backtrace_str = format!("{:?}", backtrace);

    format!(
        r#"
================================================================================
PANIC OCCURRED
================================================================================
Timestamp: {}
Location: {}
Payload: {}

Backtrace:
{}
================================================================================
"#,
        timestamp, location, payload, backtrace_str
    )
}

/// 写入 panic 到专用日志文件
fn write_panic_to_file(panic_info: &str) -> Result<(), Box<dyn std::error::Error>> {
    let panic_dir = get_panic_dir();
    ensure_dir(&panic_dir);

    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let panic_file = panic_dir.join(format!("panic_{}.log", timestamp));

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&panic_file)?;

    file.write_all(panic_info.as_bytes())?;
    file.flush()?;

    eprintln!("Panic log written to: {:?}", panic_file);

    Ok(())
}

/// 写入 panic 到 rust.log
fn write_panic_to_rust_log(panic_info: &str) -> Result<(), Box<dyn std::error::Error>> {
    let log_path = get_rust_log_path();

    if let Some(parent) = log_path.parent() {
        ensure_dir(parent);
    }

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;

    file.write_all(b"\n[PANIC] ")?;
    file.write_all(panic_info.as_bytes())?;
    file.write_all(b"\n")?;
    file.flush()?;

    Ok(())
}

/// 设置 panic hook，捕获 panic 并写入日志
pub fn set_panic_hook() {
    PANIC_HOOK_SET.call_once(|| {
        let default_hook = panic::take_hook();

        panic::set_hook(Box::new(move |info| {
            let panic_str = format_panic_info(info);

            // 写入专用 panic 日志文件
            if let Err(e) = write_panic_to_file(&panic_str) {
                eprintln!("Failed to write panic to file: {}", e);
            }

            // 同时写入 rust.log
            if let Err(e) = write_panic_to_rust_log(&panic_str) {
                eprintln!("Failed to write panic to rust.log: {}", e);
            }

            // 调用默认的 panic hook（打印到 stderr）
            default_hook(info);
        }));

        log::info!("Panic hook installed");
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_get_panic_dir() {
        let dir = get_panic_dir();
        assert!(dir.to_string_lossy().contains("panic"));
    }

    #[test]
    fn test_get_rust_log_path() {
        let path = get_rust_log_path();
        assert!(path.to_string_lossy().contains("rust_"));
        assert!(path.extension().map(|e| e == "log").unwrap_or(false));
    }

    #[test]
    fn test_ensure_dir() {
        let temp_dir = TempDir::new().unwrap();
        let test_dir = temp_dir.path().join("test_panic_dir");

        assert!(!test_dir.exists());
        ensure_dir(&test_dir);
        assert!(test_dir.exists());
    }

    #[test]
    fn test_format_panic_info() {
        // 由于 PanicInfo 无法直接构造，我们测试辅助函数
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();
        assert!(!timestamp.is_empty());

        let backtrace = Backtrace::new();
        let backtrace_str = format!("{:?}", backtrace);
        assert!(!backtrace_str.is_empty());
    }

    #[test]
    fn test_panic_hook_installation() {
        // 测试 panic hook 只安装一次
        set_panic_hook();
        set_panic_hook(); // 第二次调用应该不执行任何操作

        // 如果测试能运行到这里，说明没有 panic
        assert!(true);
    }
}
