import type { ReactNode } from "react";
import { ChatAvatar } from "../common/ChatAvatar";
import { GcSurface } from "@gc/ui/custorm-components/GcSurface.tsx";
import type { Conversation, Account, UserStatus } from "../../types";

interface ConversationHeaderProps {
  conversation: Conversation;
  account?: Account;
  actions?: ReactNode;
}

// 状态文本映射
const statusText: Record<UserStatus, string> = {
  online: "在线",
  offline: "离线",
  idle: "离开",
  dnd: "勿扰",
};

export function ConversationHeader({
  conversation,
  account,
  actions,
}: ConversationHeaderProps) {
  const { contact } = conversation;

  // 生成副标题
  const getSubtitle = () => {
    if (contact.isGroup) {
      const members = contact.memberCount ?? 0;
      const online = contact.onlineCount ?? 0;
      if (members > 0) {
        return online > 0
          ? `${members} 成员，${online} 在线`
          : `${members} 成员`;
      }
      return "群聊";
    }
    if (contact.status) {
      return statusText[contact.status];
    }
    return account?.name;
  };

  return (
    <GcSurface
      asChild
      variant="glass"
      className="sticky top-0 z-20 rounded-none border-x-0 border-t-0 border-b border-[var(--gc-glass-border)] saturate-150"
    >
      <header className="flex items-center gap-3 px-4 py-3">
        <ChatAvatar
          contact={contact}
          platform={account?.platform}
          size="md"
          showStatus={!contact.isGroup}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold tracking-[var(--letter-spacing-title)] text-[var(--color-text-primary)] text-[var(--font-size-title)]">
            {contact.name}
          </h2>
          <p className="text-meta truncate">{getSubtitle()}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
    </GcSurface>
  );
}
