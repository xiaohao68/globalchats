import { FC } from "react";

export const CRMPanel: FC = () => {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          客户信息
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          选择对话后显示客户详情
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            昵称
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            电话
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            备注
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-primary)] p-3">
          <label className="text-xs text-[var(--color-text-secondary)]">
            标签
          </label>
          <p className="text-sm text-[var(--color-text-primary)]">-</p>
        </div>
      </div>
    </div>
  );
};
