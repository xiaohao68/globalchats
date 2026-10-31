# 疑难排查手册

本文档记录项目开发中遇到的典型问题、根因分析和解决方案。

---

## WhatsApp "database error occurred on your browser"

**日期**：2026-03-01

**现象**：
- WhatsApp 登录成功后无法发送消息
- 登录状态随后失效
- 页面显示 "a database error occurred on your browser. please relink your device"
- 日志中出现大量 `dropping db read operation due to logout`（170+ 次）

**根本原因**：
`WhatsappSDK.ts` 中静态属性引用类名大小写错误：
- 类定义：`class WhatsAppSDK`（大写 A）
- 引用处：`WhatsappSDK.MSG_MAX_BUFFER` / `WhatsappSDK.MSG_DEBOUNCE_MS`（小写 a）

TypeScript 编译未捕获此错误（macOS 文件系统大小写不敏感 + IIFE 打包时变量名可能重映射）。

**错误链**：
```
收到新消息 → 回调触发 ReferenceError: Can't find variable: WhatsappSDK
→ Unhandled Promise Rejection
→ 干扰 WhatsApp Web 内部 IndexedDB 操作
→ WhatsApp 检测数据库完整性失败
→ 强制登出 + "database error" 提示
```

**修复**：
```typescript
// 修复前（错误）
WhatsappSDK.MSG_MAX_BUFFER
WhatsappSDK.MSG_DEBOUNCE_MS

// 修复后（正确）
WhatsAppSDK.MSG_MAX_BUFFER
WhatsAppSDK.MSG_DEBOUNCE_MS
```

**排查技巧**：
1. 日志中大量 `dropping db read operation due to logout` 是**果**不是**因**，需要过滤掉才能看到真正的根因
2. 关键日志过滤命令：
   ```bash
   grep -v "dropping db read\|multiple-uim-roots" app.log | grep -i "error\|warn" | grep "preload"
   ```
3. 构建后验证 IIFE 中变量引用是否正确：
   ```bash
   grep -o 'WhatsappSDK\|WhatsAppSDK' dist/preload/index.js | sort | uniq -c
   ```

**经验总结**：
- WhatsApp Web 对运行时未捕获异常极度敏感，会将其视为数据库损坏并强制登出
- InjectJS（preload 脚本）中的任何 `Unhandled Rejection` 都可能导致 WhatsApp 会话失效
- 修改 preload 代码后，务必检查构建产物中的变量引用
