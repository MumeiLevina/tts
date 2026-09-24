"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("fitcraft-theme") as Theme | null;
    const initial = stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = initial; setTheme(initial);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; localStorage.setItem("fitcraft-theme", next); setTheme(next);
  }
  return <button className="theme-toggle" type="button" onClick={toggle} aria-label={theme === "dark" ? "Dùng giao diện sáng" : "Dùng giao diện tối"} title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}>
    {theme === "dark" ? <Sun size={17} strokeWidth={1.6}/> : <Moon size={17} strokeWidth={1.6}/>}<span>{theme === "dark" ? "Sáng" : "Tối"}</span>
  </button>;
}
