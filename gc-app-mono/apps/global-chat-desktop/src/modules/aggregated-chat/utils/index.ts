/**
 * 时间格式化工具函数
 */

/**
 * 将时间戳格式化为聊天列表显示格式
 * - 今天：显示时间 (如 "14:30")
 * - 昨天：显示 "昨天"
 * - 本周内：显示星期几 (如 "星期一")
 * - 更早：显示日期 (如 "12/25")
 */
export function formatChatTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (timestamp >= today.getTime()) {
    // 今天：显示时间
    return formatTime(date);
  } else if (timestamp >= yesterday.getTime()) {
    // 昨天
    return "昨天";
  } else if (timestamp >= weekAgo.getTime()) {
    // 本周内：显示星期几
    return formatWeekday(date);
  } else {
    // 更早：显示日期
    return formatDate(date);
  }
}

/**
 * 将时间戳格式化为消息时间显示格式
 * - 今天：显示时间 (如 "14:30")
 * - 其他：显示日期和时间 (如 "12/25 14:30")
 */
export function formatMessageTime(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timestamp >= today.getTime()) {
    return formatTime(date);
  } else {
    return `${formatDate(date)} ${formatTime(date)}`;
  }
}

/**
 * 格式化时间为 HH:mm 格式
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期为 MM/DD 格式
 */
function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${month}/${day}`;
}

/**
 * 格式化为完整日期 YYYY-MM-DD 格式
 */
export function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 格式化星期几
 */
function formatWeekday(date: Date): string {
  const weekdays = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ] as const;
  return weekdays[date.getDay()] ?? "星期日";
}

/**
 * 判断两个时间戳是否在同一天
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * 获取消息分组的日期标签
 * - 统一显示完整日期（YYYY-MM-DD）
 */
export function getDateLabel(timestamp: number): string {
  return formatFullDate(timestamp);
}

/**
 * 截断文本，超过指定长度显示省略号
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + "…";
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
