"use client";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../../../lib/client/api";

type User = { id: string; name: string; email: string; role: string };
export default function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const result = await api<{ user: User }>("auth/login", { method: "POST", body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      if (result.user.role !== "ADMIN") {
        await api("auth/logout", { method: "POST" });
        setError("Tài khoản này không có quyền quản trị.");
        return;
      }
      window.location.href = "/admin";
    } catch (error) { setError(error instanceof Error ? error.message : "Không thể đăng nhập."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page admin-login-page">
    <a className="auth-brand" href="/"><i /> fitcraft</a>
    <section className="auth-card">
      <div className="admin-login-icon"><ShieldCheck size={28} /></div>
      <div className="auth-card-heading"><h1>Quản trị FitCraft</h1><p>Đăng nhập bằng tài khoản đã được cấp quyền ADMIN.</p></div>
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input type="email" name="email" autoComplete="username" required autoFocus /></label>
        <label>Mật khẩu<input type="password" name="password" autoComplete="current-password" minLength={8} maxLength={128} required /></label>
        {error && <p role="alert" className="commerce-error">{error}</p>}
        <button className="cta-primary auth-submit" disabled={busy}>{busy ? "Đang kiểm tra…" : "Đăng nhập quản trị"}</button>
      </form>
      <div className="auth-links"><a href="/auth/forgot">Quên mật khẩu?</a><a href="/">← Về trang mua sắm</a></div>
    </section>
  </main>;
}

