import { FC, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/services/api";

export const LoginForm: FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // 超时保护：后端命令若 panic/无响应，不让按钮永远卡在「登录中…」
      const result = await Promise.race([
        api.login(username, password),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("后端无响应（15 秒超时），请查看终端日志")), 15000),
        ),
      ]);
      if (result.success && result.token) {
        // 存储 token 和用户信息
        localStorage.setItem("gc_token", result.token);
        localStorage.setItem("gc_user", JSON.stringify(result.user));
        // 跳转到主界面
        navigate("/", { replace: true });
      } else {
        setError(result.message || "登录失败");
      }
    } catch (err: any) {
      setError(err?.message || "登录失败，请检查后端是否启动");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg, #0088CC 0%, #25D366 100%)" }}>
      <div className="bg-white rounded-2xl p-12 w-[400px] shadow-2xl">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-[#25D366] mx-auto mb-6 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24">
            <path fill="white" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        </div>

        <h1 className="text-[24px] font-bold text-[#1A1A1A] text-center mb-1">Global Chats</h1>
        <p className="text-[#888] text-[14px] text-center mb-7">多平台聚合聊天系统 - 业务员登录</p>

        {/* 用户名 */}
        <div className="mb-4">
          <label className="block text-[13px] text-[#555] mb-1.5 font-medium">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            className="w-full h-11 border-[1.5px] border-[#E0DDD6] rounded-[10px] px-3.5 text-[14px] outline-none focus:border-[#0088CC] transition-colors"
          />
        </div>

        {/* 密码 */}
        <div className="mb-4">
          <label className="block text-[13px] text-[#555] mb-1.5 font-medium">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full h-11 border-[1.5px] border-[#E0DDD6] rounded-[10px] px-3.5 text-[14px] outline-none focus:border-[#0088CC] transition-colors"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-2.5 bg-[#FFEBEB] border border-[#FF3B30] rounded-lg text-[#FF3B30] text-[12px] text-center">
            {error}
          </div>
        )}

        {/* 登录按钮 */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-[46px] border-none rounded-[10px] bg-[#0088CC] text-white text-[16px] font-medium cursor-pointer mt-2 hover:bg-[#0077B5] transition-colors disabled:opacity-50"
        >
          {loading ? "登录中..." : "登 录"}
        </button>

        {/* 账号提示：密码已改为真 bcrypt 校验，不再是「123456 万能密码」 */}
        <p className="text-[#AAA] text-[12px] text-center mt-4">
          管理员 admin | 测验账号 lisi / 123456
        </p>
      </div>
    </div>
  );
};
