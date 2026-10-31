import { cn } from "@gc/ui/lib/utils";
import { MessageSquare, Mail, Users, TriangleAlert } from "lucide-react";
import { Button } from "@gc/ui/components/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-5 text-[var(--color-text-tertiary)]">{icon}</div>
      )}
      <h3 className="text-title mb-2 text-[var(--color-text-primary)]">
        {title}
      </h3>
      {description && <p className="text-meta max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// 预设的空状态组件 - Apple 风格图标
export function NoConversations() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-12 w-12 stroke-[1.5]" />}
      title="暂无对话"
      description="当你收到新消息时，它们将显示在这里"
    />
  );
}

export function NoMessages() {
  return (
    <EmptyState
      icon={<Mail className="h-12 w-12 stroke-[1.5]" />}
      title="暂无消息"
      description="开始发送消息吧"
    />
  );
}

export function NoAccounts() {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12 stroke-[1.5]" />}
      title="暂无账号"
      description="请先连接您的社交账号"
    />
  );
}

export function NoSearchResults() {
  return (
    <EmptyState
      icon={
        <svg
          className="h-12 w-12"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      }
      title="无搜索结果"
      description="尝试使用不同的关键词"
    />
  );
}

interface ErrorStateProps {
  error?: string | null;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <EmptyState
      icon={<TriangleAlert className="h-12 w-12 stroke-[1.5]" />}
      title="加载失败"
      description={error || "请检查网络后重试"}
      action={
        <Button type="button" onClick={onRetry}>
          重试
        </Button>
      }
    />
  );
}
