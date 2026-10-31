import { FC, useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@gc/ui/components/dialog";
import { Button } from "@gc/ui/components/button";
import { Input } from "@gc/ui/components/input";
import { Label } from "@gc/ui/components/label";
import { Switch } from "@gc/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gc/ui/components/table";
import { api, type UserAdminRow } from "@/services/api";
import { readSignedInUser, useUserAdminStore } from "@/stores/userAdminStore";
import { toast } from "sonner";
import { Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { cn } from "@gc/ui/lib/utils";

/**
 * 「业务员账号管理」面板 —— 只有 role = admin 的人能看到入口。
 *
 * 两件事要理解清楚，界面上也写了提示：
 *  1. 这里管的是**系统账号**（登本软件用的），不是 LinkedIn/Facebook 的平台账号。
 *     平台账号的密码由平台自己管，我们不存也不该存。
 *  2. 删号是危险操作：customer / conversation 的外键是 ON DELETE CASCADE，
 *     删人＝把他名下所有客户和消息一起清空。所以删之前必须看清「客户数/会话数」两列。
 */
export const UserAdminDialog: FC = () => {
  const { isOpen, close } = useUserAdminStore();
  const [operator, setOperator] = useState(readSignedInUser);
  const [rows, setRows] = useState<UserAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // 新建表单
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");

  // 每行自己的「改密码」编辑态
  const [pwdEditingId, setPwdEditingId] = useState<number | null>(null);
  const [pwdDraft, setPwdDraft] = useState("");

  const refresh = useCallback(async (operatorId: number) => {
    setLoading(true);
    try {
      const list = await api.listUsersAdmin(operatorId);
      setRows(list);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 每次打开都重新拉一遍（别人可能刚改过），同时刷新一次登录者信息（role 可能是旧的）
  useEffect(() => {
    if (!isOpen) return;
    const me = readSignedInUser();
    setOperator(me);
    if (!me) return;
    void refresh(me.id);
    setShowCreate(false);
    setPwdEditingId(null);
  }, [isOpen, refresh]);

  const operatorId = operator?.id ?? 0;

  const handleCreate = async () => {
    if (!operatorId) return;
    if (!newUsername.trim()) {
      toast.error("用户名不能为空");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    setBusy(true);
    try {
      const newId = await api.createUser(
        operatorId,
        newUsername.trim(),
        newPassword,
        newDisplayName.trim() || undefined,
      );
      if (newId === 0) {
        toast.error(`用户名「${newUsername.trim()}」已存在`);
      } else {
        toast.success(`账号 ${newUsername.trim()} 已创建`);
        setNewUsername("");
        setNewPassword("");
        setNewDisplayName("");
        setShowCreate(false);
        await refresh(operatorId);
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    if (!operatorId) return;
    if (pwdDraft.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    setBusy(true);
    try {
      await api.updateUserPassword(operatorId, userId, pwdDraft);
      toast.success(`${username} 的密码已更新`);
      setPwdEditingId(null);
      setPwdDraft("");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (row: UserAdminRow) => {
    if (!operatorId) return;
    setBusy(true);
    try {
      await api.setUserActive(operatorId, row.id, !row.is_active);
      toast.success(row.is_active ? `${row.username} 已停用` : `${row.username} 已启用`);
      await refresh(operatorId);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (row: UserAdminRow) => {
    if (!operatorId) return;

    const hasData = row.customer_count > 0 || row.conversation_count > 0;
    const warning = hasData
      ? `${row.username} 名下还有 ${row.customer_count} 个客户 / ${row.conversation_count} 个会话。\n\n删除账号会把这些数据一起清空，且无法恢复。\n\n确定要删除吗？`
      : `确定删除账号 ${row.username} 吗？`;

    // 二次确认：这是不可逆操作，必须让老板自己点一次
    if (!window.confirm(warning)) return;

    setBusy(true);
    try {
      // hasData 时带了 force，等价于老板在上面那段提示里确认过了
      await api.deleteUser(operatorId, row.id, hasData);
      toast.success(`账号 ${row.username} 已删除`);
      await refresh(operatorId);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && close()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-4xl flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle>业务员账号管理</DialogTitle>
          <DialogDescription>
            这里管的是<b>登录本软件的系统账号</b>（决定能看到谁的数据）。
            LinkedIn / Facebook 等平台账号不在这里 —— 那些密码由平台自己保管，我们存不了也不该存。
          </DialogDescription>
        </DialogHeader>

        {/* 顶部操作条 */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground text-xs">
            共 {rows.length} 个账号
            {operator && (
              <>
                {" · "}当前登录：<span className="font-medium">{operator.username}</span>
                （{operator.role}）
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh(operatorId)}
              disabled={loading || !operatorId}
            >
              {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}
              刷新
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreate((v) => !v)}
              disabled={!operatorId}
            >
              {showCreate ? (
                <X className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Plus className="mr-1 h-3.5 w-3.5" />
              )}
              {showCreate ? "取消" : "新建账号"}
            </Button>
          </div>
        </div>

        {/* 新建表单（折叠） */}
        {showCreate && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[#E0DDD6] bg-[#FAF9F6] p-3">
            <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
              <Label htmlFor="new-username" className="text-xs">
                用户名（登录用）
              </Label>
              <Input
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="如 wangwu"
                autoFocus
              />
            </div>
            <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
              <Label htmlFor="new-password" className="text-xs">
                初始密码（至少 6 位）
              </Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="给业务员的初始密码"
              />
            </div>
            <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
              <Label htmlFor="new-display" className="text-xs">
                姓名（可留空）
              </Label>
              <Input
                id="new-display"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="如 王五"
              />
            </div>
            <Button onClick={() => void handleCreate()} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              创建
            </Button>
          </div>
        )}

        {/* 账号列表 */}
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[#E0DDD6]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[#FAF9F6]">
              <TableRow>
                <TableHead className="w-[150px]">用户名</TableHead>
                <TableHead className="w-[110px]">姓名</TableHead>
                <TableHead className="w-[80px]">角色</TableHead>
                <TableHead className="w-[70px] text-right">客户</TableHead>
                <TableHead className="w-[70px] text-right">会话</TableHead>
                <TableHead className="w-[90px]">状态</TableHead>
                <TableHead className="min-w-[200px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-[#888]">
                    {loading ? "加载中…" : "还没有账号"}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const isSelf = row.id === operatorId;
                const editing = pwdEditingId === row.id;
                return (
                  <TableRow key={row.id} className={cn(!row.is_active && "opacity-55")}>
                    <TableCell className="font-medium">
                      {row.username}
                      {isSelf && (
                        <span className="ml-1.5 rounded bg-[#E1F5EE] px-1 py-0.5 text-[10px] text-[#0F7B52]">
                          我
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#555]">{row.display_name ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px]",
                          row.role === "admin"
                            ? "bg-[#E1F5EE] text-[#0F7B52]"
                            : "bg-[#F1EFEA] text-[#666]",
                        )}
                      >
                        {row.role === "admin" ? "管理员" : "业务员"}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        row.customer_count > 0 && "font-medium text-[#1A1A1A]",
                      )}
                    >
                      {row.customer_count}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        row.conversation_count > 0 && "font-medium text-[#1A1A1A]",
                      )}
                    >
                      {row.conversation_count}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.is_active}
                        disabled={busy || isSelf}
                        onCheckedChange={() => void handleToggleActive(row)}
                      />
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="text"
                            className="h-7 w-[130px] text-xs"
                            placeholder="新密码（≥6 位）"
                            value={pwdDraft}
                            autoFocus
                            onChange={(e) => setPwdDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleResetPassword(row.id, row.username);
                              if (e.key === "Escape") {
                                setPwdEditingId(null);
                                setPwdDraft("");
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={busy}
                            onClick={() => void handleResetPassword(row.id, row.username)}
                          >
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setPwdEditingId(null);
                              setPwdDraft("");
                            }}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setPwdEditingId(row.id);
                              setPwdDraft("");
                            }}
                          >
                            改密码
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-[#FF3B30] hover:bg-[#FFEBEB] hover:text-[#FF3B30]"
                            disabled={busy || isSelf}
                            onClick={() => void handleDelete(row)}
                          >
                            <Trash2 className="mr-0.5 h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-[11px] leading-relaxed text-[#888]">
          提示：「客户 / 会话」两列是该账号名下的数据量。带数据的账号一旦删除，这些数据会**一起被清空**；
          离职的业务员建议先<b>停用</b>（数据保留，登录被拒），确认不用了再删。
        </p>
      </DialogContent>
    </Dialog>
  );
};
