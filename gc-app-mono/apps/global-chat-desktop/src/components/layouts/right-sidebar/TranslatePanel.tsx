import { FC } from "react";

export const TranslatePanel: FC = () => {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          翻译设置
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          配置消息翻译选项
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-primary)]">
              接收消息翻译
            </span>
            <div className="h-5 w-9 rounded-full bg-[var(--color-accent)]" />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            自动翻译收到的消息
          </p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-primary)]">
              发送消息翻译
            </span>
            <div className="h-5 w-9 rounded-full bg-[var(--color-bg-hover)]" />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            发送前翻译消息
          </p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            目标语言
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">简体中文</p>
        </div>
      </div>
    </div>
  );
};
