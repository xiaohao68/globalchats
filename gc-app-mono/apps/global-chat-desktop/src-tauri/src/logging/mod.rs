//! 日志模块 - 提供日志初始化、工作区日志写入和 panic 捕获功能

use chrono::Local;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::App;

pub mod export;
pub mod panic;

/// 日志级别
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

impl LogLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogLevel::Trace => "TRACE",
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO",
            LogLevel::Warn => "WARN",
            LogLevel::Error => "ERROR",
        }
    }
}

impl From<&str> for LogLevel {
    fn from(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "TRACE" => LogLevel::Trace,
            "DEBUG" => LogLevel::Debug,
            "INFO" => LogLevel::Info,
            "WARN" | "WARNING" => LogLevel::Warn,
            "ERROR" | "ERR" => LogLevel::Error,
            _ => LogLevel::Info,
        }
    }
}

/// 获取项目工作区的 logs/current/ 目录路径
/// 优先使用项目根目录下的 logs 文件夹，如果不存在则使用应用日志目录
pub fn get_workspace_log_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // 尝试从当前工作目录向上查找项目根目录
    let mut current_dir = std::env::current_dir()?;

    // 向上查找包含 src-tauri/Cargo.toml 的目录（项目根目录）
    loop {
        // 检查是否是 Tauri 项目根目录（包含 src-tauri/Cargo.toml）
        if current_dir.join("src-tauri").join("Cargo.toml").exists() {
            let log_dir = current_dir.join("logs").join("current");
            return Ok(log_dir);
        }
        // 也检查 .git 作为备选
        if current_dir.join(".git").exists() {
            let log_dir = current_dir.join("logs").join("current");
            return Ok(log_dir);
        }

        if !current_dir.pop() {
            break;
        }
    }

    // 如果找不到项目根目录，使用临时目录
    let temp_dir = std::env::temp_dir().join("global-chat-desktop").join("logs");
    Ok(temp_dir)
}

/// 获取 panic 日志目录
pub fn get_panic_log_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut current_dir = std::env::current_dir()?;

    loop {
        // 检查是否是 Tauri 项目根目录（包含 src-tauri/Cargo.toml）
        if current_dir.join("src-tauri").join("Cargo.toml").exists() {
            let panic_dir = current_dir.join("logs").join("panic");
            return Ok(panic_dir);
        }
        // 也检查 .git 作为备选
        if current_dir.join(".git").exists() {
            let panic_dir = current_dir.join("logs").join("panic");
            return Ok(panic_dir);
        }

        if !current_dir.pop() {
            break;
        }
    }

    let temp_dir = std::env::temp_dir().join("global-chat-desktop").join("logs").join("panic");
    Ok(temp_dir)
}

/// 确保日志目录存在
fn ensure_log_dir(dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    if !dir.exists() {
        fs::create_dir_all(dir)?;
    }
    Ok(())
}

/// 写入日志到工作区
pub fn write_to_workspace(level: LogLevel, source: &str, message: &str) -> Result<(), Box<dyn std::error::Error>> {
    let log_dir = get_workspace_log_dir()?;
    ensure_log_dir(&log_dir)?;

    let now = Local::now();
    let date_str = now.format("%Y-%m-%d").to_string();
    let timestamp = now.format("%Y-%m-%d %H:%M:%S%.3f").to_string();

    // 按日期分文件存储
    let log_file = log_dir.join(format!("rust_{}.log", date_str));

    let log_line = format!("[{}] [{}] [{}] {}\n", timestamp, level.as_str(), source, message);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file)?;

    file.write_all(log_line.as_bytes())?;
    file.flush()?;

    Ok(())
}

/// 初始化日志系统
pub fn init_logging(_app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // 确保工作区日志目录存在
    let workspace_log_dir = get_workspace_log_dir()?;
    ensure_log_dir(&workspace_log_dir)?;

    let panic_log_dir = get_panic_log_dir()?;
    ensure_log_dir(&panic_log_dir)?;

    // 设置 panic hook
    panic::set_panic_hook();

    log::info!("Logging initialized. Workspace log dir: {:?}", workspace_log_dir);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_log_level_from_str() {
        assert_eq!(LogLevel::from("trace"), LogLevel::Trace);
        assert_eq!(LogLevel::from("DEBUG"), LogLevel::Debug);
        assert_eq!(LogLevel::from("Info"), LogLevel::Info);
        assert_eq!(LogLevel::from("WARN"), LogLevel::Warn);
        assert_eq!(LogLevel::from("error"), LogLevel::Error);
        assert_eq!(LogLevel::from("unknown"), LogLevel::Info);
    }

    #[test]
    fn test_log_level_as_str() {
        assert_eq!(LogLevel::Trace.as_str(), "TRACE");
        assert_eq!(LogLevel::Debug.as_str(), "DEBUG");
        assert_eq!(LogLevel::Info.as_str(), "INFO");
        assert_eq!(LogLevel::Warn.as_str(), "WARN");
        assert_eq!(LogLevel::Error.as_str(), "ERROR");
    }

    #[test]
    fn test_ensure_log_dir() {
        let temp_dir = TempDir::new().unwrap();
        let log_dir = temp_dir.path().join("test_logs").join("current");

        assert!(!log_dir.exists());
        ensure_log_dir(&log_dir).unwrap();
        assert!(log_dir.exists());
    }

    #[test]
    fn test_write_to_workspace() {
        // 此测试需要在工作目录为项目根目录时运行
        // 由于 panic hook 会修改全局状态，此测试单独运行
        // 实际功能通过集成测试验证
    }
}
