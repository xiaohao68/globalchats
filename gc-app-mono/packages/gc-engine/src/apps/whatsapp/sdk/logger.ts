/**
 * WhatsApp SDK 日志工具
 * 只输出关键的数据上报信息，方便核对数据正确性
 */

type LogLevel = "INFO" | "DEBUG" | "ERROR";

interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class WhatsAppLogger {
  private enabled = true;
  private debugMode = false; // 设置为 true 显示详细调试信息

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  private log(entry: LogEntry) {
    if (!this.enabled) return;
    if (entry.level === "DEBUG" && !this.debugMode) return;

    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const prefix = `[${timestamp}] [WA-${entry.level}] [${entry.category}]`;

    if (entry.data !== undefined) {
      console.log(`${prefix} ${entry.message}`, entry.data);
    } else {
      console.log(`${prefix} ${entry.message}`);
    }
  }

  // 初始化同步
  syncStart() {
    this.log({ level: "INFO", category: "Sync", message: "🚀 开始初始化同步" });
  }

  syncComplete() {
    this.log({ level: "INFO", category: "Sync", message: "✅ 初始化同步完成" });
  }

  syncFailed(error: any) {
    this.log({ level: "ERROR", category: "Sync", message: "❌ 初始化同步失败", data: error });
  }

  // 登录状态
  reportLoginStatus(success: boolean) {
    const status = success ? "✅" : "❌";
    this.log({ level: "INFO", category: "Login", message: `${status} 上报登录状态: ${success ? "成功" : "失败"}` });
  }

  // 当前用户
  reportCurrentUser(userId: string, nickname: string, success: boolean) {
    const status = success ? "✅" : "❌";
    this.log({
      level: "INFO",
      category: "User",
      message: `${status} 上报当前用户: ${userId} (${nickname})`
    });
  }

  getCurrentUserFailed(reason: string) {
    this.log({ level: "ERROR", category: "User", message: `❌ 获取当前用户失败: ${reason}` });
  }

  // 会话列表
  reportConversations(count: number, success: boolean) {
    const status = success ? "✅" : "❌";
    this.log({
      level: "INFO",
      category: "Conversations",
      message: `${status} 上报会话列表: ${count} 个会话`
    });
  }

  // 联系人列表
  reportContacts(count: number, success: boolean) {
    const status = success ? "✅" : "❌";
    this.log({
      level: "INFO",
      category: "Contacts",
      message: `${status} 上报联系人列表: ${count} 个联系人`
    });
  }

  // 历史消息同步
  historyStart(totalChats: number, recentChats: number) {
    this.log({
      level: "INFO",
      category: "History",
      message: `📚 开始历史消息同步: ${recentChats}/${totalChats} 个会话（最近7天）`
    });
  }

  historyChatStart(index: number, total: number, chatId: string) {
    this.log({
      level: "DEBUG",
      category: "History",
      message: `[${index}/${total}] 同步会话: ${chatId}`
    });
  }

  historyChatMessages(chatId: string, rawCount: number, filteredCount: number, convertedCount: number) {
    this.log({
      level: "INFO",
      category: "History",
      message: `📝 会话 ${chatId}: 原始 ${rawCount} → 过滤 ${filteredCount} → 转换 ${convertedCount} 条消息`
    });
  }

  historyMessagePreview(chatId: string, messages: Array<{ id: string; content: string }>) {
    if (messages.length === 0) return;

    const preview = messages.map((msg, idx) => {
      const content = msg.content.length > 30 ? msg.content.substring(0, 30) + "..." : msg.content;
      return `    [${idx + 1}] "${content}"`;
    }).join("\n");

    this.log({
      level: "DEBUG",
      category: "History",
      message: `消息预览 (前${messages.length}条):\n${preview}`
    });
  }

  historyReported(chatId: string, count: number, success: boolean) {
    const status = success ? "✅" : "❌";
    this.log({
      level: "INFO",
      category: "History",
      message: `${status} 上报历史消息: ${chatId} (${count} 条)`
    });
  }

  historyChatSkipped(chatId: string, reason: string) {
    this.log({
      level: "DEBUG",
      category: "History",
      message: `⏭️  跳过会话 ${chatId}: ${reason}`
    });
  }

  // 实时消息
  newMessage(messageId: string, senderId: string, chatId: string, content: string) {
    const contentPreview = content.length > 50 ? content.substring(0, 50) + "..." : content;
    this.log({
      level: "INFO",
      category: "Message",
      message: `💬 新消息: ${messageId}\n    发送者: ${senderId}\n    会话: ${chatId}\n    内容: "${contentPreview}"`
    });
  }

  messageReported(count: number, accepted: number, deduped: number) {
    this.log({
      level: "INFO",
      category: "Message",
      message: `✅ 上报消息: 总数 ${count}, 接受 ${accepted}, 去重 ${deduped}`
    });
  }

  // 调试信息
  debug(category: string, message: string, data?: any) {
    this.log({ level: "DEBUG", category, message, data });
  }

  // 错误信息
  error(category: string, message: string, error?: any) {
    this.log({ level: "ERROR", category, message, data: error });
  }
}

export const waLogger = new WhatsAppLogger();
