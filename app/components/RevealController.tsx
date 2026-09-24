"use client";
import { useEffect } from "react";

export default function RevealController() {
  useEffect(() => {
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
      observer.observe(element);
    };
    const register = (root: ParentNode = document) => root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(observe);
    register();
    // Next.js can stream page content after the root layout has hydrated.
    const mutations = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof HTMLElement) {
        if (node.matches("[data-reveal]")) observe(node);
        register(node);
      }
    })));
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { mutations.disconnect(); observer.disconnect(); };
  }, []);
  return null;
}
