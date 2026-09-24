"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/client/api";

type Mode = "login" | "register" | "forgot" | "reset";
const copy = {
  login: { title: "Chào mừng trở lại", subtitle: "Đăng nhập để giữ giỏ hàng, bộ phối và lịch sử đơn trên mọi thiết bị.", submit: "Đăng nhập" },
  register: { title: "Tạo tài khoản", subtitle: "Lưu phong cách và tiếp tục mua sắm ở bất kỳ thiết bị nào.", submit: "Đăng ký" },
  forgot: { title: "Quên mật khẩu", subtitle: "Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.", submit: "Gửi liên kết" },
  reset: { title: "Đặt lại mật khẩu", subtitle: "Chọn mật khẩu mới có ít nhất 8 ký tự.", submit: "Cập nhật mật khẩu" }
} satisfies Record<Mode, { title: string; subtitle: string; submit: string }>;

export default function AuthForm({ mode, token = "" }: { mode: Mode; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [developmentToken, setDevelopmentToken] = useState("");
  useEffect(() => {
    if (mode === "reset" && token && window.location.search) window.history.replaceState({}, "", "/auth/reset");
  }, [mode, token]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    if ((mode === "register" || mode === "reset") && password !== String(form.get("confirmPassword") || "")) {
      setError("Mật khẩu xác nhận chưa khớp."); return;
    }
    const endpoint = mode === "forgot" ? "forgot-password" : mode === "reset" ? "reset-password" : mode;
    const payload = mode === "forgot" ? { email: form.get("email") }
      : mode === "reset" ? { token, password }
      : mode === "register" ? { name: form.get("name"), email: form.get("email"), password }
      : { email: form.get("email"), password };
    setBusy(true); setError(""); setMessage(""); setDevelopmentToken("");
    try {
      const result = await api<{ message?: string; developmentToken?: string }>("auth/" + endpoint, { method: "POST", body: JSON.stringify(payload) });
      if (mode === "login" || mode === "register") { window.location.href = "/"; return; }
      if (mode === "reset") { setMessage(result.message || "Đã cập nhật mật khẩu."); return; }
      setMessage(result.message || "Hãy kiểm tra email của bạn.");
      if (result.developmentToken) setDevelopmentToken(result.developmentToken);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể xử lý yêu cầu."); }
    finally { setBusy(false); }
  }
  const content = copy[mode];
  return <main className="auth-page">
    <a className="auth-brand" href="/"><i /> fitcraft</a>
    <section className="auth-card">
      <div className="auth-card-heading"><h1>{content.title}</h1><p>{content.subtitle}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === "register" && <label>Họ và tên<input name="name" autoComplete="name" minLength={2} maxLength={80} required autoFocus /></label>}
        {(mode === "login" || mode === "register" || mode === "forgot") && <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required autoFocus={mode !== "register"} /></label>}
        {(mode === "login" || mode === "register" || mode === "reset") && <label>Mật khẩu<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={128} required autoFocus={mode === "reset"} /></label>}
        {(mode === "register" || mode === "reset") && <label>Xác nhận mật khẩu<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label>}
        {mode === "reset" && !token && <p role="alert" className="commerce-error">Liên kết đặt lại mật khẩu không hợp lệ.</p>}
        {error && <p role="alert" className="commerce-error">{error}</p>}
        {message && <p role="status" className="auth-success">{message}</p>}
        <button className="cta-primary auth-submit" type="submit" disabled={busy || (mode === "reset" && !token)}>{busy ? "Đang xử lý…" : content.submit}</button>
      </form>
      {developmentToken && <div className="auth-dev-link">
        <strong>Môi trường phát triển</strong>
        <p>Chưa cấu hình gửi email. Dùng liên kết một lần bên dưới để kiểm tra:</p>
        <a href={"/auth/reset?token=" + encodeURIComponent(developmentToken)}>Đặt lại mật khẩu</a>
      </div>}
      <div className="auth-links">
        {mode === "login" && <><a href="/auth/forgot">Quên mật khẩu?</a><span>Chưa có tài khoản? <a href="/auth/register">Đăng ký</a></span></>}
        {mode === "register" && <span>Đã có tài khoản? <a href="/auth/login">Đăng nhập</a></span>}
        {(mode === "forgot" || mode === "reset") && <a href="/auth/login">← Quay lại đăng nhập</a>}
      </div>
    </section>
  </main>;
}
