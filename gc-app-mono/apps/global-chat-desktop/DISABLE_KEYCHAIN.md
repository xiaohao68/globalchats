# 禁用 WhatsApp 钥匙串访问

## 问题描述

WhatsApp Web 在 macOS 上会尝试使用 Web Crypto API 将加密密钥存储到系统钥匙串（Keychain），导致以下错误：

```
Cannot store WebCrypto master key, error -25299
```

错误代码 -25299 表示钥匙串访问被拒绝或出现重复项。

## 解决方案

通过在 WebView 初始化时注入脚本，重写 Web Crypto API 的相关方法，禁止密钥导出到钥匙串。

### 实现方式

1. **创建禁用脚本**：`src-tauri/scripts/disable-keychain.js`
   - 重写 `crypto.subtle.generateKey`：强制 `extractable` 参数为 `false`
   - 重写 `crypto.subtle.importKey`：强制 `extractable` 参数为 `false`
   - 重写 `crypto.subtle.exportKey`：直接拒绝导出操作

2. **注入到 WebView**：在 `webview.rs` 中通过 `initialization_script` 注入

### 工作原理

- `extractable: false` 的密钥不能被导出，因此不会尝试存储到钥匙串
- 密钥仍然可以在内存中使用（加密/解密操作）
- 只是禁止了持久化存储到系统钥匙串

### 影响

**优点**：
- ✅ 不再出现钥匙串访问错误
- ✅ 不需要用户授权钥匙串访问
- ✅ 提高安全性（密钥不会持久化）

**缺点**：
- ⚠️ WhatsApp 的某些功能可能受影响（如果依赖密钥持久化）
- ⚠️ 每次重启应用可能需要重新生成密钥

### 验证

重新构建并运行应用后，应该不再看到以下错误：
```
Cannot store WebCrypto master key, error -25299
```

### 替代方案

如果这个方案导致 WhatsApp 功能异常，可以考虑：

1. **允许钥匙串访问**：在 macOS 系统偏好设置中授权应用访问钥匙串
2. **使用独立数据目录**：已经通过 `data_store_identifier` 实现
3. **完全禁用 Web Crypto API**：可能导致 WhatsApp 无法正常工作

### 调试

如果需要查看脚本是否生效，在浏览器控制台应该能看到：
```
[GC] Web Crypto API keychain access has been disabled
```

如果 WhatsApp 尝试导出密钥，会看到：
```
[GC] Blocked crypto.subtle.exportKey to prevent keychain access
```

## 相关文件

- `src-tauri/scripts/disable-keychain.js` - 禁用脚本
- `src-tauri/src/gc_webview/webview.rs` - WebView 创建代码
