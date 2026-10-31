# 统一日志系统架构

本文档描述 Global Chats 的日志系统设计，用于全面分析应用运行状态。

## 设计目标

| 层面 | 目标 | 实现方式 |
|------|------|----------|
| 主应用 JS | 捕获 React 错误、全局异常 | ErrorBoundary + window.onerror |
| 第三方 WebView | 捕获 Telegram/WhatsApp 等平台报错 | Preload 注入日志桥接 |
| Rust 后端 | 捕获 panic 和错误日志 | Panic Hook + tracing |
| 业务日志 | 验证数据流和状态 | 结构化日志 API |

## 日志目录结构

```
logs/
├── current/                    # 当前会话日志
│   ├── main.log
│   ├── telegram.log
│   ├── whatsapp.log
│   ├── instagram.log
│   ├── [platform].log
│   └── rust.log
├── archive/                    # 归档日志（按日期）
│   └── YYYY-MM-DD/
└── panic/                      # Panic 日志（永不删除）
```

## 日志格式

```json
{
  "timestamp": "2026-02-04T14:30:22.123Z",
  "level": "ERROR",
  "source": "whatsapp",
  "category": "MessageSend",
  "message": "Failed to send message",
  "data": { "chatId": "123", "error": "Network timeout" },
  "stack": "Error: Network timeout\n    at ..."
}
```

## 核心实现

### Rust Panic Hook

```rust
std::panic::set_hook(Box::new(|info| {
    let backtrace = std::backtrace::Backtrace::capture();
    log::error!("PANIC: {}\nBacktrace: {}", info, backtrace);
    write_panic_log(info, backtrace);
}));
```

### Panic 恢复

```rust
let result = std::panic::catch_unwind(|| {
    // 可能 panic 的代码
});
```

### 日志双写

日志同时写入两个位置：
- Tauri 标准日志目录（用于应用内部）
- 项目工作区 `logs/current/`（用于 Claude Code 读取）

### 日志导出 API

```rust
#[tauri::command]
async fn export_logs(
    start_time: Option<String>,
    end_time: Option<String>,
    sources: Option<Vec<String>>,
) -> Result<String, String>
```

## Claude Code 访问方式

| 方式 | 命令 / 路径 |
|------|-------------|
| 直接读取 | `logs/current/*.log` |
| 命令查询 | `bun run logs:errors --since=1h` |
| Tauri 命令 | `invoke('query_logs', { filter })` |

## 状态

- ✅ 实现 Rust panic hook
- ✅ 实现日志双写到项目目录
- ✅ 实现 panic 恢复机制
- ✅ 实现日志导出 API
- ✅ 创建 CLI 日志查询命令

## 相关文档

- [设计文档](../plans/2026-02-04-unified-logging-system-design.md)
- [实现计划](../plans/2026-02-04-unified-logging-implementation.md)
