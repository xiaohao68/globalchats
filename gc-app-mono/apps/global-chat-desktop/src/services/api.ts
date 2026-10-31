import { invoke } from "@tauri-apps/api/core";

// ============================================================
// 数据类型定义（对应数据库 schema v2）
// ============================================================

export interface User {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

/**
 * 未读快照（清未读命令的返回值）。
 *
 * 为什么不是「清完再查一次列表」：那次查询和 UPDATE 并发跑在连接池的不同连接上，
 * 查早了就读到旧的 unread_count，红点留着不灭 —— 业务员看到「红点时灭时不灭」。
 * 让命令把最新值一起带回来，前端直接覆盖，彻底绕开时序。
 */
export interface UnreadSnapshot {
  byPlatform: Record<string, number>;
  total: number;
}

export interface PlatformAccount {
  id: number;
  user_id: number;
  platform: string;
  account_name: string | null;
  external_id: string | null;
  login_status: string;
  user_agent: string | null;
  proxy_id: number | null;
}

export interface Conversation {
  id: number;
  user_id: number;
  platform_account_id: number;
  customer_id: number;
  conversation_type: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  assignee_id: number | null;
}

export interface Message {
  id: number;
  user_id: number;
  conversation_id: number;
  agent_user_id: number | null;
  external_message_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string | null;
  content_type: string;
  platform: string;
  sent_at: string | null;
  received_at: string;
  status: string;
}

export interface Customer {
  id: number;
  user_id: number;
  platform_account_id: number;
  external_id: string;
  name: string | null;
  is_group: boolean;
  is_online: boolean;
}

export interface ProxyConfig {
  id: number;
  user_id: number;
  proxy_type: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  country: string | null;
  is_active: boolean;
}

export interface MonitoringConfig {
  id: number;
  user_id: number;
  platform_account_id: number;
  is_active: boolean;
  monitoring_mode: string;
  last_sync_at: string | null;
}

/**
 * 注入脚本监听到的一条客户消息（宿主补全 userId / platformAccountId 后落库）。
 * 字段名与 Rust 侧 IncomingMessageInput 一一对应。
 */
export interface IncomingMessageInput {
  userId: number;
  platformAccountId: number;
  platform: string;
  conversationExternalId: string;
  customerExternalId: string;
  customerName?: string;
  customerAvatar?: string;
  isGroup?: boolean;
  messageExternalId: string;
  content?: string;
  contentType?: string;
  senderType?: string;
  senderName?: string;
  sentAt?: string;
}

export interface IncomingMessageResult {
  conversationId: number;
  customerId: number;
  messageId: number;
  /** false = 幂等命中（这条消息之前已经落过库），未读没有增加 */
  isNew: boolean;
}

// ============================================================
// API 调用封装
// ============================================================

export const api = {
  // 用户
  getUser: (username: string) =>
    invoke<User | null>("get_user_by_username_cmd", { username }),

  // 登录
  login: (username: string, password: string) =>
    invoke<{ success: boolean; token: string | null; user: User | null; message: string }>(
      "login_cmd",
      { username, password }
    ),

  verifyToken: (token: string) =>
    invoke<boolean>("verify_token_cmd", { token }),

  // 平台账号
  getPlatformAccounts: (userId: number) =>
    invoke<PlatformAccount[]>("get_platform_accounts_cmd", { userId }),

  // 会话
  getConversations: (userId: number, status?: string) =>
    invoke<Conversation[]>("get_conversations_cmd", { userId, status }),

  // 消息
  getMessages: (conversationId: number, limit?: number) =>
    invoke<Message[]>("get_messages_cmd", { conversationId, limit }),

  getAggregatedMessages: (userId: number, limit?: number) =>
    invoke<Message[]>("get_aggregated_messages_cmd", { userId, limit }),

  // 发送队列
  enqueueMessage: (userId: number, conversationId: number, agentUserId: number, content: string, contentType?: string) =>
    invoke<number>("enqueue_message_cmd", { userId, conversationId, agentUserId, content, contentType }),

  getPendingMessages: (limit?: number) =>
    invoke<{ id: number; status: string; retry_count: number }[]>("get_pending_messages_cmd", { limit }),

  // 客户
  getCustomers: (userId: number) =>
    invoke<Customer[]>("get_customers_cmd", { userId }),

  // 代理配置
  getProxyConfigs: (userId: number) =>
    invoke<ProxyConfig[]>("get_proxy_configs_cmd", { userId }),

  // 监听配置
  getMonitoringConfigs: (userId: number) =>
    invoke<MonitoringConfig[]>("get_monitoring_configs_cmd", { userId }),

  // 实时监听：把注入脚本抓到的客户消息落库
  // 幂等 —— 同一条消息重复上报时返回 isNew=false，未读不会重复累加
  recordIncomingMessage: (input: IncomingMessageInput) =>
    invoke<IncomingMessageResult>("record_incoming_message_cmd", { input }),

  // 聚合栏点开某条会话时清未读，返回最新未读快照（前端直接刷红点，不必再查列表）
  markConversationRead: (conversationId: number) =>
    invoke<UnreadSnapshot>("mark_conversation_read_cmd", { conversationId }),

  /**
   * 手动改会话状态（聚合页「已处理」/「恢复」）。
   * status: "handled" = 业务员已处理完，从聚合待办里消掉（中栏客户列表仍保留，能点进去翻历史）；
   *         "active"  = 恢复回待办。
   */
  setConversationStatus: (conversationId: number, status: "handled" | "active") =>
    invoke<void>("update_conversation_status_cmd", { conversationId, status }),

  /**
   * 「自动登记」：确保该业务员在该平台有一条 platform_account 记录，返回记录 id。
   *
   * 幂等（已有就直接返回已有的 id），所以可以放心反复调用。
   * 不登记的话，这个平台监听到的消息会被宿主丢弃 —— 监听等于不存在。
   *
   * ⚠️ 只登记「户口关系」，不涉及任何平台凭据；平台密码/Cookie 都在本机 WebView 分区里。
   */
  ensurePlatformAccount: (userId: number, platform: string, accountName?: string) =>
    invoke<number>("ensure_platform_account_cmd", { userId, platform, accountName }),

  // ------------------------------------------------------------------
  // 业务员账号管理（管理员界面）
  //
  // 全部都要带 operatorId（操作者自己的 user id）：Rust 侧会拿它查 role，
  // 不是 admin 直接返回「只有管理员可以做这个操作」。前端隐藏按钮不算数，
  // invoke 照样能调，所以闸门必须在后端。
  // ------------------------------------------------------------------

  /** 列出所有账号（含各自名下客户/会话数量）。创建失败返回 0 表示用户名已存在。 */
  listUsersAdmin: (operatorId: number) =>
    invoke<UserAdminRow[]>("list_users_admin_cmd", { operatorId }),

  /** 新建业务员账号，密码传明文（Rust 侧 bcrypt 加密）。返回新 id，重名返回 0。 */
  createUser: (
    operatorId: number,
    username: string,
    password: string,
    displayName?: string,
    email?: string,
    role?: "member" | "admin",
  ) =>
    invoke<number>("create_user_cmd", {
      operatorId,
      username,
      password,
      displayName,
      email,
      role,
    }),

  /** 改密码 / 给业务员重置密码，同样传明文。 */
  updateUserPassword: (operatorId: number, userId: number, password: string) =>
    invoke<void>("update_user_password_cmd", { operatorId, userId, password }),

  /** 停用 / 启用。停用后登录被拒，数据保留 —— 离职先停用，别急删。 */
  setUserActive: (operatorId: number, userId: number, isActive: boolean) =>
    invoke<void>("set_user_active_cmd", { operatorId, userId, isActive }),

  /**
   * 删号。⚠️ 外键是 ON DELETE CASCADE，会连带删掉他名下所有客户与会话。
   * force=false 时只要他还有数据，Rust 会直接拒绝并提示数量。
   */
  deleteUser: (operatorId: number, userId: number, force?: boolean) =>
    invoke<void>("delete_user_cmd", { operatorId, userId, force }),
};

/** 管理员界面用的账号行（含数据量统计，删号前给老板看代价） */
export interface UserAdminRow {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  customer_count: number;
  conversation_count: number;
}
