"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Shirt, Trash2, X } from "lucide-react";
import { api } from "../../lib/client/api";
import { colorLabel, normalizeColor, normalizeSearch, wardrobeCategories, wardrobeColors, wardrobeTags, TagKind, WardrobeItemView } from "../../lib/wardrobe";
import styles from "./DigitalWardrobe.module.css";

const emptyForm = () => ({ name: "", category: "TOP" as WardrobeItemView["category"], color: "#000000", imageUrl: "", season: [] as string[], style: [] as string[], occasion: [] as string[] });
const tagTitles = { season: "Mùa", style: "Phong cách", occasion: "Dịp sử dụng" };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";

function GarmentImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <div className={styles.imageFallback}><Shirt size={40} /><span>Ảnh chưa khả dụng</span></div>
    : <img src={src} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export default function DigitalWardrobe() {
  const [items, setItems] = useState<WardrobeItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<WardrobeItemView | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const mutation = useRef(false);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setLoadError("");
    try {
      const data = await api<{ items: WardrobeItemView[] }>("wardrobe/items");
      if (version === loadVersion.current) setItems(data.items);
    } catch (e) { if (version === loadVersion.current) setLoadError(errorMessage(e)); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { ++loadVersion.current; }; }, [load]);
  useEffect(() => { if (formOpen) nameInput.current?.focus(); }, [formOpen]);
  useEffect(() => {
    if (pendingDelete && !dialog.current?.open) dialog.current?.showModal();
    if (!pendingDelete && dialog.current?.open) dialog.current.close();
  }, [pendingDelete]);

  // Instant filtering is inexpensive for the server-enforced 200-item limit.
  const visible = useMemo(() => items.filter(item =>
    (!category || item.category === category) && (!color || normalizeColor(item.color) === color) && normalizeSearch(item.name).includes(normalizeSearch(query))
  ), [items, query, category, color]);
  const colors = useMemo(() => Array.from(new Set(items.map(i => normalizeColor(i.color)))).sort(), [items]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.current) return;
    if (!form.name.trim()) { setError("Vui lòng nhập tên món đồ."); nameInput.current?.focus(); return; }
    mutation.current = true; setSaving(true); setError(""); setNotice("");
    try {
      const data = await api<{ item: WardrobeItemView }>("wardrobe/items", { method: "POST", body: JSON.stringify({ ...form, name: form.name.trim(), imageUrl: form.imageUrl.trim() }) });
      setItems(previous => [data.item, ...previous]);
      setForm(emptyForm()); setFormOpen(false);
      setQuery(""); setCategory(""); setColor("");
      setNotice(`Đã thêm “${data.item.name}” vào tủ đồ.`);
    } catch (e) { setError(errorMessage(e)); }
    finally { mutation.current = false; setSaving(false); }
  }
  async function confirmDelete() {
    if (!pendingDelete || mutation.current) return;
    mutation.current = true; setDeleting(true); setDeleteError(""); setNotice("");
    try {
      await api(`wardrobe/items/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      setItems(previous => previous.filter(item => item.id !== pendingDelete.id));
      setNotice(`Đã xóa “${pendingDelete.name}”.`); setPendingDelete(null);
    } catch (e) { setDeleteError(errorMessage(e)); }
    finally { mutation.current = false; setDeleting(false); }
  }
  function toggleTag(kind: TagKind, value: string) {
    setForm(previous => ({ ...previous, [kind]: previous[kind].includes(value) ? previous[kind].filter(v => v !== value) : [...previous[kind], value] }));
  }

  return <section className={`section ${styles.wardrobe}`} id="closet" aria-labelledby="wardrobe-title">
    <header className={styles.header}>
      <div><span className="eyebrow-label">DIGITAL WARDROBE</span><h2 id="wardrobe-title">Tủ đồ của bạn.</h2>
        <p>Lưu những món đồ yêu thích, tìm lại thật nhanh và sẵn sàng cho những cách phối mới.</p></div>
      <button className={styles.primary} disabled={loading || !!loadError || items.length >= 200 || saving} aria-expanded={formOpen} aria-controls="wardrobe-form" onClick={() => { setFormOpen(v => !v); setError(""); }}>
        {formOpen ? <X size={18} /> : <Plus size={18} />}{formOpen ? "Đóng form" : "Thêm món đồ"}
      </button>
    </header>
    <p className={styles.hint}>Tủ đồ khách được lưu theo phiên trình duyệt. <a href="/auth/login">Đăng nhập</a> để gắn tủ đồ với tài khoản.</p>
    <p role="status" className={styles.notice}>{notice}</p>
    {items.length >= 200 && <p role="status">Tủ đồ đã đủ 200 món. Xóa bớt món trước khi thêm mới.</p>}

    {formOpen && <form id="wardrobe-form" className={styles.form} onSubmit={submit}>
      <h3>Thêm một món đồ</h3>
      <fieldset disabled={saving} className={styles.fields}>
        <label>Tên món đồ *<input ref={nameInput} required maxLength={150} value={form.name} placeholder="Ví dụ: Áo sơ mi linen trắng" onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Danh mục *<select aria-label="Danh mục *" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as WardrobeItemView["category"] })}>
          {Object.entries(wardrobeCategories).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
        </select></label>
        <label>Màu sắc *<select aria-label="Màu sắc *" value={wardrobeColors.some(c => c.hex === form.color) ? form.color : "custom"} onChange={e => { if (e.target.value !== "custom") setForm({ ...form, color: e.target.value }); else setForm({ ...form, color: "#789abc" }); }}>
          {wardrobeColors.map(c => <option key={c.hex} value={c.hex}>{c.name}</option>)}<option value="custom">Màu tùy chọn</option>
        </select></label>
        <label>Mã màu tùy chọn<div className={styles.colorInput}><input aria-label="Chọn mã màu" type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /><span>{form.color}</span></div></label>
        <label className={styles.wide}>Đường dẫn ảnh *<input type="url" required maxLength={2048} pattern="https://.*" title="Dùng đường dẫn ảnh bắt đầu bằng https://" placeholder="https://example.com/ao-so-mi.jpg" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
          <span className={styles.hint}>Dán đường dẫn ảnh HTTPS. Ảnh được hiển thị từ nguồn bạn chọn.</span></label>
      </fieldset>
      <div className={styles.tagFields}>{(Object.keys(wardrobeTags) as TagKind[]).map(kind => <fieldset key={kind} disabled={saving}>
        <legend>{tagTitles[kind]} <small>(tùy chọn)</small></legend><div className={styles.choices}>
          {Object.entries(wardrobeTags[kind]).map(([value, title]) => <label key={value}><input type="checkbox" checked={form[kind].includes(value)} onChange={() => toggleTag(kind, value)} /><span>{title}</span></label>)}
        </div></fieldset>)}</div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button type="button" className={styles.secondary} disabled={saving} onClick={() => setFormOpen(false)}>Hủy</button><button className={styles.primary} disabled={saving}>{saving ? "Đang lưu…" : "Lưu vào tủ đồ"}</button></div>
    </form>}

    <div className={styles.filters}>
      <label className={styles.search}><Search size={18} /><input aria-label="Tìm món đồ theo tên" type="search" maxLength={150} placeholder="Tìm theo tên, có hoặc không dấu…" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <select aria-label="Lọc theo danh mục" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả danh mục</option>{Object.entries(wardrobeCategories).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select>
      <select aria-label="Lọc theo màu sắc" value={color} onChange={e => setColor(e.target.value)}><option value="">Tất cả màu sắc</option>{Array.from(new Set([...colors, ...(color ? [color] : [])])).map(c => <option key={c} value={c}>{colorLabel(c)}</option>)}</select>
      {(query || category || color) && <button className={styles.secondary} onClick={() => { setQuery(""); setCategory(""); setColor(""); }}>Xóa bộ lọc</button>}
    </div>
    {loading ? <div className={styles.empty} role="status">Đang mở tủ đồ…</div>
      : loadError ? <div className={styles.empty}><p role="alert" className={styles.error}>{loadError}</p><button className={styles.secondary} onClick={() => void load()}>Thử lại</button></div>
      : <><p className={styles.count} role="status">{visible.length} / {items.length} món đồ</p>
        {visible.length ? <div className={styles.grid}>{visible.map(item => <article className={styles.card} key={item.id}>
          <div className={styles.image}><GarmentImage src={item.imageUrl} name={item.name} /><span className={styles.category}>{wardrobeCategories[item.category] || item.category}</span></div>
          <div className={styles.cardBody}><h3>{item.name}</h3><p className={styles.color}><span style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "#ccc" }} />{colorLabel(item.color)}</p>
            <div className={styles.tags}>{(Object.keys(wardrobeTags) as TagKind[]).flatMap(kind => item[kind].map(value => <span key={`${kind}-${value}`}>{(wardrobeTags[kind] as Record<string, string>)[value] || value}</span>))}</div>
            <button className={styles.delete} disabled={saving || deleting} aria-label={`Xóa ${item.name}`} onClick={() => { setDeleteError(""); setPendingDelete(item); }}><Trash2 size={15} /> Xóa món đồ</button>
          </div>
        </article>)}</div> : <div className={styles.empty}><Shirt size={40} /><h3>{items.length ? "Chưa tìm thấy món phù hợp" : "Một tủ đồ mới, bắt đầu từ bạn"}</h3><p>{items.length ? "Thử đổi từ khóa hoặc xóa bộ lọc." : "Thêm món đồ đầu tiên để lưu lại phong cách của riêng mình."}</p>{!items.length && <button className={styles.primary} onClick={() => setFormOpen(true)}><Plus size={18} /> Thêm món đầu tiên</button>}</div>}
      </>}

    {/* Native dialog provides keyboard focus trapping and restores focus on close. */}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="wardrobe-delete-title" aria-describedby="wardrobe-delete-description" onCancel={event => { if (deleting) event.preventDefault(); else setPendingDelete(null); }} onClose={() => { if (!deleting) setPendingDelete(null); }}>
      <h3 id="wardrobe-delete-title">Xóa món đồ?</h3><p id="wardrobe-delete-description">Bạn muốn xóa “{pendingDelete?.name}” khỏi tủ đồ? Thao tác này không thể hoàn tác.</p>
      {deleteError && <p role="alert" className={styles.error}>{deleteError}</p>}
      <div className={styles.actions}><button autoFocus className={styles.secondary} disabled={deleting} onClick={() => setPendingDelete(null)}>Giữ lại</button><button className={styles.danger} disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "Đang xóa…" : "Xóa món đồ"}</button></div>
    </dialog>
  </section>;
}
