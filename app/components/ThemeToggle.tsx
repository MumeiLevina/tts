"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
type TransitionDocument = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const stored = localStorage.getItem("fitcraft-theme") as Theme | null;
    const initial = (document.documentElement.dataset.theme as Theme | undefined) || stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = initial; setTheme(initial);
  }, []);
  function toggle() {
    if (!theme) return;
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => { document.documentElement.dataset.theme = next; localStorage.setItem("fitcraft-theme", next); setTheme(next); };
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const transitionDocument = document as TransitionDocument;
    if (reducedMotion || !transitionDocument.startViewTransition || !buttonRef.current) { apply(); return; }

    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const root = document.documentElement;
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-radius", `${radius}px`);
    root.dataset.themeTransition = next;
    transitionDocument.startViewTransition(apply).finished.finally(() => {
      delete root.dataset.themeTransition;
      root.style.removeProperty("--theme-x"); root.style.removeProperty("--theme-y"); root.style.removeProperty("--theme-radius");
    });
  }
  return <button ref={buttonRef} className="theme-toggle" type="button" onClick={toggle} disabled={!theme} aria-label={theme === "dark" ? "Dùng giao diện sáng" : "Dùng giao diện tối"} title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}>
    <span key={theme} className="theme-toggle-icon" aria-hidden="true">{theme === "dark" ? <Sun size={17} strokeWidth={1.6}/> : <Moon size={17} strokeWidth={1.6}/>}</span><span>{theme === "dark" ? "Sáng" : "Tối"}</span>
  </button>;
}
