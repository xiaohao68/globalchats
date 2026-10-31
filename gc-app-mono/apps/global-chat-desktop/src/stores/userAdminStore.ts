import { create } from "zustand";

/**
 * 「业务员账号管理」弹窗的开关状态。
 *
 * 为什么用 store 而不是路由：这个项目的设置类 UI 都是「全局常驻 Dialog + zustand 控制开关」
 * （参照 `SessionConfigDialog`），弹窗挂在 `<Routes>` 外面，任何页面都能唤起。
 */
interface UserAdminState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useUserAdminStore = create<UserAdminState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

/**
 * 从登录时写入 localStorage 的 `gc_user` 里读当前登录者信息。
 *
 * ⚠️ 与 `Dashboard.tsx` 的 `readUserId` 同源，别两边读法不一致。
 * 这里多读一个 role —— 管理员入口按钮只给 role === "admin" 的人看。
 */
export const readSignedInUser = (): {
  id: number;
  username: string;
  role: string;
} | null => {
  try {
    const raw = localStorage.getItem("gc_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      id?: number;
      username?: string;
      role?: string;
    } | null;
    if (!parsed || typeof parsed.id !== "number") return null;
    return {
      id: parsed.id,
      username: parsed.username ?? "",
      role: parsed.role ?? "member",
    };
  } catch {
    return null;
  }
};
