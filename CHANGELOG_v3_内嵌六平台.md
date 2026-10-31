# Global Chats 本轮开发记录（六平台内嵌）

**日期**：2026-10-12  
**本轮目标（用户拍板）**：先把 6 个平台内嵌进新 UI；监听暂不做；原生 Tauri 子 WebView；先单账号跑通。

---

## 一、本轮修掉的 4 个「致命 Bug」

昨天那份清单上标了 ✅ 的功能，代码其实写好了，但**跑不起来**。原因是下面 4 处：

### Bug 1：后端启动时从来没连数据库（登录必然失败）

`src-tauri/src/setup.rs` 里只初始化了日志和侧边栏，**没有调用 `db::init_db()`**。  
→ 结果：所有 `db::*` / `auth::*` 命令一律返回 `Database not initialized`，登录页点「登录」永远报错。

**修复**：启动时（`setup.rs`）显式初始化 PostgreSQL 连接池；失败只写日志、不阻塞窗口打开，方便排查数据库没启动的情况。

### Bug 2：数据库密码是旧的

`src-tauri/src/db/mod.rs` 里连接串用的是交接文档里的旧密码。  
**修复**：改为本次提供的密码；同时支持用环境变量 `GC_DATABASE_URL` / `DATABASE_URL` 覆盖，换机器不用改代码；连接串写日志时自动打码（`postgres://postgres:***@...`）。

### Bug 3：内嵌网页会盖住整个界面（布局参数名写错）

`PlatformWebView.tsx` 传的是 `{ x, y, width, height }`，但 Rust 侧的 `WebviewLayoutOptions` **只认 `left / top / right / bottom / width / height`，没有 x / y**。  
→ 结果：x/y 被忽略、left/top 取默认值 0 → 网页从窗口左上角铺满全屏，把平台栏和客户列表全压住。

**修复**：改成从占位容器的 `getBoundingClientRect()` 实时换算出 `left/top/right/bottom`。  
用 `right/bottom` 而不是 `width/height`，这样窗口缩放时 Rust 侧 `auto_resize` 能自动重算尺寸，不用前端反复纠正。

### Bug 4：新 Dashboard 根本渲染不出来

`appMode` 默认值是 `AggregatedChat`，而 `Main.tsx` 在聚合模式下渲染的是**旧的** `AggregatedChat` 组件，并且不渲染 `<Outlet/>`。  
→ 结果：登录成功后进不到新的三栏界面，看到的永远是旧界面。

**修复**：`app-layout.tsx` 登录后直接渲染 `<Outlet/>`，新三栏 Dashboard 成为主界面。

---

## 二、其他一起修掉的问题

| #  | 文件                      | 问题                                                             | 处理                                                                                                                               |
| -- | ----------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 5  | `PlatformWebView.tsx`   | 6 个 WebView 没有生命周期管理，切平台时互相压叠                                  | 切换平台时隐藏其它平台（**隐藏不 close**，保留登录态、不用重新加载）；`WebviewChannel` 事件驱动「加载中/已连接」状态；窗口/容器 resize 时同步边界；新增「刷新 / 调试」按钮                        |
| 6  | `PlatformWebView.tsx`   | 6 个平台共用一套 cookie，登录会互相顶掉                                       | 每平台硬编码独立 UUID 作为 `dataStoreIdentifier`，Tauri 在 `app_local_data_dir/Partitions/<uuid>` 下给每个平台独立 cookie / localStorage / IndexedDB |
| 7  | `CustomerListPanel.tsx` | 重复声明 `interface Customer`（与 import 冲突）；**没有按平台过滤**，每个平台都显示全部客户 | 删除重复定义；按 `platform_account_id` 过滤；登录状态改由 `platform_account.login_status` 驱动（原来是写死的假绿灯「监听中」）                                      |
| 8  | `AggregatedView.tsx`    | 聚合页是写死的 mock 数据                                                | 接真实数据库（会话 + 客户 + 平台账号三表关联），按 今天/昨天/更早 分组，未读排前，点击可跳到对应平台并定位到该客户                                                                   |
| 9  | `Dashboard.tsx`         | 未读角标是写死的假数字                                                    | 按平台账号真实汇总 `unread_count`，聚合按钮显示总未读                                                                                               |
| 10 | `glass-theme.css`       | `.unread-badge` 类**不存在**（只有 `.online-dot`），未读角标没有样式            | 补上样式                                                                                                                             |
| 11 | Rust                    | 没有「移动/缩放已存在 WebView」的能力，DOM 布局变化后无法纠正                          | 新增 `GCWebview::set_bounds` + Tauri 命令 `set_webview_bounds`，已在 `lib.rs` 注册                                                        |

---

## 三、验证结果

| 验证项            | 结果                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `cargo check`  | ✅ 通过（3 个无害 warning：`update_webview` / `Webview::update` 未使用、`WebviewOptions.active` 未读取）              |
| `tsc --noEmit` | ✅ 本轮改动的 6 个文件 **0 错误**；仓库里另有 127 个历史遗留类型错误（fingerprint 系列页面、CustomerPortrait 等旧页面），与本次无关，也不影响 vite 运行 |
| 数据库连接          | ✅ `[db] 连接成功: postgres://postgres:***@localhost:5432/globalchats`                                     |
| 表数据            | ✅ 10 张表；3 用户 / 6 平台账号 / 10 会话 / 12 消息 / 9 客户                                                          |
| Rust 侧 SQL     | ✅ 用真实 psql 逐条跑通 `platform_account` / `conversation` / `customer` 三条查询，字段全部匹配                          |
| 桌面应用启动         | ✅ `bun run tauri dev` 已拉起，单实例运行，日志无报错，主题已切浅色                                                          |

---

## 四、启动方式（两终端）

```bash
# 终端 1：前端（必须先起，tauri.conf.json 没有 beforeDevCommand）
cd gc-app-mono/apps/global-chat-desktop
bun run dev:renderer            # → http://localhost:1420

# 终端 2：桌面应用
cd gc-app-mono/apps/global-chat-desktop
bun run tauri dev
```

> 注意：不要再跑 `bun run dev`——它里面的 `run-p dev:preload dev:renderer` 与 bun 不兼容会报错。  
> `dist/preload/index.js` 已存在，非必要不用重建 preload。

数据库换密码/换机器时，不用改代码：

```bash
export GC_DATABASE_URL="postgres://postgres:密码@localhost:5432/globalchats"
```

---

## 五、登录后应该看到什么（请按这个清单核对）

1. **登录页** → 账号已预填 `zhangsan` / `123456`，直接点「登 录」
2. **左侧平台栏**（72px）→ 6 个真实品牌 SVG Logo + 红色未读角标
   - Telegram 应显示 **6**，Facebook 显示 **1**，聚合按钮显示 **7**（来自数据库真实 unread_count）
3. **中间客户列表**（320px）→ 点 Telegram 应看到 4 个客户：
   - Trade Partner A（未读 3）/ John Davis（未读 2）/ Ahmed Benali（未读 1）/ Sarah Miller
   - 点 Facebook 应看到 2 个：Emma Wilson（未读 1）/ 美国贸易群
   - 点 LinkedIn 应显示「暂无客户消息」（该账号在库里是 `logged_out` 且没有会话）——头部状态会显示「未登录」
4. **右侧主区** → 点 Telegram，应在标题栏下方内嵌出 `web.telegram.org`（不会盖住左侧界面）
5. **聚合按钮**（左下角绿色）→ 汇总 Telegram + Facebook 共 7 条，按「今天 / 昨天 / 更早」分组，未读排最前，每条带平台图标；点一条会跳到对应平台

### 需要你回来看一眼的点

- 6 个平台的网页**能否正常加载出来**（尤其 TikTok / LinkedIn / Teams 对嵌入式浏览器比较挑，可能需要单独调 User-Agent）
- 内嵌网页的**位置和大小**对不对（右边和下边不应有缝隙，也不应盖住平台栏和客户列表）
- 切换平台时，**上一个平台的网页应该消失**，切回来时不用重新加载

---

## 六、下一轮待办（按优先级）

1. **平台内嵌收尾**：如果某平台拒绝在嵌入环境加载，补 User-Agent / 处理登录跳转
2. **多账号多开**：同一平台多个 WebView + 独立 `dataStoreIdentifier` + 绑定代理 IP / 指纹
3. **Telegram 轻量监听**：注入脚本抓 `web.telegram.org` 新消息 → 写 `message` 表（幂等键 `external_message_id`）→ 聚合页实时刷新
4. **发送队列消费者**：`message_outbox` 状态机 `pending → sending → sent/failed` + 失败重试
5. **登录安全**：`login_cmd` 目前还是明文比对 `123456`，要切到 bcrypt `verify_password`
6. **界面统一**：顶部标题栏仍是深色 `#2C2C2A`，与新浅色主题不一致

---

## 七、v3.1 补丁：登录卡在「登录中…」+ 后端 panic（2026-10-12）

### 现象

点「登 录」后按钮一直停在「登录中…」，终端反复报：

```
thread 'tokio-runtime-worker' panicked at src\db\mod.rs:111:19:
called `Result::unwrap()` on an `Err` value: ColumnDecode { index: "\"created_at\"",
source: "mismatched types; Rust type `DateTime<Utc>` (as SQL type `TIMESTAMPTZ`)
is not compatible with SQL type `TIMESTAMP`" }
```

### 根因（两个问题叠加）

1. **时间类型对不上**：`schema_v2.sql` 里所有时间字段都是 `TIMESTAMP`（**不带时区**），  
   而 Rust 结构体把 `created_at` 等声明成了 `chrono::DateTime<Utc>`（对应 `TIMESTAMPTZ`）。  
   PostgreSQL 里这叫 `timestamp without time zone`，sqlx 解码时直接判定类型不兼容。
2. **用了 `row.get()` 而不是 `try_get()`**：`Row::get` 解码失败会 **panic**，  
   把整个 tokio 工作线程打挂；Tauri 的 async 命令随之中断，`invoke` 的 Promise  
   **永远不会 resolve/reject** → 前端就永远卡在「登录中…」，连报错都看不到。

### 修复

| 文件                                | 改动                                                                                                                                                                                             |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/src/db/mod.rs`         | 7 个时间字段 `DateTime<Utc>` → `NaiveDateTime`（`User.created_at`、`Conversation.last_message_at`、`Message.sent_at/received_at`、`MessageOutbox.scheduled_at/sent_at`、`MonitoringConfig.last_sync_at`） |
| `src-tauri/src/db/mod.rs`         | **所有** `r.get("col")` 全部换成 `r.try_get("col")?`，并让映射闭包返回 `Result`、整体 `collect::<Result<Vec<_>>>()`。以后任何字段类型不匹配都只会返回错误信息给前端，不会再 panic 挂线程                                                        |
| `src/pages/sign-in/LoginForm.tsx` | 加 15 秒超时保护：后端若 panic/无响应，按钮会恢复并提示「后端无响应（15 秒超时），请查看终端日志」，不再永久卡死                                                                                                                                |

### 为什么选改 Rust 而不是改数据库

`schema_v2.sql` 与 `src-tauri/migrations/001_init_schema.sql` 都明确规定用 `TIMESTAMP`，  
DBeaver 里已经建好的表结构是正确的。改 Rust 侧类型与设计文档保持一致，  
不动数据库、不需要迁移脚本，对其他 Agent 也无影响。

### 另一个坑（启动/重启时必须注意）

热重载时 cargo 会重新链接 `global_chat_desktop.exe`。**如果旧的应用进程还在跑，  
exe 文件被占用，链接会失败**：

```
error: linking with `link.exe` failed: exit code: 1104
LINK : fatal error LNK1104: cannot open file '...\target\debug\deps\global_chat_desktop.exe'
```

此时 `tauri dev` 里跑的**仍是旧二进制**（所以「改了代码但行为没变」）。  
正确处理顺序：

```bash
taskkill //IM global-chat-desktop.exe //F     # 先杀旧进程
# 再重新 bun run tauri dev
```

### 验证

- `cargo check` ✅ 0 error（4 个历史 warning）
- `tsc --noEmit` ✅ 改动文件 0 error
- 用代码里的连接串实测登录 SQL ✅ 返回 `2|zhangsan|张三|member|t|2026-10-10 17:32:33.903115`
- 全项目扫描 `.get("...")` ✅ 已无残留
- 应用重启后日志 ✅ `[db] 连接成功` + `set_theme: light`，**无 panic**

---

## 八、v3.1.1 附带修复：`appId not found` 刷屏

### 现象

登录进主界面后点平台，日志被这条错误刷屏（一次点按出现十几条）：

```
Unhandled rejection: Error: appId not found
  at Proxy.getAppById (packages/store/src/appStore.ts:218)
  at packages/webview/src/ioc/webviewManger.ts
  at webviewChannel.ts (mitt.emit)
```

### 链路

1. Rust `gc_webview/webview.rs` 在每个子 WebView 的 `on_page_load` / `on_navigation` 里，  
   都会向主窗口 `emit("WebviewChannel", { senderId: <子webview id>, receiverIds: ["main"], type: "loadingProgress" })`
2. 主窗口收到后由 `webviewChannel` 转投到内部 mitt 事件总线
3. **旧版** `WebviewManger` 的 `loadingProgress` 处理器**无条件**执行 `appStore.getAppById(appId)!`；  
   而 `getAppById` 在 `appStore.appList` 里找不到时会 **throw**（不是返回 undefined）

### 根因

新版三栏 Dashboard 自建的平台 WebView（`platform-telegram` / `platform-facebook` …）  
**没有注册进 `appStore.appList`**（旧流程是先 `appStore.createApp()` 再建 WebView）。  
于是每次网页开始加载 / 跳转，都会触发一次异常 → 大量 unhandled rejection。

### 修复

`packages/webview/src/ioc/webviewManger.ts`：`loadingProgress` 处理器改为  
先取 `appStore.appList[appId]`，`isEmpty(app)` 则**直接 return**，  
只处理 appStore 里真实存在的 app；其余（新版自建 WebView）的加载状态由  
`PlatformWebView` 自己监听 `WebviewChannel` 事件处理，互不干扰。

> 意义：这次之后，旧版 WebView 管理器不会再与新三栏界面「抢管理权」，  
> 后续做多账号多开时也不会被这层旧逻辑绊住。

### 验证

- 修改前：10:39:31–10:39:39 共 38 条 `appId not found`
- 修改后：日志**不再出现该错误**（HMR 已生效），应用进程存活

---

## 九、v3.2：LinkedIn 登不上去的原因与修复

### 用户实测结果

- Telegram 登录特殊，TikTok / Messenger / Facebook / Teams **正常登录**
- LinkedIn 登不上去，四种方式全失败：
  1. 「通过 Google 继续操作」「用 Apple 帐号登录」→ **点击完全没有反应**
  2. 「邮箱/密码」→ 报「出了点问题。请使用用户名和密码重试」
  3. 「立即加入」（注册）→ 弹安全验证，报「**缺少 noCAPTCHA 用户回复码或该码无效**」
  4. 「使用 Microsoft 帐号登录」→ 报「此 Microsoft 帐号尚未关联至领英帐号」（**这条是 LinkedIn 真实回应**）

### 根因（一句话）

**Tauri 子 WebView 默认把 `window.open`（弹窗）全部静默拒绝**，而 LinkedIn 的 Google 登录、  
Apple 登录、以及 Google reCAPTCHA 人机验证**都依赖弹窗**，所以「点了没反应」；  
弹窗出不来 → reCAPTCHA 拿不到 token → LinkedIn 判定登录请求无效 → 报「凭据错误」/  
「缺少 noCAPTCHA 用户回复码」。

### 证据链（为什么这个结论站得住）

| 现象                         | 解释                                                     |
| -------------------------- | ------------------------------------------------------ |
| **Microsoft 登录给出了真实回应**    | 微软 OAuth 走的是**整页 302 跳转**，不依赖弹窗 → 能完整走完，所以只有它返回了真实结果   |
| Google / Apple 点了没反应       | 两者走的都是**弹窗式 OAuth**（`window.open`），被直接拒绝 → 完全无反应       |
| 注册页明确报「缺少 noCAPTCHA 用户回复码」 | reCAPTCHA 的挑战框/令牌流程同样依赖弹窗与跨域 iframe，弹窗被拒后**拿不到 token** |
| 邮箱密码报「凭据错误」                | LinkedIn 在检测到环境可疑时会要求 reCAPTCHA；token 缺失 → 服务端判登录失败    |
| 其他 5 个平台正常                 | 它们的登录都是自己的整页表单/跳转，不需要 Google 弹窗                        |

**源码级证据**（`tauri-runtime-wry` / `wry`）：

```rust
// tauri-runtime-wry：没有注册 on_new_window 时，默认行为就是 Deny
.unwrap_or(wry::NewWindowResponse::Deny)

// wry/src/webview2/mod.rs：Deny 等价于把新窗口请求直接标记为已处理（= 丢弃）
} else {
  args.SetHandled(true)?;   // 没设 handler 时走这里：所有 window.open 被吞掉
}
```

而 `gc_webview/webview.rs` 里**从来没有注册 `on_new_window`**，所以 6 个平台的内嵌网页  
从第一天起就处于「弹窗全禁」状态。

### 修复

`src-tauri/src/gc_webview/webview.rs` 新增：

```rust
let new_window_webview_id = options.id.clone();
builder = builder.on_new_window(move |url, _features| {
  let _ = crate::logging::write_to_workspace(
    crate::logging::LogLevel::Info,
    "webview",
    &format!("[{}] 打开新窗口: {}", new_window_webview_id, url),
  );
  NewWindowResponse::Allow   // 交还 WebView2 默认实现：弹窗继承同 profile/代理/UA/Cookie
});
```

`Allow` 会让 WebView2 自己弹出窗口，并且**继承同一个 WebView2 环境**——  
同一 `data_directory`（同一套 Cookie/登录态）、同一代理、同一 User-Agent，  
这正是 OAuth 回跳（`postMessage` 给 opener）和 reCAPTCHA 所需要的。  
同时每次弹窗都会写一行日志，方便下一轮确认「点击到底有没有触发弹窗」。

### 本轮附带完成：把数据库里的「代理 / UA」真正下发到 WebView

后端 `WebviewOptions` 其实**早就支持 `userAgent` 和 `proxyUrl`**，但前端从来没传过 —— 也就是说  
「一人多号 + 每号独立代理 IP」这个核心能力一直没接通。本轮接通：

| 层                 | 改动                                                       |
| ----------------- | -------------------------------------------------------- |
| Rust `db/mod.rs`  | `ProxyConfig` 补上 `username` / `password` 字段（拼带认证的代理地址要用） |
| `services/api.ts` | `ProxyConfig` 同步补 `username` / `password`                |


| `pages/home/Dashboard.tsx` | 同时加载 `platform_account` + `proxy_config`，按 `proxy_id` 关联，算出每个平台的 `proxyUrl` / `userAgent` 下发给 `PlatformWebView` |  
| `components/PlatformWebView.tsx` | 新增 `proxyUrl` / `userAgent` / `platformAccountId` 三个属性，写进 `open_webview` 的 options |

代理地址拼装规则：`http://用户名:密码@主机:端口`，`proxy_type = socks5` 时用 `socks5://`。

> **为什么没有顺手给 LinkedIn 伪造一个 Chrome User-Agent？**  
> 现代风控不只看 UA 字符串，还看 `Sec-CH-UA` 这组 **Client Hints**。WebView2 的 Client Hints  
> 是跟着 Edge 内核自动生成的——只改 UA 字符串、不改 Client Hints，会造出  
> 「自称 Chrome、但 Client Hints 是 Edge」的**自相矛盾指纹**，比不伪装更容易被判定为异常。  
> 所以 LinkedIn 保持 WebView2 的原生 UA（库里它的 `user_agent` 本来就是空）。  
> 真要换身份，应该走「换代理 IP + 完整指纹」，这也是后续 E4 的正式做法。

### 复现与验证方法

1. 登录 → 点 LinkedIn → 点「通过 Google 继续操作」
2. 若修复生效：应弹出新的登录窗口（或页面跳转到 Google）；日志里出现  
   `[platform-linkedin] 打开新窗口: https://accounts.google.com/...`
3. 若日志里**没有**这行，说明点击没有触发 `window.open`，要换方向查（见下方「下一轮」）

### 如果 LinkedIn 仍然登不上，下一步排查顺序

1. **给它绑定代理**：库里 `platform_account` id=4（linkedin）的 `proxy_id` 是空的，  
   而同库的 Telegram / Facebook 都绑了 `proxy_id=1`（`http://127.0.0.1:7897`）。  
   本轮已把「代理下发」打通，只需把 id=4 的 `proxy_id` 设为 1 即可让它和能登录的平台一致。
2. **reCAPTCHA 仍失败**：说明是 Google 人机验证在嵌入式环境被拦（第三 Cookie / 指纹判定），  
   这属于平台风控层面，常规做法是「先在普通浏览器登录一次 → 导出 Cookie 注入 WebView」。
3. **Apple 登录**：Windows 上还依赖 `appleid.apple.com` 的弹窗与 `window.opener` 通信，  
   修好弹窗后仍需实测。

---

## 十、v3.5：打开平台出现 ERR_PROXY_CONNECTION_FAILED —— 是数据库里的「假代理」干的

### 现象

点开某个平台，内嵌区域里不是平台网页，而是一张 Edge 自带的错误页：

```
你尚未连接
代理服务器可能有问题，或地址不正确。
ERR_PROXY_CONNECTION_FAILED
```

用户第一反应是「我的网络/代理坏了」，但同一时刻普通浏览器访问外网是正常的。

### 根因（一句话）

**数据库 `proxy_config` 里有一条根本不存在的代理地址，而它恰好被 Telegram 平台用上了。**

### 证据链

1. **看库**（`globalchats`）：

   | id | user | proxy_type | host                 | port | remark         |
   | -- | ---- | ---------- | -------------------- | ---- | -------------- |
   | 1  | 2    | http       | 127.0.0.1            | 7897 | 本地 Clash Verge |
   | 2  | 2    | socks5     | **us-proxy.example.com** | 1080 | 美国号专用（**占位假数据**） |
   | 3  | 3    | http       | 127.0.0.1            | 7897 | 本地 Clash Verge |

   `example.com` 是 RFC 2606 保留给文档用的域名，**永远不可能解析**。

2. **账号绑定**：`platform_account` 里「张三业务号」（telegram）的 `proxy_id = 2`。

3. **谁决定了平台用哪个代理**：`Dashboard` 的规则是「**同平台按 `ORDER BY platform, account_name` 取第一个账号**」。
   `'张三业务号' < '张三主号'`（`业` U+4E1A < `主` U+4E3B），
   所以被选中的是**业务号**那条，而不是绑着本地 Clash 的**主号**。

4. **实测复现**：`nslookup us-proxy.example.com` → 无记录；Rust 侧报
   `os error 11001`（WSAHOST_NOT_FOUND，主机不存在）。

   对比测试（同一时刻、同一台机器）：

   | 走法                          | 结果              |
   | ----------------------------- | ----------------- |
   | `http://127.0.0.1:7897`       | HTTP 200，1.8s    |
   | `socks5://127.0.0.1:7897`     | HTTP 200，2.1s    |
   | `socks5://us-proxy.example.com:1080` | **DNS 直接失败** |

   另外 `netstat` 显示 7897 端口有 100+ 条 ESTABLISHED，**本地 Clash 一直是活的**。
   所以问题不在网络、不在 Clash，就在这条假数据。

5. **为什么错误页会「焊死」**：WebView2 的代理只能在**创建窗口时**确定。
   代理不可达时，网页里渲染的是 Edge 自带的错误页，此时窗口已经建好，
   运行时改代理不生效 —— 用户只能盯着一个死页面，也拿不到任何提示。

### 修复（治本，不依赖「把数据改对」）

只把数据库改对是不够的 —— 用户随时可能在代理面板里填错一个地址，就又白屏一次。
所以改成**建窗口之前先探一次代理**：

| 位置 | 改动 |
| ---- | ---- |
| `src-tauri/src/gc_webview/webview.rs` | 新增 `probe_proxy()`：解析 `host:port` → DNS → `TcpStream::connect_timeout`，上限 1.5s |
| 同上，proxy 分支 | 探通才 `builder.proxy_url(...)`；探不通**丢弃代理、退回直连**，写 WARN 日志，并 emit `ProxyUnavailable` 事件 |
| 同上 | 新增 `ProxyUnavailablePayload { webviewId, proxyUrl, reason }` |
| `src/components/PlatformWebView.tsx` | 监听 `ProxyUnavailable`，平台头部下方出现一条黄条：`xxx 连不上（原因），已自动改为直连`，可关闭；头部同时挂一个「直连（代理不可用）」徽标 |

> 为什么用同步探测而不是异步：`GCWebview::create` 本身是同步函数，
> 改成 async 会牵动 `open_webview` / `reload_webview` 两条调用链。
> 实际耗时可控 —— 本地代理被拒是毫秒级返回，DNS 失败也是几十毫秒，
> 只有「地址能解析但没人应答」才会等满 1.5s。

### 实测验证（日志原文）

```
[09:13:19] open_webview id:platform-telegram
[09:13:20] [platform-telegram] 代理不可用，已自动改为直连: 代理域名无法解析 us-proxy.example.com: 不知道这样的主机。 (os error 11001)
[09:13:25] page_load_payload event: Started
[09:13:26] page_load_payload event: Finished      ← 网页正常加载出来了
```

### 关于数据库里那条假代理

本轮**没有**擅自去改库，因为修好预检后它已经不会再造成白屏。
若想让 Telegram 也走代理，可选：

```sql
-- 方案 A：删掉占位代理（推荐，让 Telegram 直连）
DELETE FROM proxy_config WHERE host = 'us-proxy.example.com';

-- 方案 B：让 Telegram 也走本地 Clash（与主号保持一致）
UPDATE platform_account SET proxy_id = 1 WHERE platform = 'telegram' AND user_id = 2;

-- 方案 C：只停用，不删（保留记录，界面里仍能看到）
UPDATE proxy_config SET is_active = FALSE WHERE host = 'us-proxy.example.com';
```

### 顺带发现（与本次问题无关，记录备查）

日志里每约 1 分钟出现一次
`tauri_plugin_updater::updater [ERROR] update endpoint did not respond with a successful status code`
—— 是应用在检查更新时打不通更新服务器，**不影响任何功能**，等有正式发布地址后再配。

---

## 十一、v3.6：客户消息监听 —— 打通「平台网页 → 数据库 → 聚合消息栏」

### 先回答「哪个平台最容易做监听」

不看感觉，先把六个平台的**实际登录状态**从磁盘上查出来
（读各自 WebView 分区里的 Cookies，只看关键 cookie 是否存在，不解密）：

| 平台      | Cookie 条数 | 登录态关键 Cookie                    | 结论          |
| --------- | ----------- | ------------------------------------ | ------------- |
| LinkedIn  | 90          | `li_at` `li_rm` ✅                    | 已登录        |
| TikTok    | 29          | `sessionid` `sid_tt` ✅               | 已登录        |
| Messenger | 14          | `c_user` `xs` ✅                      | 已登录        |
| Facebook  | 10          | `c_user` `xs` ✅                      | 已登录        |
| Telegram  | **0**       | —                                    | **从未登进去** |
| Teams     | 49          | 只有 `login.microsoftonline.com`     | 卡在登录页    |

再按「DOM 稳定性」排序，**LinkedIn 最适合先做**：

1. **它的 class 名是语义化 BEM**（`msg-conversations-container__convo-item`），
   不像 Facebook / Messenger 那样是编译期生成的哈希（`x9f619 x1ja2u2z x78zum5 ...`，
   每次改版都变）—— 后者写出来的选择器基本活不过一个月；
2. **会话 id 直接躺在路由里**（`/messaging/thread/<id>/`），不用去 DOM 里挖；
3. 消息列表是独立滚动容器，观察范围可控。
4. 已在库里登录成功，不用先解决登录问题。

次选 TikTok（有官方 `data-e2e` 测试钩子），最后才是 Meta 系。

> 顺带发现：`teams/sdk/index.ts` 的 `getChatUserInfo` / `isGroup` 用的是
> `.msg-entity-lockup__entity-title-wrapper`、`.msg-conversations-container__convo-item-link--active`
> —— 这是**从 LinkedIn SDK 原样复制过来的**，Teams 页面上根本不存在这些 class，
> 所以 Teams 的会话识别一直是死的。等做 Teams 时要重写。

### 整条链路

```
平台 WebView（注入脚本 gc-engine）
  LinkedInMessageWatcher 观察会话列表（MutationObserver, 节流 800ms）
    → 发现某会话的「预览+时间+未读」指纹变化，且不是自己发的
    → webviewChannel(incomingMessage) 抛出
        ↓
宿主 main webview（Dashboard.tsx）
  · 补全业务员 id + 平台账号 id（注入脚本拿不到数据库侧信息）
  · invoke record_incoming_message_cmd
        ↓
Rust（db/mod.rs）
  1. upsert customer      ON CONFLICT (user_id, external_id)
  2. upsert conversation  ON CONFLICT (platform_account_id, customer_id, external_conversation_id)
  3. insert message       ON CONFLICT (conversation_id, external_message_id) DO NOTHING
       ↑ 返回 None = 重复消息，立刻收工，未读不再累加（幂等）
  4. 更新 last_message_preview / last_message_at / unread_count+1
        ↓
PostgreSQL → 聚合消息栏重新拉取（refreshKey +1）
```

### 各层改动

| 层 | 文件 | 改动 |
| -- | ---- | ---- |
| 通道 | `packages/channel/src/webviewChannel.ts` | 新增事件 `incomingMessage` + 载荷类型 `IIncomingMessage` |
| 抓取 | `packages/gc-engine/src/apps/linkedin/messageWatcher.ts`（新） | 会话列表监听器，多级降级选择器 + 首次基线 + 幂等指纹 |
| 引擎 | `packages/gc-engine/src/apps/linkedin/linkedin.ts` | 挂载监听器，把结果抛给宿主 |
| 引擎 | `packages/gc-engine/src/GCEngine.ts` | **修 label → 应用配置的映射**（见下方坑 ②） |
| 前端 | `src/components/PlatformWebView.tsx` | **补传 `platform`**（见下方坑 ①） |
| 前端 | `src/pages/home/Dashboard.tsx` | 监听事件 → 补全账号 → 落库 → 触发聚合栏刷新 |
| 前端 | `src/modules/aggregated-chat/AggregatedView.tsx` | 支持外部刷新（`refreshKey`），点开条目清未读（静默刷新，不闪 loading） |
| 前端 | `src/services/api.ts` | `recordIncomingMessage` / `markConversationRead` |
| Rust | `src-tauri/src/db/mod.rs` | `record_incoming_message`（三表 upsert + 幂等）、`mark_conversation_read` |
| Rust | `src-tauri/src/db/commands.rs`、`lib.rs` | 两个新命令并注册 |

### 埋的三个坑（都是「不查就查不出来」的那种）

**① preload 从来就没被注入过。**
`webview.rs` 里注入 preload 的条件是 `if let Some(_platform) = options.platform`，
而 `PlatformWebView.tsx` 里当初写着「暂不传 platform，避免注入监听脚本」。
也就是说：六个平台网页里从来没有跑过一格 gcEngine，
之前所有 SDK 都等于摆设。这次补上 `platform` 才真正注入。

**② 引擎会「静默不启动」。**
`GCEngine.mount()` 用 `appStore.appList[getCurrentWebviewId()]` 取应用配置。
但 `getCurrentWebviewId()` 返回的是 **webview label**（`platform-linkedin`），
而 `appStore.appList` 的 key 是 **EPlatform 的值**（`Linkedin`）—— 大小写、连字符全对不上。
取不到 → `isEmpty(app)` → **直接 return**，不报错、不提示，
表现为「preload 明明注入了，监听却一点动静都没有」。
现在加了 `#resolveApp()`：先精确匹配，再按「去掉 `platform-` 前缀 + 忽略大小写与分隔符」兜底，
并且取不到时打一条 warn，不再无声无息。

**③ 首次扫描必须只建基线。**
用户一打开 LinkedIn，列表里已经有几十条会话。
如果第一次扫描就把它们当「新消息」上报，数据库会被历史消息瞬间灌满。
所以 `#hasBaseline` 之前只登记指纹、绝不上报。
配套的保守取舍：**只对基线里已存在的会话做变化比对**，
列表滚动时新加载进来的老会话不会被误判成新消息（宁可漏，不可滥）。

### 幂等是怎么保证的

同一条消息会被观察器反复抓到（列表重渲染、翻页、组件重挂载）。
落库时**先插 message**，靠 `UNIQUE(conversation_id, external_message_id)` 兜住：
`fetch_optional` 返回 `None` 就说明这条之前存过 → 立刻返回 `isNew: false`，
**不再更新会话的未读**。前端也据此跳过刷新。

LinkedIn 列表里拿不到真实消息 id，所以由注入脚本合成
`linkedin:<会话id>:<hash(预览+时间+未读)>` —— 同一会话里内容不同就是不同条目，足够去重。

### 怎么验证

1. **重启应用**（preload 变了，而已存在的 WebView 不会重建 —— 或直接点平台头部的「刷新」）
2. 切到 LinkedIn，看日志出现
   `platforms: ../dist/preload/index.js`（证明注入生效）
3. 页面加载后 1.5s，日志出现
   `[LinkedIn 监听] 基线已建立，共 N 条会话（不产生任何上报）`
4. 用另一个号给这个 LinkedIn 账号发一条消息
5. 预期日志：
   `[LinkedIn 监听] 上报 1 条新消息`
   `[监听] 新消息已入库 平台=linkedin 会话=<id> 客户=<id>`
6. 切到「聚合消息」，该会话应带未读角标冒到最前面；点开后未读清零

若第 3 步日志没出现，说明选择器没命中，把当时的 DOM 结构发我，调
`messageWatcher.ts` 里的 `NAME_SELECTORS` / `PREVIEW_SELECTORS` 即可
（已写成多级降级，改一处就够）。

---

## 十二、v3.7：点平台后「一片空白」—— 平台 WebView 被重复创建

### 现象

启动后点 LinkedIn（或任意已打开过的平台），右侧整块空白，
只在画面最左边露出一条很窄的网页残影；中间客户列表正常。

### 排查过程（关键证据）

先确认「到底是不是加载失败」——读 LinkedIn 的 WebView2 分区目录：

| 文件 | 修改时间 | 结论 |
|---|---|---|
| `Partitions/1a2b3c4d-0003.../Network/Cookies` | **16:41**（正是出问题时） | 页面**确实加载了**，还在跟服务器通信 |
| `Cache/Cache_Data` | 16:04 | 有缓存活动 |

**⇒ 不是网络/加载失败，是「显示」出了问题。**

再读 `app.log`，发现平台创建过程被打印了**两遍**：

```
open_webview id:platform-telegram layout=Some("left=392 top=92 right=Some(0.0) bottom=Some(0.0)")
open_webview id:platform-telegram layout=Some(...)          ← 第二次
[platform-telegram] 创建内嵌 WebView，创建前已存在 2 个: ["main", "secondary"]
platforms: ../dist/preload/index.js
[platform-telegram] 创建内嵌 WebView，创建前已存在 2 个: ["main", "secondary"]   ← 又建一遍
platforms: ../dist/preload/index.js
[platform-telegram] create_webview 矩形 → 1528x948，父窗口 1920x1040
[platform-telegram] create_webview 矩形 → 1528x948，父窗口 1920x1040
```

注意两点：

1. **布局换算是对的**（1920 − 392 = 1528，1040 − 92 = 948），坐标没问题；
2. **两次 `open_webview` 都进了「创建」分支**，一次 `webview has created`
   都没出现 —— 说明两次调用**并发**跑进了
   `if let Some(_) = app.get_webview(id)` 的 None 分支，
   于是同一个平台被创建了两遍。

### 根因

`PlatformWebView.tsx` 的创建 effect 在 **React StrictMode** 下会执行两遍
（挂载 → 卸载 → 再挂载），两遍都立刻 `invoke("open_webview")`。
两个请求并发到达 Rust，**都**在对方完成注册之前查了注册表，
于是都判定「不存在」→ 都去 `window.add_child()` 创建：

- 第一个成功，注册进 WebView 表；
- 第二个撞上 **WebView label 冲突**而失败；
- 结果：一个「正常的 WebView」+ 一个「半成品/重复实例」叠在一起，
  旧的又因为查不到而无法 `hide`，用户看到的就是**一片空白或错位残影**。

（同理，`hide` / `close` / `set_bounds` 也全都依赖 `app.get_webview()`；
一旦出现重复实例，这套按 id 定位的机制就会整体失效。）

### 修复

1. **前端防抖**（`PlatformWebView.tsx`）：
   创建动作延后一个宏任务再执行（`setTimeout(..., 0)`）。
   StrictMode 的第一遍挂载会立刻卸载，其定时器被 `clearTimeout` 掉，
   **只有第二遍（真正保留的那次）会创建**。
2. **Rust 补强**（`plugin.rs`）：`open_webview` 命中「已存在」分支时，
   不再只 `show()`，而是**先用本次布局纠正一次矩形再显示**。
   否则窗口尺寸 / 中间栏折叠状态变化后切回来的旧 WebView，
   会停在过期矩形上（同样是空白/错位的成因）。
3. **布局保护**（`webview.rs`）：`set_bounds` 若换算出宽或高 < 1px，
   直接忽略这次修改并告警，避免生成一个不可见的「隐形 WebView」。

### 顺带修掉一个「排障黑洞」

`lib.rs` 的日志配置原本是默认的 **1MB 上限 + `KeepOne`**。
平台网页（尤其 TikTok）的 console 日志**单行就有几 KB**，
很容易撑爆 1MB 触发轮转 —— 而 `KeepOne` 会把旧文件**整个丢掉**，
于是「应用启动 → 平台 WebView 创建」这段最关键的过程永远看不到。
现改为 **20MB**，启动阶段的日志不再丢失。

### 验证（日志实测）

修复前：

```
open_webview ×2 → create ×2 → 注册表始终 ["main", "secondary"]
```

修复后：

```
open_webview id:platform-telegram layout=Some("left=392 top=92 right=Some(0.0) bottom=Some(0.0)")
[platform-telegram] 创建内嵌 WebView，创建前已存在 2 个: ["main", "secondary"]
platforms: ../dist/preload/index.js
[platform-telegram] create_webview 矩形 left=392 top=92 → 1528x948，父窗口 1920x1040
[platform-telegram] create_webview 完成，注册表现有 3 个: ["main", "secondary", "platform-telegram"]
```

**只创建一次，且注册成功。**

### 本次改动文件

| 文件 | 改动 |
|---|---|
| `src/components/PlatformWebView.tsx` | 创建动作延后一拍，规避 StrictMode 双挂载重复创建 |
| `src-tauri/src/gc_webview/plugin.rs` | `open_webview` 已存在时按新布局纠正矩形 |
| `src-tauri/src/gc_webview/webview.rs` | 创建前/后打印 WebView 清单；`set_bounds` 打印实际矩形 + 无效尺寸保护 |
| `src-tauri/src/lib.rs` | 日志文件上限 1MB → 20MB |

### 若之后仍出现空白，按这个顺序查

1. `app.log` 里搜 `create_webview 完成，注册表现有` —— 确认那次创建**注册成功**；
2. 搜 `set_bounds` —— 看下发的矩形是否合理（宽高应远大于 1）；
3. 搜 `创建前已存在 N 个` —— 若 N 持续增长，说明有 WebView 没被回收。



---

## 十三、v3.8：消息监听其实一直没挂上 —— `appId not found` 才是真凶（2026-10-13）

### 现象

点开 LinkedIn（或任何**已登录**的平台）后，页面正常，但**一条消息都收不到**，
`[LinkedIn 监听] 基线已建立` 这条日志从未出现过。

### 根因：`appStore` 的 key 与 webview label 对不上

上游代码（`gc-engine` 及各平台 SDK）一律假设 **「webview id === appId」**，
所以到处在写 `appStore.getAppById(getCurrentWebviewId())`。

但新版三栏界面（Dashboard）自建的平台 WebView 用的是 `platform-<name>` 命名
（`platform-linkedin`），而 `appStore.appList` 的 key 是应用配置自己的 UUID。
于是这一次查找必然抛 `Error: appId not found`。

**致命之处在于它抛出的位置**：

```
Linkedin.mount()
  └─ await super.mount()
       └─ initAppSetting()
            └─ getCurrentUserInfo()
                 └─ appStore.getAppById("platform-linkedin")   ← 抛异常
```

而 `Linkedin.mount()` 里**注册消息监听的三行代码在 `await super.mount()` 之后** ——
异常往上一抛，监听器**永远不会被创建**。表现就是「页面一切正常，只是收不到消息」，
且异常只出现在页面的 `unhandledrejection` 里，不翻日志根本看不见。

### 为什么只影响「已登录」的平台

`initAppSetting()` 第一行是 `if (!this.appSDK.isLoginEd) return;`。
所以未登录的平台（如 Telegram，本机 0 cookie）压根不会走到那里。

日志里 `appId not found` 的来源分布正好印证了这一点：

| 平台 | 出现次数 | 是否已登录 |
|---|---|---|
| linkedin | 24 | ✅ |
| tiktok | 14 | ✅ |
| messenger | 6 | ✅ |
| telegram | 0 | ❌ 未登录，提前 return |

### 修复（两层）

**第一层 · 治本 —— `packages/store/src/appStore.ts` 增加 key 容忍解析**

新增 `resolveAppKey()`：精确命中优先，未命中则按
「去掉 `platform-` 前缀 + 忽略大小写与分隔符」用平台名匹配
（`platform-linkedin` → `linkedin` ↔ `EPlatform.Linkedin`）。

接入到全部按 appId 查找的方法：`getAppById` / `getPlatformById` /
`getCurrentChatUserByAppId` / `updateCurrentChatUserByAppId` /
`clearCurrentChatUserByAppId` / `getCurrentChatUserTranslateConfigByAppId` / `logout`。

**第二层 · 防御 —— `AbstractAppEngine` 不再让初始化失败阻断挂载**

- `mount()` 里 `initAppSetting()` 改用 `try/catch` 包住并打印错误，
  保证子类的核心能力（消息监听等）**无论如何都会挂上**；
- `handleLoginChange()` 里的 `initAppSetting()` 补 `.catch()`，
  避免刷出一串 unhandled rejection 掩盖真正的问题。

### 验证

- `appId not found` 从历史累计 44 次 → 本次启动 **0 次**；
- 本次启动**零 error 级日志**；
- 类型检查全量 127 条 = 基线，**0 新增**；
- LinkedIn 分区 cookie 完好（89 条，`li_at` / `li_rm` 均在），**无需重新登录**。

### 遗留

监听器只在 `location.pathname` 命中 `/messaging` 时才工作 ——
即**需要停在 LinkedIn 的消息页**。停在信息流（feed）上不会建立基线。后续可考虑
把「会话列表出现」本身当作触发条件。
