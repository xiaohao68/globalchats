# Global Chats 重开开发 - 接续上下文

**给新 agent 的话**：本文档是你接手这个项目的唯一入口。读完这一份 + 下列文件，你就拥有全部上下文，可以直接开始开发，不需要再问用户"你要做什么"。

> ### ⚠️ 动手接新平台监听之前，先读 `新平台监听接入清单.md`
>
> 接入新平台的消息监听有**一个藏在代码里、不做也不报错的必做步骤**
> —— 把平台加进 `Dashboard.tsx` 的 `PINNED_PLATFORMS` 后台常驻名单。
> 漏掉它，页面能开、能登录、界面上一切正常，**但一条客户消息都收不到**，
> 而且切到别的平台后已接入的平台还会**悄悄停止监听**。
> 完整流程、铁律、症状对照表都在那份清单里。

---

## 一、项目是什么

多平台外贸聊天聚合系统。把 Telegram、TikTok、LinkedIn、Messenger、Facebook、Teams 6 个平台聚合到一个桌面应用里，业务员在一个界面里管理所有平台的客户消息。

## 二、核心需求（老板拍板的）

1. **6 平台聚合**：左侧栏 6 个平台图标（真实 SVG Logo + 红色未读角标），点击切换
2. **三栏布局**：左 72px 平台栏 → 中 320px 客户列表 → 右 flex 平台原生网页（WebView 内嵌）
3. **聚合页面**：左下角绿色"聚合"按钮，汇总所有平台消息，按时间分组（今天/昨天），每条带平台图标，未读排前
4. **实时监听**：先做 Telegram（TDLib/MTProto 方案），其他平台后续
5. **多用户**：中型团队 5-20 业务员，admin 看全部 / member 只看自己，数据隔离
6. **一人多号**：一个业务员可以在同一平台有多个账号（如 Telegram 主号 + 业务号）
7. **防关联**：每个平台账号绑定独立代理 IP + 独立 User-Agent + 浏览器指纹
8. **UI 风格**：WhatsApp 浅色主题（暖米色 #EFEAE2 背景 + 白色面板 + 绿色 #25D366 + 红色 #FF3B30 角标），不要全黑

## 三、技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri 2（Rust 后端 + WebView 前端） |
| 前端 | React + TypeScript |
| 后端 | Rust（Tauri commands） |
| 数据库 | PostgreSQL 18.3 |
| 代理 | ClashVerge，混合端口 127.0.0.1:7897 |
| Telegram 监听 | TDLib（Telegram Database Library） |

## 四、数据库连接

```
host: localhost
port: 5432
database: globalchats
user: postgres
password: lxh2580lxh
```

## 五、当前进度

### 已完成
- [x] 数据库 schema v2（10 张表，修复了第三方模型指出的 11 个问题）
  - 文件：`database/schema_v2.sql`
  - 设计说明：`database/CHANGELOG_v2.md`
  - **尚未执行到 PostgreSQL**，新 agent 第一步应该执行建表
- [x] UI 原型（可交互 HTML Demo）
  - 文件：`prototype/index.html`
  - 演示了：登录页 → 三栏布局 → 平台切换 → 客户列表 → 聚合消息 → 聊天详情
- [x] UI 静态设计稿
  - 文件：`gc-app-mono/ui-design.html`
- [x] 旧系统交接文档（旧 gc-app-mono 的完整分析）
  - 文件：`HANDOVER.md`
- [x] 旧系统本地运行手册
  - 文件：`LOCAL_RUN_GUIDE.md`
- [x] 旧系统项目指南
  - 文件：`PROJECT_GUIDE.md`

### 未开始
- [ ] 执行 schema_v2.sql 到 PostgreSQL
- [ ] 在 gc-app-mono 上改造 UI（从全黑改为 WhatsApp 浅色风格）
- [ ] 6 平台 WebView 内嵌（每个平台加载真实网页 URL）
- [ ] 多用户登录系统（JWT/Session）
- [ ] Telegram TDLib 监听集成
- [ ] 聚合页面接入真实数据
- [ ] 发送队列（message_outbox）的消费者逻辑
- [ ] 代理/指纹绑定到 WebView 请求

## 六、3 周开发计划

| 周 | 任务 |
|---|---|
| 第 1 周 | 建库 + 登录系统 + 新 UI 骨架 + 6 平台内嵌 WebView |
| 第 2 周 | Telegram TDLib 监听 + 聚合页面 + 多用户数据隔离 |
| 第 3 周 | 扩展监听平台 + 未读角标 + 通知系统 + 联调收尾 |

## 七、必须带的 5 个文件

给新 agent 时，连同本文件一起发送：

1. `database/schema_v2.sql` - 数据库建表 SQL（10 表 + 测试数据）
2. `database/CHANGELOG_v2.md` - 数据库设计说明 + 验证查询
3. `prototype/index.html` - UI 可交互原型
4. `gc-app-mono/ui-design.html` - UI 静态设计稿
5. `HANDOVER.md` - 旧系统交接文档

## 八、数据库 v2 设计要点（防止新 agent 改错）

1. **一人多号**：`platform_account UNIQUE(user_id, platform, external_id)` — 不限制一人一号
2. **防关联三件套**：`proxy_config` 表 + `platform_account.user_agent` + `platform_account.fingerprint` — 每个平台账号绑定独立代理 IP + 独立 UA + 独立指纹
3. **发送走队列**：`message_outbox` 表，状态机 `pending→sending→sent/failed`，支持失败重试和定时发送
4. **消息幂等**：`message UNIQUE(conversation_id, external_message_id)` — 防止监听重复入库
5. **会话可分配**：`conversation.assignee_id` + `status (active/archived/closed/snoozed)`
6. **增量同步**：`monitoring_config.sync_cursor JSONB` — 每个平台账号独立的同步游标
7. **附件独立**：`attachment` 表 — 图片/视频/文件/语音单独存，不塞在 message 里

## 九、6 个平台的网页 URL

| 平台 | WebView 加载 URL |
|---|---|
| Telegram | `https://web.telegram.org` |
| TikTok | `https://www.tiktok.com/messages` |
| LinkedIn | `https://www.linkedin.com/messaging` |
| Messenger | `https://www.messenger.com` |
| Facebook | `https://www.facebook.com/messages` |
| Teams | `https://teams.microsoft.com` |

## 十、平台品牌色

| 平台 | 颜色 | 用途 |
|---|---|---|
| Telegram | #0088CC | 头部背景色、图标选中色 |
| TikTok | #69C9D0 | 同上 |
| LinkedIn | #0A66C2 | 同上 |
| Messenger | #006AFF | 同上 |
| Facebook | #1877F2 | 同上 |
| Teams | #6264A7 | 同上 |
| 聚合 | #25D366 | 绿色，聚合按钮 |
| 未读角标 | #FF3B30 | 红色 |
| 背景 | #EFEAE2 | 暖米色 |
| 发出消息 | #DCF8C6 | 浅绿气泡 |
| 收到消息 | #FFFFFF | 白色气泡 |

## 十一、用户偏好

- 老板视角设计（"如果你是老板"思维）
- 不喜欢全黑主题
- 决策果断，喜欢"继续"/"动手"式回答
- 用真实 SVG Logo 不用文字缩写
- 中文交流
