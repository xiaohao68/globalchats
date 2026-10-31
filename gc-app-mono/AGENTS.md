# Repository Guidelines

## 必须遵守

- **中文**：文档与协作沟通使用中文；确需英文时附中文摘要。
- **OpenMemory 标注**：涉及 OpenMemory 配置或数据同步时，必须标注“【OpenMemory：配置】/【OpenMemory：数据同步】”，并说明影响范围与回滚策略。
- **禁止自动 git**：未获明确指令时不得执行任何 `git` 命令；仅在你明确要求 `commit`/`push` 时才可执行对应操作。

## 项目结构

- `apps/global-chat-desktop/`：Tauri 桌面端（`src/` 渲染、`src-preload/` 注入脚本、`src-chat/` 聚合聊天、`src-tauri/` Rust 后端）。
- `packages/*/`：共享库（`@gc/*`），通过 `exports` 暴露 API（禁止跨 package 深层相对路径导入）。
- `specs/<feature-id>/`：SpecKit 产物（`spec.md`/`plan.md`/`tasks.md`）。
- `.specify/`：SpecKit 模板与项目宪法（`.specify/memory/constitution.md`）。

## 常用命令

- `bun install`：安装依赖（见根 `package.json` 的 `engines`/`packageManager`）。
- `bun run dev`：Turborepo 启动各 workspace 的 dev。
- `bun --cwd apps/global-chat-desktop run dev`：启动桌面端（renderer + preload + chat）。
- `bun run build` / `bun run check-types` / `bun run format`：全仓库构建 / 类型检查 / Prettier 格式化。
- 包内测试示例：`bun --cwd packages/misc run test`（以各包配置为准）。

## 代码与测试约定

- TypeScript 保持 `strict`；避免 `any`/`@ts-ignore`（若必须使用需写明理由并尽快移除）。
- 导入规则：应用内用 `@/*`（见 `apps/global-chat-desktop/tsconfig.json`），跨包用 `@gc/*`。
- 纯逻辑优先单测（`*.test.ts` 或 `__tests__/`）；UI 变更需提供 macOS 14+ 手动验证步骤与截图/录屏，记录到对应 `specs/<feature-id>/`。

## Commit / PR

- Commit 建议采用 Conventional Commits（例如 `docs(specify): 更新宪法与模板`）。
- PR 需说明动机/风险/验证方式，并链接对应 `specs/<feature-id>/spec.md`；UI 变更附截图/录屏。

## 配置与安全

- `.env*` 仅用于本地与 CI 注入，禁止提交密钥；相关变更同步更新 `CLAUDE.md`。
- Tauri 权限与配置集中在 `apps/global-chat-desktop/src-tauri/`，修改后至少在 macOS 做一次验证构建。

---

## 重构指南

### 新增平台的实现步骤

1. **创建平台目录**：`packages/gc-engine/src/apps/<platform>/`

2. **实现三个核心类**：
   ```
   <platform>/
   ├── <platform>.ts           # 继承 AbstractAppEngine
   ├── sdk/<Platform>SDK.ts    # 继承 AbstractAppSDK
   └── messagesControl/<Platform>MessagesControl.ts  # 继承 AbstractMessagesControl
   ```

3. **SDK 实现要点**：
   - `getCurrentUserInfo()`: 获取当前登录用户信息
   - `getCurrentChatUserInfo()`: 获取当前聊天对象信息
   - `currentUserId` / `currentChatUserId`: getter 属性
   - `isChatPage` / `isLoginPage`: 页面状态判断
   - `mount()`: 初始化登录检测循环

4. **MessagesControl 实现要点**：
   - 定义 CSS 选择器：`messageListContainerSelector`、`messageListSelector`、`receiveMessageTextSelector`
   - 定义输入框选择器：`inputMessageSelector`、`sendMessageBtnSelector`
   - 实现 `makeMessageText()`: 从 DOM 提取消息文本

5. **注册到 GCEngine**：
   ```typescript
   // packages/gc-engine/src/GCEngine.ts
   case EPlatform.NewPlatform:
     await newPlatform.mount();
     break;
   ```

6. **添加平台枚举**：`packages/model/src/data/EPlatform.ts`

### 修改翻译逻辑的注意事项

**影响范围**：
- `packages/gc-engine/src/apps/engine/scheduler/` - 调度器
- `packages/gc-engine/src/apps/engine/AbstractMessagesControl.ts` - 消息控制
- `packages/store/src/messageStore.ts` - 任务状态

**关键流程**：
1. DOM 变化 → `translateMessageList()` → 创建 Task → 推入队列
2. 调度器 `flushReceiveMessageQueue()` → 批量合并 → 调用 API
3. API 返回 → `attachCookedTextListToTaskList()` → 更新 messageStore
4. React 监听 messageStore → 渲染翻译结果

**注意**：
- 修改选择器时需测试所有平台
- 批量合并逻辑在 `scheduler.ts` 中，注意 `MaxTranslateTextLength` 限制
- 翻译配置优先级：聊天对象独立配置 > 全局配置

### Store 修改的影响范围

| Store | 修改影响 | 同步机制 |
|-------|---------|---------|
| globalStore | 所有 WebView 配置 | Tauri Store 持久化 |
| userStore | 当前用户配置 | syncPersistCache() → globalStore |
| appStore | 运行时状态 | 消息通道广播 |
| messageStore | 翻译任务 | 仅当前 WebView |

**修改 globalStore 字段**：
1. 更新 `packages/model/src/data/IGlobalStore.ts` 类型定义
2. 考虑版本迁移：`packages/store/src/helper/syncLocalCachedStore.ts`

**修改 appStore 字段**：
1. 更新 `packages/model/src/data/IAppState.ts` 类型定义
2. 如需持久化，在 `persistUpdateAppList()` 中处理

---

## 常见问题排查

### WebView 通信问题

**症状**：子 WebView 无法获取 store 数据

**排查步骤**：
1. 检查 `webviewChannel.mount()` 是否在 `initThirdApp()` 中正确调用
2. 检查消息类型是否在 `EChannelMessageEventType` 中定义
3. 检查 `receiverIds` 是否正确（`MainWebviewId` / `SideWebviewId` / `"*"`）
4. 在 DevTools 中监听 Tauri 事件：`window.__TAURI__.event.listen("WebviewChannel", console.log)`

**常见原因**：
- WebView 启动顺序问题：子 WebView 在主 Renderer 之前启动
- 消息类型拼写错误
- `shouldNotifyMe()` 过滤逻辑问题

### 翻译不生效

**症状**：消息列表不显示翻译结果

**排查步骤**：
1. 检查 CSS 选择器是否匹配当前平台 DOM 结构
2. 检查 `messageStore.receiveMessageTasks` 是否有任务
3. 检查翻译 API 是否返回正确结果
4. 检查 React 渲染容器 `attachContainer` 是否正确创建

**调试方法**：
```typescript
// 在 DevTools 中
console.log(messageStore.receiveMessageTasks);
console.log(document.querySelectorAll('[data-gc-message]'));
```

**常见原因**：
- 平台 DOM 结构更新，选择器失效
- 翻译配置未开启（`translateConfig.receiveMessage.enable`）
- API 限流或网络错误

### Store 同步问题

**症状**：配置修改后其他 WebView 未更新

**排查步骤**：
1. 检查 `syncPersistCache()` 是否被调用
2. 检查 `updateSettings` 消息是否发送
3. 检查子 WebView 是否监听 `updateSettings` 事件

**调试方法**：
```typescript
// 在主 Renderer DevTools 中
webviewChannel.emitter.on('*', (type, payload) => console.log(type, payload));
```

**常见原因**：
- 忘记调用 `syncPersistCache()`
- 消息 `receiverIds` 未包含目标 WebView
- 子 WebView 未注册事件监听

