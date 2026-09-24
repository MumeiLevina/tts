"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { productStyles, WardrobeProduct } from "../../lib/product-wardrobe";
import { useWardrobe } from "./WardrobeProvider";
import styles from "./PersonalWardrobe.module.css";

type CatalogProduct = { id: string; name: string; image: string; category?: string; style?: string; tags?: unknown; price?: number; active?: boolean; variants?: { color: string; colorHex?: string; stock: number }[] };
export default function AddToWardrobeButton({ product, compact = false }: { product: CatalogProduct; compact?: boolean }) {
  const { items, status, pending, setSaved, refresh } = useWardrobe();
  const [error, setError] = useState("");
  const saved = items.some(i => i.productId === product.id);
  const busy = pending.includes(product.id);
  const title = `${saved ? "Bỏ khỏi tủ đồ:" : "Thêm vào tủ đồ:"} ${product.name}`;
  if (status === "guest") return <a className={`${styles.heart} ${compact ? styles.compact : ""}`} href="/auth/login" title="Đăng nhập để thêm vào tủ đồ" aria-label={`Đăng nhập để lưu ${product.name}`}><Heart size={18} />{!compact && "Đăng nhập để lưu"}</a>;
  async function toggle() {
    setError("");
    const metadata: WardrobeProduct = { id: product.id, name: product.name, category: product.category || "", imageUrl: product.image,
      style: product.style || "", styles: productStyles(product.style || ""), tags: Array.isArray(product.tags) ? product.tags.filter(t => typeof t === "string") : [],
      colors: Array.from(new Map((product.variants || []).map(v => [v.colorHex || "", { name: v.color, hex: (v.colorHex || "").toLowerCase() }])).values()),
      price: product.price || 0, active: product.active !== false, inStock: !!product.variants?.some(v => v.stock > 0), isCombo: false };
    try { await setSaved(metadata, !saved); } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu sản phẩm."); }
  }
  return <span className={styles.saveControl}>
    <button type="button" className={`${styles.heart} ${compact ? styles.compact : ""}`} title={title} aria-label={title} aria-pressed={saved} aria-busy={busy} disabled={status !== "ready" || busy} onClick={e => { e.stopPropagation(); void toggle(); }}><Heart size={18} fill={saved ? "currentColor" : "none"} />{!compact && (saved ? "Đã lưu vào tủ đồ" : "Thêm vào tủ đồ")}</button>
    {error && <span role="alert" className={styles.inlineError}>{error}</span>}
    {status === "error" && <button className={styles.retrySmall} onClick={() => void refresh()}>Tải lại tủ đồ</button>}
  </span>;
}
