import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gc/ui/components/select";
import { useChatStore } from "../../store/chatStore";
import { useUIStore } from "../../store/uiStore";
import { PlatformIcon } from "../common/PlatformIcon";

export function AccountFilter() {
  const { accounts } = useChatStore();
  const { accountFilter, setAccountFilter } = useUIStore();

  // 只显示活跃的账号
  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.isActive);
  }, [accounts]);

  const handleValueChange = (value: string) => {
    setAccountFilter(value === "all" ? [] : [value]);
  };

  return (
    <Select
      value={accountFilter.length === 1 ? accountFilter[0] : "all"}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="选择账号" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <span className="flex items-center gap-2">
            <span className="bg-muted flex h-5 w-5 items-center justify-center rounded-full text-xs">
              全
            </span>
            <span>全部账号</span>
          </span>
        </SelectItem>
        {activeAccounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <span className="flex items-center gap-2">
              <PlatformIcon platform={account.platform} size={18} />
              <span>{account.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
