"use client";
import { useLayoutEffect } from "react";

export default function RevealController() {
  useLayoutEffect(() => {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(element => element.dataset.visible = "true");
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { (entry.target as HTMLElement).dataset.visible = "true"; observer.unobserve(entry.target); }
    }), { threshold: .01, rootMargin: "0px 0px -6%" });
    const registered = new WeakSet<Element>();
    const observe = (element: HTMLElement) => {
      if (registered.has(element)) return;
      registered.add(element);
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.04 && rect.bottom > 0) element.dataset.visible = "true";
      else observer.observe(element);
    };
    const register = (root: ParentNode = document) => root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(observe);
    register();
    document.documentElement.classList.add("reveal-ready");

    const nav = document.querySelector<HTMLElement>(".top");
    let lastY = window.scrollY;
    let frame = 0;
    const updateNav = () => {
      const nextY = window.scrollY;
      if (nav) nav.dataset.compact = String(nextY > 90 && nextY > lastY);
      lastY = nextY;
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(updateNav); };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Next.js can stream page content after the root layout has hydrated.
    const mutations = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) {
        if (node.matches("[data-reveal]")) observe(node);
        register(node);
      }
    })));
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { document.documentElement.classList.remove("reveal-ready"); window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); mutations.disconnect(); observer.disconnect(); };
  }, []);
  return null;
}
