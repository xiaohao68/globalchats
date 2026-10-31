# 统一日志系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现统一的日志系统，让 Claude Code 能够读取和分析主应用 JS、第三方 WebView、Rust 后端的所有报错和业务日志。

**Architecture:** 基于 Tauri 现有日志架构扩展，添加 panic hook、日志双写、导出 API 和 CLI 查询命令。

**Tech Stack:** Tauri 2.x, Rust, React, TypeScript, Bun, tauri-plugin-log

---

## Task 1: 创建日志目录结构

**Files:**
- Create: `apps/global-chat-desktop/logs/.gitkeep`
- Modify: `.gitignore` (添加 logs/ 目录规则)

**Step 1: 创建日志目录**

```bash
mkdir -p apps/global-chat-desktop/logs/current
mkdir -p apps/global-chat-desktop/logs/archive
mkdir -p apps/global-chat-desktop/logs/panic
touch apps/global-chat-desktop/logs/.gitkeep
```

**Step 2: 更新 .gitignore**

在 `.gitignore` 添加：
```gitignore
# Logs
logs/current/*.log
logs/archive/**/*.log
logs/panic/*.log
!logs/.gitkeep
```

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/logs/.gitkeep .gitignore
git commit -m "chore: create log directory structure"
```

---

## Task 2: 添加 Rust 依赖

**Files:**
- Modify: `apps/global-chat-desktop/src-tauri/Cargo.toml`

**Step 1: 添加依赖**

在 `[dependencies]` 部分添加：
```toml
chrono = { version = "0.4", features = ["serde"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
backtrace = "0.3"
```

**Step 2: Commit**

```bash
git add apps/global-chat-desktop/src-tauri/Cargo.toml
git commit -m "chore: add logging dependencies"
```

---

## Task 3: 实现 Rust 日志模块

**Files:**
- Create: `apps/global-chat-desktop/src-tauri/src/logging/mod.rs`
- Create: `apps/global-chat-desktop/src-tauri/src/logging/panic.rs`
- Create: `apps/global-chat-desktop/src-tauri/src/logging/export.rs`
- Modify: `apps/global-chat-desktop/src-tauri/src/lib.rs`

**Step 1: 创建 logging/mod.rs**

```rust
pub mod panic;
pub mod export;

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use chrono::Local;
use tauri::AppHandle;

/// 获取项目工作区的日志目录
pub fn get_workspace_log_dir() -> PathBuf {
    // 从项目根目录开始找
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    // 向上找到 apps/global-chat-desktop
    path.pop(); // src-tauri
    path.push("logs");
    path.push("current");
    path
}

/// 写入日志到工作区目录
pub fn write_to_workspace(source: &str, level: &str, message: &str) {
    let log_dir = get_workspace_log_dir();
    if !log_dir.exists() {
        let _ = std::fs::create_dir_all(&log_dir);
    }

    let file_name = format!("{}.log", source);
    let file_path = log_dir.join(file_name);

    let timestamp = Local::now().format("%Y-%m-%dT%H:%M:%S%.3fZ");
    let log_line = format!(
        r#"{{"timestamp":"{}","level":"{}","message":"{}"}}"#,
        timestamp, level, message
    );

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
    {
        let _ = writeln!(file, "{}", log_line);
    }
}

/// 初始化日志系统
pub fn init_logging(app: &AppHandle) {
    // 设置 panic hook
    panic::set_panic_hook();

    // 确保日志目录存在
    let log_dir = get_workspace_log_dir();
    if !log_dir.exists() {
        let _ = std::fs::create_dir_all(&log_dir);
    }
}
```

**Step 2: 创建 logging/panic.rs**

```rust
use std::panic;
use std::fs::OpenOptions;
use std::io::Write;
use chrono::Local;
use backtrace::Backtrace;

use super::get_workspace_log_dir;

/// 设置 panic hook，捕获 panic 并写入日志
pub fn set_panic_hook() {
    panic::set_hook(Box::new(|info| {
        let backtrace = Backtrace::new();

        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let location = info.location()
            .map(|loc| format!("{}:{}", loc.file(), loc.line()))
            .unwrap_or_else(|| "unknown location".to_string());

        let panic_msg = format!(
            "PANIC at {}: {}\nBacktrace:\n{:?}",
            location, payload, backtrace
        );

        // 写入 panic 专用日志
        write_panic_log(&panic_msg);

        // 也写入 rust.log
        write_rust_log("ERROR", &panic_msg);

        // 输出到 stderr
        eprintln!("{}", panic_msg);
    }));
}

fn write_panic_log(message: &str) {
    let mut log_dir = get_workspace_log_dir();
    log_dir.pop(); // current -> logs
    log_dir.push("panic");

    if !log_dir.exists() {
        let _ = std::fs::create_dir_all(&log_dir);
    }

    let timestamp = Local::now().format("%Y-%m-%d-%H%M%S");
    let file_name = format!("panic-{}.log", timestamp);
    let file_path = log_dir.join(file_name);

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .write(true)
        .open(&file_path)
    {
        let _ = file.write_all(message.as_bytes());
    }
}

fn write_rust_log(level: &str, message: &str) {
    let log_dir = get_workspace_log_dir();
    if !log_dir.exists() {
        let _ = std::fs::create_dir_all(&log_dir);
    }

    let file_path = log_dir.join("rust.log");
    let timestamp = Local::now().format("%Y-%m-%dT%H:%M:%S%.3fZ");

    let log_line = format!(
        r#"{{"timestamp":"{}","level":"{}","source":"rust","message":"{}"}}"#,
        timestamp, level, message.replace('"', "\\\"")
    );

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
    {
        let _ = writeln!(file, "{}", log_line);
    }
}
```

**Step 3: 创建 logging/export.rs**

```rust
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::command;
use chrono::{DateTime, Utc, Duration};

use super::get_workspace_log_dir;

#[derive(Debug, Serialize, Deserialize)]
pub struct LogQuery {
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub sources: Option<Vec<String>>,
    pub level: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
}

/// 查询日志
#[command]
pub async fn query_logs(filter: LogQuery) -> Result<Vec<LogEntry>, String> {
    let log_dir = get_workspace_log_dir();
    let mut entries = Vec::new();

    // 确定要查询的源
    let sources = match &filter.sources {
        Some(s) => s.clone(),
        None => vec![
            "main".to_string(),
            "telegram".to_string(),
            "whatsapp".to_string(),
            "instagram".to_string(),
            "rust".to_string(),
        ],
    };

    for source in sources {
        let file_path = log_dir.join(format!("{}.log", source));
        if !file_path.exists() {
            continue;
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read {}: {}", source, e))?;

        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }

            // 简单解析 JSON
            if let Ok(entry) = parse_log_line(line, &source) {
                // 应用过滤器
                if should_include(&entry, &filter) {
                    entries.push(entry);
                }
            }
        }
    }

    // 按时间排序
    entries.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

    Ok(entries)
}

/// 导出日志到文件
#[command]
pub async fn export_logs(
    filter: LogQuery,
    output_path: String,
) -> Result<String, String> {
    let entries = query_logs(filter).await?;

    let output = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    fs::write(&output_path, output)
        .map_err(|e| format!("Failed to write: {}", e))?;

    Ok(output_path)
}

fn parse_log_line(line: &str, source: &str) -> Result<LogEntry, serde_json::Error> {
    let value: serde_json::Value = serde_json::from_str(line)?;

    Ok(LogEntry {
        timestamp: value["timestamp"].as_str().unwrap_or("").to_string(),
        level: value["level"].as_str().unwrap_or("INFO").to_string(),
        source: value["source"].as_str().unwrap_or(source).to_string(),
        message: value["message"].as_str().unwrap_or(line).to_string(),
    })
}

fn should_include(entry: &LogEntry, filter: &LogQuery) -> bool {
    // 级别过滤
    if let Some(ref level) = filter.level {
        if entry.level.to_lowercase() != level.to_lowercase() {
            return false;
        }
    }

    // 时间范围过滤（简化实现）
    // 实际项目中应解析时间戳进行比较

    true
}
```

**Step 4: 修改 lib.rs 添加模块和初始化**

在 `mod gc_webview;` 前添加：
```rust
mod logging;
```

在 `.setup(|app| setup::setup(app))` 前添加：
```rust
.setup(|app| {
    logging::init_logging(app);
    Ok(())
})
```

在 `invoke_handler` 中添加新命令：
```rust
.invoke_handler(tauri::generate_handler![
    // ... 现有命令 ...
    logging::export::query_logs,
    logging::export::export_logs,
])
```

**Step 5: Commit**

```bash
git add apps/global-chat-desktop/src-tauri/src/logging/
git add apps/global-chat-desktop/src-tauri/src/lib.rs
git commit -m "feat(logging): implement Rust panic hook and log export API"
```

---

## Task 4: 实现前端日志桥接双写

**Files:**
- Modify: `packages/logger/src/logger.ts`
- Modify: `packages/logger/src/collector.ts`

**Step 1: 修改 logger.ts 添加文件写入**

在顶部添加：
```typescript
import { writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
```

修改 `formatEntry` 方法，添加 `toFileFormat`：
```typescript
private async writeToFile(level: LogLevel, formatted: string): Promise<void> {
  try {
    const logDir = await join("logs", "current");
    const fileName = `${this.source}.log`;
    const filePath = await join(logDir, fileName);

    // 追加写入
    await writeTextFile(filePath, formatted + "\n", {
      baseDir: BaseDirectory.AppLocalData,
      append: true,
    });
  } catch (e) {
    // 静默失败，不影响主流程
    console.error("Failed to write log to file:", e);
  }
}
```

修改 `error` 方法（示例）：
```typescript
async error(message: string, data?: Record<string, unknown>): Promise<void> {
  const formatted = this.formatEntry("error", message, data);
  await tauriError(formatted).catch(console.error);
  await this.writeToFile("error", formatted);
}
```

**Step 2: Commit**

```bash
git add packages/logger/src/logger.ts
git commit -m "feat(logging): add file writing to logger"
```

---

## Task 5: 创建 CLI 日志查询脚本

**Files:**
- Create: `apps/global-chat-desktop/scripts/log-query.ts`
- Modify: `apps/global-chat-desktop/package.json`

**Step 1: 创建 log-query.ts**

```typescript
#!/usr/bin/env bun
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const LOGS_DIR = join(__dirname, "..", "logs", "current");

interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  data?: Record<string, unknown>;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      options[key] = value;
      if (value !== "true") i++;
    }
  }

  return options;
}

function readLogFile(source: string): LogEntry[] {
  const filePath = join(LOGS_DIR, `${source}.log`);
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return {
          timestamp: new Date().toISOString(),
          level: "INFO",
          source,
          message: line,
        };
      }
    });
}

function listSources(): string[] {
  if (!existsSync(LOGS_DIR)) {
    return [];
  }

  return readdirSync(LOGS_DIR)
    .filter((f) => f.endsWith(".log"))
    .map((f) => f.replace(".log", ""));
}

function main() {
  const args = parseArgs();

  if (args.help || args.h) {
    console.log(`
Usage: bun run logs [options]

Options:
  --source <name>     Filter by source (main, telegram, whatsapp, rust, etc.)
  --level <level>     Filter by level (trace, debug, info, warn, error)
  --since <time>      Filter by time (1h, 1d, 30m)
  --tail <n>          Show last n entries (default: 50)
  --follow            Follow log output (like tail -f)
  --list              List available log sources

Examples:
  bun run logs --source rust --level error
  bun run logs --tail 100 --since 1h
  bun run logs --list
`);
    return;
  }

  if (args.list) {
    console.log("Available log sources:");
    listSources().forEach((s) => console.log(`  - ${s}`));
    return;
  }

  const sources = args.source ? [args.source] : listSources();
  const level = args.level?.toUpperCase();
  const tail = parseInt(args.tail || "50", 10);

  let allEntries: LogEntry[] = [];

  for (const source of sources) {
    const entries = readLogFile(source);
    allEntries.push(...entries);
  }

  // 过滤
  if (level) {
    allEntries = allEntries.filter((e) => e.level === level);
  }

  // 排序
  allEntries.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 取最后 n 条
  allEntries = allEntries.slice(-tail);

  // 输出
  for (const entry of allEntries) {
    const color =
      entry.level === "ERROR" ? "\x1b[31m" :
      entry.level === "WARN" ? "\x1b[33m" :
      entry.level === "INFO" ? "\x1b[32m" :
      "\x1b[36m";

    console.log(
      `${color}[${entry.level}]\x1b[0m ${entry.timestamp} ${entry.source}: ${entry.message}`
    );
  }
}

main();
```

**Step 2: 修改 package.json 添加脚本**

在 `scripts` 中添加：
```json
{
  "logs": "bun run scripts/log-query.ts",
  "logs:list": "bun run scripts/log-query.ts --list",
  "logs:errors": "bun run scripts/log-query.ts --level error",
  "logs:rust": "bun run scripts/log-query.ts --source rust"
}
```

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/scripts/log-query.ts
git add apps/global-chat-desktop/package.json
git commit -m "feat(logging): add CLI log query script"
```

---

## Task 6: 实现 Panic 恢复机制

**Files:**
- Create: `apps/global-chat-desktop/src-tauri/src/utils/recover.rs`
- Modify: `apps/global-chat-desktop/src-tauri/src/gc_webview/` 中的关键调用点

**Step 1: 创建 recover.rs**

```rust
use std::panic::catch_unwind;
use std::any::Any;
use log::error;

/// 执行可能 panic 的操作，捕获并记录 panic
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
pub fn webview_operation<F, R>(webview_id: &str, operation: &str, f: F) -> Option<R>
where
    F: FnOnce() -> R + std::panic::UnwindSafe,
{
    with_recovery(&format!("webview_{}_{}", webview_id, operation), f)
}
```

**Step 2: 在 gc_webview 中使用**

示例修改 `create_webview` 函数：
```rust
use crate::utils::recover::webview_operation;

#[command]
pub async fn create_webview(
    app: AppHandle,
    window: Window,
    label: String,
    url: String,
) -> Result<(), String> {
    webview_operation(&label, "create", || {
        // 原有创建逻辑
    }).ok_or_else(|| "WebView creation panicked".to_string())
}
```

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/src-tauri/src/utils/
git commit -m "feat(logging): add panic recovery utilities"
```

---

## Task 7: 验证日志系统

**Files:**
- Create: `apps/global-chat-desktop/scripts/test-logging.ts`

**Step 1: 创建测试脚本**

```typescript
#!/usr/bin/env bun
import { invoke } from "@tauri-apps/api/core";

async function testLogging() {
  console.log("=== Testing Logging System ===\n");

  // 1. 测试目录创建
  console.log("1. Checking log directories...");
  const dirs = ["logs/current", "logs/archive", "logs/panic"];
  for (const dir of dirs) {
    const exists = await Bun.file(dir).exists();
    console.log(`   ${dir}: ${exists ? "✓" : "✗"}`);
  }

  // 2. 测试日志写入
  console.log("\n2. Testing log writing...");
  try {
    // 通过 Tauri 命令测试
    await invoke("test_log_write", {
      source: "test",
      level: "INFO",
      message: "Test log entry",
    });
    console.log("   Log write: ✓");
  } catch (e) {
    console.log("   Log write: ✗", e);
  }

  // 3. 测试查询 API
  console.log("\n3. Testing query API...");
  try {
    const logs = await invoke("query_logs", {
      filter: { sources: ["test"] },
    });
    console.log("   Query API: ✓", logs);
  } catch (e) {
    console.log("   Query API: ✗", e);
  }

  // 4. 检查日志文件
  console.log("\n4. Checking log files...");
  const sources = ["main", "rust", "telegram", "whatsapp"];
  for (const source of sources) {
    const file = Bun.file(`logs/current/${source}.log`);
    const exists = await file.exists();
    console.log(`   ${source}.log: ${exists ? "✓" : "✗"}`);
  }

  console.log("\n=== Test Complete ===");
}

testLogging().catch(console.error);
```

**Step 2: 运行验证**

```bash
# 启动开发环境
cd apps/global-chat-desktop
task dev:all

# 在另一个终端运行测试
bun run scripts/test-logging.ts
```

**Step 3: Commit**

```bash
git add apps/global-chat-desktop/scripts/test-logging.ts
git commit -m "test(logging): add logging system verification script"
```

---

## 总结

实施完成后，Claude Code 可以通过以下方式访问日志：

1. **直接读取文件**: `logs/current/*.log`
2. **CLI 查询**: `bun run logs --source rust --level error`
3. **Tauri API**: `invoke('query_logs', { filter })`

所有 panic 会被捕获并保存到 `logs/panic/` 目录，永不删除。
