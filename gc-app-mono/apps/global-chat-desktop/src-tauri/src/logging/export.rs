//! 日志导出模块 - 提供日志查询和导出功能

use chrono::{DateTime, Local, NaiveDateTime};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use tauri::command;


/// 日志查询请求
#[derive(Debug, Clone, Deserialize)]
pub struct QueryLogsRequest {
    /// 日志来源过滤（可选）
    pub source: Option<String>,
    /// 日志级别过滤（可选）
    pub level: Option<String>,
    /// 开始时间（可选，格式：YYYY-MM-DD HH:MM:SS）
    pub start_time: Option<String>,
    /// 结束时间（可选，格式：YYYY-MM-DD HH:MM:SS）
    pub end_time: Option<String>,
    /// 最大返回条数（默认 100）
    pub limit: Option<usize>,
}

/// 日志条目
#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
}

/// 日志查询响应
#[derive(Debug, Clone, Serialize)]
pub struct QueryLogsResponse {
    pub entries: Vec<LogEntry>,
    pub total: usize,
}

/// 导出日志请求
#[derive(Debug, Clone, Deserialize)]
pub struct ExportLogsRequest {
    /// 日志来源过滤（可选）
    pub source: Option<String>,
    /// 日志级别过滤（可选）
    pub level: Option<String>,
    /// 开始时间（可选）
    pub start_time: Option<String>,
    /// 结束时间（可选）
    pub end_time: Option<String>,
    /// 导出文件路径
    pub output_path: String,
}

/// 导出日志响应
#[derive(Debug, Clone, Serialize)]
pub struct ExportLogsResponse {
    pub success: bool,
    pub exported_count: usize,
    pub output_path: String,
    pub error: Option<String>,
}

/// 获取日志目录
fn get_log_dir() -> PathBuf {
    let mut current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    loop {
        // 检查是否是 Tauri 项目根目录（包含 src-tauri/Cargo.toml）
        if current_dir.join("src-tauri").join("Cargo.toml").exists() {
            return current_dir.join("logs").join("current");
        }
        // 也检查 .git 作为备选
        if current_dir.join(".git").exists() {
            return current_dir.join("logs").join("current");
        }

        if !current_dir.pop() {
            break;
        }
    }

    std::env::temp_dir()
        .join("global-chat-desktop")
        .join("logs")
}

/// 解析日志行
/// 格式: [2024-01-15 10:30:45.123] [INFO] [source] message
fn parse_log_line(line: &str) -> Option<LogEntry> {
    // 去除首尾空白
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    // 解析时间戳 [YYYY-MM-DD HH:MM:SS.mmm]
    let timestamp_end = line.find(']')?;
    let timestamp = line[1..timestamp_end].to_string();

    // 解析级别 [LEVEL]
    let level_start = timestamp_end + 2;
    let level_end = line[level_start..].find(']')?;
    let level = line[level_start + 1..level_start + level_end].to_string();

    // 解析来源 [source]
    let source_start = level_start + level_end + 2;
    let source_end = line[source_start..].find(']')?;
    let source = line[source_start + 1..source_start + source_end].to_string();

    // 解析消息
    let message_start = source_start + source_end + 2;
    let message = line[message_start..].trim().to_string();

    Some(LogEntry {
        timestamp,
        level,
        source,
        message,
    })
}

/// 检查日志条目是否匹配过滤条件
fn matches_filter(
    entry: &LogEntry,
    source_filter: &Option<String>,
    level_filter: &Option<String>,
    start_time: &Option<DateTime<Local>>,
    end_time: &Option<DateTime<Local>>,
) -> bool {
    // 来源过滤
    if let Some(ref source) = source_filter {
        if !entry.source.to_lowercase().contains(&source.to_lowercase()) {
            return false;
        }
    }

    // 级别过滤
    if let Some(ref level) = level_filter {
        if entry.level.to_uppercase() != level.to_uppercase() {
            return false;
        }
    }

    // 时间范围过滤
    if start_time.is_some() || end_time.is_some() {
        if let Ok(entry_time) = NaiveDateTime::parse_from_str(
            &entry.timestamp[..entry.timestamp.find('.').unwrap_or(entry.timestamp.len())],
            "%Y-%m-%d %H:%M:%S",
        ) {
            let entry_time: DateTime<Local> = DateTime::from_naive_utc_and_offset(
                entry_time,
                *Local::now().offset(),
            );

            if let Some(start) = start_time {
                if entry_time < *start {
                    return false;
                }
            }

            if let Some(end) = end_time {
                if entry_time > *end {
                    return false;
                }
            }
        }
    }

    true
}

/// 读取日志文件
fn read_log_file(path: &Path) -> Result<Vec<LogEntry>, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let reader = BufReader::new(file);
    let mut entries = Vec::new();

    for line in reader.lines() {
        let line = line?;
        if let Some(entry) = parse_log_line(&line) {
            entries.push(entry);
        }
    }

    Ok(entries)
}

/// 查询日志
///
/// # Arguments
/// * `request` - 查询请求参数
///
/// # Returns
/// * `QueryLogsResponse` - 查询结果
#[command]
pub fn query_logs(request: QueryLogsRequest) -> Result<QueryLogsResponse, String> {
    let log_dir = get_log_dir();

    if !log_dir.exists() {
        return Ok(QueryLogsResponse {
            entries: Vec::new(),
            total: 0,
        });
    }

    // 解析时间范围
    let start_time = request
        .start_time
        .as_ref()
        .and_then(|t| {
            NaiveDateTime::parse_from_str(t, "%Y-%m-%d %H:%M:%S")
                .ok()
                .map(|dt| DateTime::from_naive_utc_and_offset(dt, *Local::now().offset()))
        });

    let end_time = request
        .end_time
        .as_ref()
        .and_then(|t| {
            NaiveDateTime::parse_from_str(t, "%Y-%m-%d %H:%M:%S")
                .ok()
                .map(|dt| DateTime::from_naive_utc_and_offset(dt, *Local::now().offset()))
        });

    let mut all_entries = Vec::new();

    // 读取所有日志文件
    for entry in fs::read_dir(&log_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().map(|e| e == "log").unwrap_or(false) {
            if let Ok(entries) = read_log_file(&path) {
                all_entries.extend(entries);
            }
        }
    }

    // 过滤
    let filtered: Vec<LogEntry> = all_entries
        .into_iter()
        .filter(|e| matches_filter(e, &request.source, &request.level, &start_time, &end_time))
        .collect();

    let total = filtered.len();

    // 限制数量
    let limit = request.limit.unwrap_or(100);
    let entries: Vec<LogEntry> = filtered.into_iter().rev().take(limit).collect();

    Ok(QueryLogsResponse { entries, total })
}

/// 导出日志到指定文件
///
/// # Arguments
/// * `request` - 导出请求参数
///
/// # Returns
/// * `ExportLogsResponse` - 导出结果
#[command]
pub fn export_logs(request: ExportLogsRequest) -> Result<ExportLogsResponse, String> {
    let log_dir = get_log_dir();

    if !log_dir.exists() {
        return Ok(ExportLogsResponse {
            success: false,
            exported_count: 0,
            output_path: request.output_path,
            error: Some("Log directory does not exist".to_string()),
        });
    }

    // 解析时间范围
    let start_time = request
        .start_time
        .as_ref()
        .and_then(|t| {
            NaiveDateTime::parse_from_str(t, "%Y-%m-%d %H:%M:%S")
                .ok()
                .map(|dt| DateTime::from_naive_utc_and_offset(dt, *Local::now().offset()))
        });

    let end_time = request
        .end_time
        .as_ref()
        .and_then(|t| {
            NaiveDateTime::parse_from_str(t, "%Y-%m-%d %H:%M:%S")
                .ok()
                .map(|dt| DateTime::from_naive_utc_and_offset(dt, *Local::now().offset()))
        });

    let mut all_entries = Vec::new();

    // 读取所有日志文件
    for entry in fs::read_dir(&log_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.extension().map(|e| e == "log").unwrap_or(false) {
            if let Ok(entries) = read_log_file(&path) {
                all_entries.extend(entries);
            }
        }
    }

    // 过滤
    let filtered: Vec<LogEntry> = all_entries
        .into_iter()
        .filter(|e| matches_filter(e, &request.source, &request.level, &start_time, &end_time))
        .collect();

    let exported_count = filtered.len();

    // 写入导出文件
    let output_path = PathBuf::from(&request.output_path);

    // 确保父目录存在
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut file = File::create(&output_path).map_err(|e| e.to_string())?;

    // 写入文件头
    writeln!(file, "Global Chat Desktop - Log Export").map_err(|e| e.to_string())?;
    writeln!(file, "Generated: {}", Local::now().format("%Y-%m-%d %H:%M:%S"))
        .map_err(|e| e.to_string())?;
    writeln!(file, "Total entries: {}", exported_count).map_err(|e| e.to_string())?;
    writeln!(file, "{}", "-".repeat(80)).map_err(|e| e.to_string())?;

    // 写入日志条目
    for entry in filtered {
        writeln!(
            file,
            "[{}] [{}] [{}] {}",
            entry.timestamp, entry.level, entry.source, entry.message
        )
        .map_err(|e| e.to_string())?;
    }

    file.flush().map_err(|e| e.to_string())?;

    Ok(ExportLogsResponse {
        success: true,
        exported_count,
        output_path: request.output_path,
        error: None,
    })
}

/// 写入前端日志到工作区目录
///
/// # Arguments
/// * `source` - 日志来源（如 "main", "telegram", "whatsapp"）
/// * `level` - 日志级别（trace, debug, info, warn, error）
/// * `message` - 日志消息内容
///
/// # Returns
/// * `Result<(), String>` - 写入成功或错误信息
#[command]
pub fn write_log(source: String, level: String, message: String) -> Result<(), String> {
    use super::write_to_workspace;
    use super::LogLevel;

    let log_level = LogLevel::from(level.as_str());

    write_to_workspace(log_level, &source, &message)
        .map_err(|e| format!("Failed to write log: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_parse_log_line() {
        let line = "[2024-01-15 10:30:45.123] [INFO] [test_source] Test message";
        let entry = parse_log_line(line).unwrap();

        assert_eq!(entry.timestamp, "2024-01-15 10:30:45.123");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.source, "test_source");
        assert_eq!(entry.message, "Test message");
    }

    #[test]
    fn test_parse_log_line_empty() {
        assert!(parse_log_line("").is_none());
        assert!(parse_log_line("   ").is_none());
    }

    #[test]
    fn test_parse_log_line_invalid() {
        // 缺少时间戳
        assert!(parse_log_line("No timestamp here").is_none());
        // 格式不正确
        assert!(parse_log_line("[2024-01-15] message").is_none());
    }

    #[test]
    fn test_matches_filter_source() {
        let entry = LogEntry {
            timestamp: "2024-01-15 10:30:45.123".to_string(),
            level: "INFO".to_string(),
            source: "test_module".to_string(),
            message: "Test".to_string(),
        };

        assert!(matches_filter(&entry, &None, &None, &None, &None));
        assert!(matches_filter(&entry, &Some("test".to_string()), &None, &None, &None));
        assert!(matches_filter(&entry, &Some("TEST".to_string()), &None, &None, &None));
        assert!(!matches_filter(
            &entry,
            &Some("other".to_string()),
            &None,
            &None,
            &None
        ));
    }

    #[test]
    fn test_matches_filter_level() {
        let entry = LogEntry {
            timestamp: "2024-01-15 10:30:45.123".to_string(),
            level: "ERROR".to_string(),
            source: "test".to_string(),
            message: "Test".to_string(),
        };

        assert!(matches_filter(&entry, &None, &None, &None, &None));
        assert!(matches_filter(&entry, &None, &Some("ERROR".to_string()), &None, &None));
        assert!(matches_filter(&entry, &None, &Some("error".to_string()), &None, &None));
        assert!(!matches_filter(
            &entry,
            &None,
            &Some("INFO".to_string()),
            &None,
            &None
        ));
    }

    #[test]
    fn test_read_log_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(
            temp_file,
            "[2024-01-15 10:30:45.123] [INFO] [source1] Message 1"
        )
        .unwrap();
        writeln!(
            temp_file,
            "[2024-01-15 10:30:46.456] [ERROR] [source2] Message 2"
        )
        .unwrap();
        writeln!(temp_file, "Invalid line").unwrap();
        writeln!(temp_file, "").unwrap();

        let entries = read_log_file(temp_file.path()).unwrap();
        assert_eq!(entries.len(), 2);

        assert_eq!(entries[0].level, "INFO");
        assert_eq!(entries[0].source, "source1");
        assert_eq!(entries[1].level, "ERROR");
        assert_eq!(entries[1].source, "source2");
    }

    #[test]
    fn test_get_log_dir() {
        let dir = get_log_dir();
        // 应该包含 logs/current 或回退到临时目录
        assert!(
            dir.to_string_lossy().contains("logs")
                || dir.to_string_lossy().contains("global-chat-desktop")
        );
    }
}
