/**
 * WhatsApp 唯一标识符
 * 格式: {user}@{server}
 * 示例: "8618983096460@c.us" (个人), "123456789@g.us" (群组)
 */
export interface WAWid {
  /** 用户部分 (手机号或群组ID) */
  user: string;
  /** 服务器标识: "c.us" (个人) | "g.us" (群组) */
  server: string;
  /** 序列化格式: "{user}@{server}" */
  _serialized: string;
}

/**
 * 验证 WAWid 是否有效
 */
export function isValidWAWid(wid: unknown): wid is WAWid {
  return (
    typeof wid === "object" &&
    wid !== null &&
    typeof (wid as WAWid).user === "string" &&
    typeof (wid as WAWid).server === "string" &&
    typeof (wid as WAWid)._serialized === "string"
  );
}
