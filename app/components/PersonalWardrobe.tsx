"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Heart, RefreshCw, Shirt, Sparkles, Trash2 } from "lucide-react";
import { money } from "../../lib/client/api";
import { normalizeSearch, wardrobeCategories } from "../../lib/wardrobe";
import { RecommendationResult, slotNames, styleNames } from "../../lib/product-wardrobe";
import { useWardrobe, wardrobeApi } from "./WardrobeProvider";
import styles from "./PersonalWardrobe.module.css";

function GarmentImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <div className={styles.fallback}><Shirt size={32} /><span>Ảnh đang cập nhật</span></div> : <img src={src} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}
export default function PersonalWardrobe() {
  const wardrobe = useWardrobe();
  const [tab, setTab] = useState<"items" | "outfits">("items");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [sort, setSort] = useState("newest");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [outfitError, setOutfitError] = useState("");
  const [request, setRequest] = useState({ seed: "default", random: false, exclude: "" });
  const requestVersion = useRef(0);
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (tab !== "outfits" || wardrobe.status !== "ready" || wardrobe.pending.length) { setResult(null); return; }
    const controller = new AbortController(), version = ++requestVersion.current;
    setOutfitLoading(true); setOutfitError(""); setResult(null);
    const params = new URLSearchParams({ seed: request.seed, random: String(request.random), limit: "4" });
    if (request.exclude) params.set("exclude", request.exclude);
    wardrobeApi<RecommendationResult>("/recommendations?" + params, { signal: controller.signal }).then(data => {
      if (version === requestVersion.current) setResult(data);
    }).catch(e => { if (!controller.signal.aborted && version === requestVersion.current) setOutfitError(e.message || "Không thể tạo gợi ý."); })
      .finally(() => { if (version === requestVersion.current) setOutfitLoading(false); });
    return () => { controller.abort(); ++requestVersion.current; };
  }, [tab, wardrobe.revision, wardrobe.status, wardrobe.pending.length, request]);

  const colors = useMemo(() => Array.from(new Map(wardrobe.items.flatMap(i => i.product.colors.map(c => [c.hex, c] as const))).values()).sort((a, b) => a.name.localeCompare(b.name, "vi")), [wardrobe.items]);
  const visible = useMemo(() => {
    const items = wardrobe.items.filter(({ product: p }) => (!category || p.category === category) && (!color || p.colors.some(c => c.hex === color)) && normalizeSearch(p.name).includes(normalizeSearch(query)));
    return items.sort((a, b) => {
      if (sort === "name") return a.product.name.localeCompare(b.product.name, "vi");
      if (sort.startsWith("price")) return (a.product.price - b.product.price) * (sort === "price_asc" ? 1 : -1);
      return (Date.parse(b.createdAt) - Date.parse(a.createdAt)) * (sort === "oldest" ? -1 : 1);
    });
  }, [wardrobe.items, query, category, color, sort]);

  return <section id="closet" className={`section ${styles.wardrobe}`} aria-labelledby={id + "-title"} data-reveal>
    <header className={styles.header}><div><span className="eyebrow-label">TỦ ĐỒ CÁ NHÂN</span><h2 id={id + "-title"}>Gu của bạn,<br/><em>được lưu lại.</em></h2><p>Chạm yêu thích. Giữ lại phong cách. Khám phá những cách phối mới từ chính lựa chọn của bạn.</p></div><a className={styles.primary} href="/#products">Khám phá sản phẩm <ArrowRight size={17} /></a></header>
    <p className={styles.hint}>Sản phẩm yêu thích được lưu theo tài khoản, không cần nhập lại thông tin. <a href="/wardrobe/manual">Xem đồ đã thêm thủ công</a></p>
    <div role="tablist" aria-label="Nội dung tủ đồ" className={styles.tabs}>{(["items", "outfits"] as const).map((value, index) => <button key={value} ref={el => { tabRefs.current[index] = el; }} role="tab" id={id + "-" + value} aria-controls={id + "-panel"} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index; setTab(next === 0 ? "items" : "outfits"); tabRefs.current[next]?.focus(); }
    }}>{value === "items" ? <Heart size={17} /> : <Sparkles size={17} />}{value === "items" ? `Đã lưu (${wardrobe.items.length})` : "Gợi ý phối đồ"}</button>)}</div>
    <div role="tabpanel" id={id + "-panel"} aria-labelledby={id + "-" + tab} tabIndex={0}>
      {wardrobe.status === "loading" ? <div className={styles.empty} role="status">Đang mở tủ đồ…</div>
        : wardrobe.status === "guest" ? <div className={styles.empty}><Heart size={36} /><h3>Giữ những món đồ bạn yêu thích</h3><p>Đăng nhập để lưu sản phẩm và nhận gợi ý phối đồ của riêng bạn.</p><a className={styles.primary} href="/auth/login">Đăng nhập</a></div>
        : wardrobe.status === "error" ? <div className={styles.empty}><p role="alert">{wardrobe.error}</p><button className={styles.secondary} onClick={() => void wardrobe.refresh()}>Thử tải lại</button></div>
        : tab === "items" ? <>
          <div className={styles.filters}>
            <input type="search" aria-label="Tìm sản phẩm đã lưu" placeholder="Tìm món đồ yêu thích…" value={query} onChange={e => setQuery(e.target.value)} />
            <select aria-label="Lọc danh mục tủ đồ" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả danh mục</option>{Object.entries(wardrobeCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            <select aria-label="Lọc màu tủ đồ" value={color} onChange={e => setColor(e.target.value)}><option value="">Tất cả màu</option>{colors.map(c => <option key={c.hex} value={c.hex}>{c.name} ({c.hex})</option>)}{color && !colors.some(c => c.hex === color) && <option value={color}>{color}</option>}</select>
            <select aria-label="Sắp xếp tủ đồ" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Mới lưu nhất</option><option value="oldest">Lưu lâu nhất</option><option value="name">Tên A đến Z</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option></select>
            {(query || category || color) && <button className={styles.secondary} onClick={() => { setQuery(""); setCategory(""); setColor(""); }}>Xóa bộ lọc</button>}
          </div>
          <p role="status" className={styles.notice}>{notice || `${visible.length} / ${wardrobe.items.length} sản phẩm`}</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!visible.length ? <div className={styles.empty}><Shirt size={38} /><h3>{wardrobe.items.length ? "Không có món phù hợp bộ lọc" : "Tủ đồ đang chờ phong cách của bạn"}</h3><p>{wardrobe.items.length ? "Thử thay đổi màu, danh mục hoặc từ khóa." : "Bấm trái tim trên sản phẩm để lưu vào đây. Thêm áo, quần và giày để bắt đầu phối đồ."}</p></div>
            : <div className={styles.grid}>{visible.map(item => <article key={item.productId} className={styles.card}>
              <div className={styles.image}><GarmentImage src={item.product.imageUrl} name={item.product.name} /><span className={styles.badge}>{wardrobeCategories[item.product.category as keyof typeof wardrobeCategories] || item.product.category}</span></div>
              <div className={styles.body}><h3>{item.product.name}</h3><strong>{money(item.product.price)}</strong><div className={styles.colors}>{item.product.colors.map(c => <span key={c.hex} title={c.name}><i style={{ backgroundColor: /^#[\da-f]{6}$/i.test(c.hex) ? c.hex : "#ddd" }} />{c.name}</span>)}</div>
                <div className={styles.tags}>{item.product.styles.map(s => <span key={s}>{styleNames[s] || s}</span>)}{item.product.tags.map(t => <span key={t}>{t}</span>)}</div>
                {!item.product.active ? <p className={styles.hint}>Ngừng bán · Không dùng trong gợi ý</p> : !item.product.inStock && <p className={styles.hint}>Tạm hết hàng · Vẫn có thể phối tham khảo</p>}
                {item.product.isCombo && <p className={styles.hint}>Bộ phối của shop · Không ghép như món lẻ</p>}
                <button className={styles.remove} disabled={wardrobe.pending.includes(item.productId)} aria-label={`Bỏ lưu ${item.product.name}`} onClick={async () => { setError(""); setNotice(""); try { await wardrobe.setSaved(item.product, false); setNotice(`Đã bỏ lưu ${item.product.name}.`); } catch (e) { setError(e instanceof Error ? e.message : "Không thể bỏ lưu."); } }}><Trash2 size={15} />Bỏ lưu</button>
              </div>
            </article>)}</div>}
        </> : <>
          <div className={styles.outfitHeader}><div><h3>Mặc gì từ tủ đồ hôm nay?</h3><p>Phối theo nhóm đồ, màu sắc và phong cách. Giá hiển thị là giá tham khảo hiện tại của shop.</p></div><button className={styles.primary} disabled={outfitLoading || !!wardrobe.pending.length} onClick={() => setRequest({ seed: crypto.randomUUID(), random: true, exclude: result?.outfits.map(o => o.id).join(",") || "" })}><RefreshCw size={17} />Tạo gợi ý mới</button></div>
          {outfitLoading || wardrobe.pending.length ? <div role="status" className={styles.empty}>Đang tìm những món hợp nhau…</div> : outfitError ? <div className={styles.empty}><p role="alert" className={styles.error}>{outfitError}</p><button className={styles.secondary} onClick={() => setRequest(previous => ({ ...previous }))}>Thử tạo lại</button></div> : result && <>
            <p role="status" className={styles.hint}>{result.message}</p>
            {!result.outfits.length && <div className={styles.empty}><Shirt size={38} /><h3>Thêm lựa chọn, thêm cách phối</h3><a className={styles.secondary} href="/#products">Tìm thêm món đồ</a></div>}
            <div className={styles.outfits}>{result.outfits.map((outfit, index) => <article className={styles.outfit} key={outfit.id}>
              <header><h3>Bộ phối {index + 1}</h3><span>{outfit.score}/100 · điểm quy tắc</span></header>
              <div className={styles.pieces}>{outfit.pieces.map(p => <div key={p.product.id} className={styles.piece}><div className={styles.pieceImage}><GarmentImage src={p.product.imageUrl} name={p.product.name} /></div><span>{slotNames[p.slot]}</span><h4>{p.product.name}</h4><small><i style={{ backgroundColor: p.color.hex }} />{p.color.name}</small>{!p.product.inStock && <small>Tạm hết hàng</small>}</div>)}</div>
              <div className={styles.reasons}>{outfit.reasons.map(reason => <span key={reason}>{reason}</span>)}</div><p className={styles.total}>Tổng tham khảo <strong>{money(outfit.totalPrice)}</strong></p>
            </article>)}</div>
          </>}
        </>}
    </div>
  </section>;
}
