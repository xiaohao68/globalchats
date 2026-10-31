# 开发工具

本文档描述 Global Chats 的开发环境和工具使用。

## 快速启动

```bash
# 进入应用目录
cd apps/global-chat-desktop

# 一键启动开发环境（前端 + Tauri）
task dev:all

# 或分别启动
task dev       # 仅前端 (Port 1420)
task tauri     # 仅 Tauri
```

## 热重载

### InjectJS 热重载

修改 `src-preload/` 下的 InjectJS 代码后，无需重启应用：

| 平台 | 快捷键 |
|------|--------|
| macOS | `Cmd + Shift + R` |
| Windows | `Ctrl + Shift + R` |

此快捷键会：
1. 重新构建 InjectJS 包
2. 重载所有平台 WebView
3. 保持登录状态（使用 Browser Partition UUID 隔离）

### 前端热重载

React 组件修改会自动热重载（HMR），无需手动操作。

### Rust 代码

修改 `src-tauri/` 下的 Rust 代码需要重启 Tauri：

```bash
# 停止当前进程，然后重新启动
task tauri
```

## 调试

### 前端调试

1. 在 Tauri 窗口中右键 → "检查元素"
2. 使用标准 Chrome DevTools

### 平台 WebView 调试

1. 在目标平台 WebView 中右键 → "检查元素"
2. 可以查看 InjectJS 注入的对象：
   ```javascript
   window.gcEngine  // GC 引擎实例
   window.Store     // WhatsApp 内部 Store（仅 WhatsApp）
   ```

### Rust 调试

查看 Rust 后端日志：

```bash
# 查看实时日志
tail -f logs/current/rust.log

# 查询错误日志
bun run logs:errors --since=1h
```

## 登录状态保持

开发模式下，WebView 使用 UUID 作为 Browser Partition，确保：
- 重载 WebView 时保持登录状态
- 不同平台数据隔离

## 常见问题

### macOS 钥匙串弹窗

Dev 模式下 WebView 访问钥匙串会弹窗，需手动点击"始终允许"。

参考：[Tauri Issue #8662](https://github.com/tauri-apps/tauri/issues/8662)

### 端口占用

如果 1420 端口被占用：

```bash
# 查找占用进程
lsof -i :1420

# 终止进程
kill -9 <PID>
```

## 相关文档

- [命令速查](../reference/commands.md)
- [文件结构](./file-structure.md)
