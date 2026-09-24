"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { SavedProduct, WardrobeProduct } from "../../lib/product-wardrobe";

export class WardrobeRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function wardrobeApi<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch("/api/wardrobe" + path, { ...init, credentials: "same-origin", cache: "no-store", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new WardrobeRequestError(data.error?.message || "Không thể cập nhật tủ đồ. Vui lòng thử lại.", response.status);
  return data as T;
}
type ContextValue = {
  items: SavedProduct[]; status: "loading" | "guest" | "ready" | "error"; error: string;
  pending: string[]; revision: number; refresh: () => Promise<void>;
  setSaved: (product: WardrobeProduct, saved: boolean) => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);
export function useWardrobe() { const value = useContext(Context); if (!value) throw new Error("WardrobeProvider is required"); return value; }

export default function WardrobeProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedProduct[]>([]);
  const [status, setStatus] = useState<ContextValue["status"]>("loading");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const itemsRef = useRef<SavedProduct[]>([]);
  const locks = useRef(new Set<string>());
  const version = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const deferredRefresh = useRef(false);
  const update = useCallback((next: SavedProduct[]) => { itemsRef.current = next; setItems(next); }, []);

  const refresh = useCallback(async () => {
    if (locks.current.size) { deferredRefresh.current = true; return; }
    const requestVersion = ++version.current;
    try {
      const result = await wardrobeApi<{ items: SavedProduct[] }>();
      if (requestVersion !== version.current) return;
      update(result.items); setStatus("ready"); setError(""); setRevision(v => v + 1);
    } catch (e) {
      if (requestVersion !== version.current) return;
      if (e instanceof WardrobeRequestError && e.status === 401) { update([]); setStatus("guest"); setError(""); }
      else { setStatus("error"); setError(e instanceof Error ? e.message : "Không thể tải tủ đồ."); }
    }
  }, [update]);
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("fitcraft-product-wardrobe");
      channel.current.onmessage = onFocus;
    }
    return () => { ++version.current; window.removeEventListener("focus", onFocus); channel.current?.close(); };
  }, [refresh]);

  const setSaved = useCallback(async (product: WardrobeProduct, saved: boolean) => {
    if (locks.current.has(product.id)) return;
    if (status !== "ready") throw new Error(status === "guest" ? "Đăng nhập để sử dụng tủ đồ cá nhân." : "Hãy tải lại tủ đồ rồi thử lại.");
    const before = itemsRef.current.find(i => i.productId === product.id);
    locks.current.add(product.id); setPending(Array.from(locks.current)); ++version.current;
    // Optimistic state is shared by catalog, product details, and wardrobe page.
    update(saved ? [{ productId: product.id, createdAt: new Date().toISOString(), product }, ...itemsRef.current.filter(i => i.productId !== product.id)] : itemsRef.current.filter(i => i.productId !== product.id));
    setRevision(v => v + 1);
    try {
      if (saved) {
        const result = await wardrobeApi<{ saved: boolean; item: SavedProduct }>("/toggle", { method: "POST", body: JSON.stringify({ productId: product.id, saved: true }) });
        update([result.item, ...itemsRef.current.filter(i => i.productId !== product.id)]);
      } else await wardrobeApi("/" + encodeURIComponent(product.id), { method: "DELETE" });
      channel.current?.postMessage("changed");
    } catch (e) {
      // Roll back this product only: unrelated concurrent saves must survive.
      update(before ? [before, ...itemsRef.current.filter(i => i.productId !== product.id)] : itemsRef.current.filter(i => i.productId !== product.id));
      if (e instanceof WardrobeRequestError && e.status === 401) { update([]); setStatus("guest"); }
      throw e;
    } finally {
      locks.current.delete(product.id); setPending(Array.from(locks.current)); setRevision(v => v + 1);
      if (!locks.current.size && deferredRefresh.current) { deferredRefresh.current = false; void refresh(); }
    }
  }, [status, refresh, update]);
  return <Context.Provider value={{ items, status, error, pending, revision, refresh, setSaved }}>{children}</Context.Provider>;
}
