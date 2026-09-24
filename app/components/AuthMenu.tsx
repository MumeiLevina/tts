"use client";
import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { api } from "../../lib/client/api";

type User = { id: string; name: string; email: string; role: string };
export default function AuthMenu() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    api<{ user: User | null }>("auth/me").then(data => setUser(data.user)).catch(() => setUser(null));
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  async function logout() {
    try {
      await api("auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setOpen(false);
    }
  }
  if (user === undefined) return <div className="auth-menu-placeholder" aria-hidden="true" />;
  if (!user) return <a className="auth-login-link" href="/auth/login"><LogIn size={16} /> Đăng nhập</a>;
  const initials = user.name.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join("").toUpperCase();
  return <div className="auth-menu" ref={root}>
    <button className="avatar-badge" title={user.name} aria-label={"Mở tài khoản " + user.name} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      {initials || <UserRound size={16} />}
    </button>
    {open && <div className="auth-menu-popover">
      <strong>{user.name}</strong>
      <span>{user.email}</span>
      {user.role === "ADMIN" && <a href="/admin">Trang quản trị</a>}
      <a href="/orders">Đơn hàng của tôi</a>
      <a href="/wardrobe">Tủ đồ của tôi</a>
      <button onClick={logout}><LogOut size={15} /> Đăng xuất</button>
    </div>}
  </div>;
}
