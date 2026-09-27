"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ImagePlus, Layers3, Loader2, Plus, Save, Sparkles, Upload, X } from "lucide-react";
import { api, money } from "../../../lib/client/api";
import { StudioDraft, StudioState, studioCategories } from "../../../lib/studio";

type Run = (label: string, task: () => Promise<void>) => Promise<void>;
export default function ComboStudio() {
  const [data, setData] = useState<StudioState | null>(null);
  const [queue, setQueue] = useState<{ id: string; file: File }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [brief, setBrief] = useState("Phối bộ đồ dạo phố thanh lịch, dễ mặc, màu sắc hài hòa.");
  const [budget, setBudget] = useState(2000000);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeDraft, setActiveDraft] = useState<string | null>(null);
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLElement>(null);
  const load = useCallback(async () => { setData(await api<StudioState>("admin/combo-studio")); }, []);
  useEffect(() => { load().catch(e => setError(e.message)); }, [load]);
  const run: Run = async (label, task) => {
    if (lock.current) return;
    lock.current = true; setBusy(label); setError(""); setNotice("");
    try { await task(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể xử lý yêu cầu."); }
    finally { lock.current = false; setBusy(""); }
  };
  function enqueue(files: FileList | File[]) {
    const accepted = Array.from(files);
    if (accepted.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 5 * 1024 * 1024 || f.size === 0)) { setError("Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh."); return; }
    if (queue.length + accepted.length > 12) { setError("Mỗi lượt tải tối đa 12 ảnh."); return; }
    setError(""); setQueue(prev => [...prev, ...accepted.map(file => ({ id: crypto.randomUUID(), file }))]);
  }
  async function generate(mode: "ai" | "manual") {
    await run(mode === "ai" ? "generate" : "manual", async () => {
      const result = await api<StudioState>("admin/combo-studio/generate", { method: "POST", body: JSON.stringify({ itemIds: selected, brief, budget, mode }) });
      setData(result); setActiveDraft(result.drafts[0]?.id || null);
      setNotice(mode === "ai" ? "Đã lưu gợi ý của AI. Kiểm tra thành phần, giá và số lượng trước khi mở bán." : "Đã lưu bản nháp từ các món bạn chọn.");
      results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  const selectedItems = data?.items.filter(i => selected.includes(i.id)) || [];
  const draft = data?.drafts.find(d => d.id === activeDraft);

  return <div className="studio">
    <section className="studio-hero"><div><span className="studio-eyebrow"><Sparkles size={14} /> FITCRAFT COMBO STUDIO</span><h2>Từng món đẹp.<br /><em>Một bộ phối có gu.</em></h2><p>Biến ảnh sản phẩm của shop thành những bộ đồ khách muốn mua. Bạn chọn nguyên liệu, trợ lý gợi ý cách phối.</p></div><div className="studio-steps"><span><b>01</b> Thêm ảnh từng món</span><span><b>02</b> Nhận gợi ý bộ phối</span><span><b>03</b> Duyệt & mở bán</span></div></section>
    {error && <div className="studio-message error" role="alert">{error}{!data && <button onClick={() => void run("load", load)}>Thử lại</button>}</div>}
    {notice && <div className="studio-message" role="status"><Check size={17} />{notice}</div>}
    {!data ? <p role="status">Đang tải thư viện phối đồ…</p> : <>
      {!data.aiReady && <div className="studio-connection"><Sparkles size={19} /><div><strong>Kết nối AI để nhận gợi ý từ ảnh</strong><p>AI chưa được kích hoạt. Bạn vẫn có thể tải ảnh, chọn món và tạo combo thủ công.</p><details><summary>Hướng dẫn kết nối</summary><p>Người quản trị máy chủ thêm <code>OPENAI_API_KEY</code> vào file <code>.env</code> rồi khởi động lại website. Không nhập khóa vào ảnh hoặc nội dung yêu cầu phối đồ.</p></details></div></div>}
      <div className="studio-workspace">
        <section className="studio-library"><div className="studio-section-title"><div><span className="studio-eyebrow">01 / NGUYÊN LIỆU PHỐI ĐỒ</span><h3>Thư viện của shop <small>{data.items.length} món</small></h3></div><button className="studio-small-button" disabled={!!busy} onClick={() => input.current?.click()}><Plus size={16} /> Thêm ảnh</button></div>
          <div className="studio-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) enqueue(e.dataTransfer.files); }}>
            <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Tải ảnh sản phẩm" disabled={!!busy} onChange={e => { if (e.target.files) enqueue(e.target.files); e.target.value = ""; }} />
            <button disabled={!!busy} onClick={() => input.current?.click()}><ImagePlus size={28} /><strong>Kéo ảnh vào đây hoặc chọn từ thiết bị</strong><span>Mỗi ảnh một món · JPG, PNG, WebP · Tối đa 5 MB/ảnh</span></button>
          </div>
          {!!queue.length && <div className="studio-upload-queue">{queue.map(entry => <UploadItem key={entry.id} file={entry.file} busy={!!busy} onRemove={() => setQueue(prev => prev.filter(q => q.id !== entry.id))} onSave={form => run("upload", async () => {
            const response = await fetch("/api/v1/admin/combo-studio/items", { method: "POST", credentials: "same-origin", body: form });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error?.message || "Không tải được ảnh.");
            await load(); setQueue(prev => prev.filter(q => q.id !== entry.id)); setSelected(prev => prev.length < 12 ? [...prev, result.item.id] : prev); setNotice("Đã lưu ảnh và thông tin sản phẩm vào thư viện.");
          })} />)}</div>}
          <div className="studio-library-hint"><span>{selected.length} / 12 món được chọn</span><button disabled={!!busy || !selected.length} onClick={() => setSelected([])}>Bỏ chọn tất cả</button></div>
          {!data.items.length ? <div className="studio-empty"><Layers3 size={32} /><h4>Bộ phối đầu tiên bắt đầu từ một chiếc áo</h4><p>Thêm ảnh áo, quần hoặc váy. Có thể thêm giày, túi và phụ kiện để hoàn thiện bộ đồ.</p></div> : <div className="studio-item-grid">{data.items.map(item => {
            const checked = selected.includes(item.id);
            const stock = item.variants.reduce((sum, v) => sum + v.stock, 0);
            return <label key={item.id} className={"studio-item " + (checked ? "selected" : "")}><input type="checkbox" checked={checked} disabled={!!busy || !stock || (!checked && selected.length >= 12)} onChange={() => setSelected(prev => checked ? prev.filter(id => id !== item.id) : [...prev, item.id])} /><img src={item.image} alt={item.name} loading="lazy" /><div><small>{studioCategories[item.category]}</small><strong>{item.name}</strong><span>{money(item.price)}</span><small>{item.variants[0]?.color} · {stock ? `Còn ${stock}` : "Hết hàng"}</small><small>{item.variants.map(v => `${v.size}: ${v.stock}`).join(" · ")}</small></div></label>;
          })}</div>}
        </section>
        <aside className="studio-brief"><span className="studio-eyebrow">02 / TRAO ĐỔI VỚI TRỢ LÝ</span><h3>Bạn muốn phối theo gu nào?</h3><p>Chọn áo + quần/chân váy, hoặc một váy liền. Giày, áo khoác và phụ kiện là tùy chọn; AI phối theo các món đang có và ngân sách.</p>
          <label>Yêu cầu phối đồ<textarea value={brief} maxLength={1500} disabled={!!busy} onChange={e => setBrief(e.target.value)} rows={5} /></label>
          <div className="studio-prompt-chips">{["Công sở thanh lịch", "Dạo phố tối giản", "Đi chơi cuối tuần"].map(text => <button key={text} disabled={!!busy} onClick={() => setBrief(`Phối đồ ${text.toLowerCase()}, ưu tiên màu sắc hài hòa, dễ mặc.`)}>{text}</button>)}</div>
          <label>Ngân sách tối đa mỗi bộ (₫)<input type="number" min={1000} max={100000000} step={1000} value={budget} disabled={!!busy} onChange={e => setBudget(Number(e.target.value))} /></label>
          <div className="studio-selection-summary"><span>Đã chọn <strong>{selected.length} món</strong></span><span>Tổng giá lẻ <strong>{money(selectedItems.reduce((sum, i) => sum + i.price, 0))}</strong></span></div>
          <button className="studio-primary" disabled={!!busy || selected.length < 1 || brief.trim().length < 3 || budget < 1000 || !data.aiReady} onClick={() => void generate("ai")}>{busy === "generate" ? <Loader2 size={18} className="studio-spin" /> : <Sparkles size={18} />}{busy === "generate" ? "Đang xem ảnh & phối đồ…" : "Gợi ý combo với AI"}</button>
          <button className="studio-secondary" disabled={!!busy || selected.length < 1 || selected.length > 6 || brief.trim().length < 3 || budget < 1000} onClick={() => void generate("manual")}><Layers3 size={17} />Tạo bản nháp từ các món đã chọn</button>
          <small className="studio-privacy">Khi bấm gợi ý AI, ảnh và thông tin các món đã chọn được gửi đến OpenAI để phân tích. Ảnh xem trước combo được ghép từ ảnh sản phẩm thật.</small>
          {!!busy && <p className="studio-progress" role="status">{busy === "generate" ? "Trợ lý đang phân tích các món. Quá trình có thể mất khoảng một phút." : "Đang lưu thay đổi…"}</p>}
        </aside>
      </div>
      <section ref={results} className="studio-results"><div className="studio-section-title"><div><span className="studio-eyebrow">03 / TỪ Ý TƯỞNG ĐẾN GIAN HÀNG</span><h3>Bộ phối của bạn <small>{data.drafts.length} bộ</small></h3></div></div>
        {!data.drafts.length ? <div className="studio-empty"><Sparkles size={30} /><h4>Những gợi ý sẽ xuất hiện ở đây</h4><p>Mỗi bộ có ảnh tổng hợp, danh sách món và lý do phối. Bạn quyết định bộ nào sẽ lên gian hàng.</p></div> : <div className="studio-draft-grid">{data.drafts.map(d => <button key={d.id} disabled={!!busy} onClick={() => setActiveDraft(d.id)} className={"studio-draft-card " + (d.id === activeDraft ? "active" : "")}><img src={d.image} alt={d.name} loading="lazy" /><span className="studio-draft-status">{d.productId ? "Đã mở bán" : d.engine === "openai-vision" ? "AI đề xuất · Bản nháp" : "Bản nháp thủ công"}</span><strong>{d.name}</strong><span>{d.items.length} món · {money(d.price)}</span><span className="studio-draft-open">{d.productId ? "Xem bộ phối" : "Xem & chỉnh combo"}<ArrowRight size={15} /></span></button>)}</div>}
        {draft && <DraftEditor key={draft.id} draft={draft} busy={!!busy} onClose={() => setActiveDraft(null)} onSave={(values, stocks) => run(stocks ? "publish" : "save", async () => {
          const updated = await api<StudioState>("admin/combo-studio/drafts/" + draft.id, { method: "PATCH", body: JSON.stringify(values) }); setData(updated);
          if (stocks) { setData(await api<StudioState>("admin/combo-studio/drafts/" + draft.id + "/publish", { method: "POST", body: JSON.stringify({ stocks }) })); setNotice("Đã mở bán combo. Số lượng các món đã được dành riêng cho bộ phối này."); }
          else setNotice("Đã lưu bản nháp combo.");
        })} />}
      </section>
    </>}
  </div>;
}

function UploadItem({ file, busy, onRemove, onSave }: { file: File; busy: boolean; onRemove: () => void; onSave: (form: FormData) => Promise<void> }) {
  const [preview, setPreview] = useState("");
  useEffect(() => { const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return <form className="studio-upload-item" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); form.append("image", file); void onSave(form); }}>
    <div className="studio-upload-image">{preview && <img src={preview} alt={file.name} />}<button type="button" disabled={busy} onClick={onRemove} aria-label={"Bỏ ảnh " + file.name}><X size={16} /></button></div>
    <fieldset disabled={busy}><label>Tên món<input name="name" required minLength={2} maxLength={150} defaultValue={file.name.replace(/\.[^.]+$/, "")} /></label><div className="studio-form-row"><label>Loại món<select name="category">{Object.entries(studioCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Màu sắc<input name="color" required maxLength={40} placeholder="Ví dụ: Kem" /></label></div><div className="studio-form-row"><label>Giá lẻ (₫)<input name="price" type="number" required min={1000} max={100000000} step={1000} /></label><label>Tồn kho mỗi size<input name="stock" type="number" required min={1} max={10000} defaultValue={5} /></label></div><label>Size, cách nhau dấu phẩy<input name="sizes" required maxLength={100} defaultValue="S, M, L" /><small>Dùng F cho phụ kiện một kích cỡ. Đây là kho món lẻ để dành cho combo.</small></label><button className="studio-small-button" type="submit"><Upload size={15} /> Lưu món vào thư viện</button></fieldset>
  </form>;
}

function DraftEditor({ draft, busy, onClose, onSave }: { draft: StudioDraft; busy: boolean; onClose: () => void; onSave: (values: { name: string; description: string; price: number }, stocks?: { size: string; stock: number }[]) => Promise<void> }) {
  const [name, setName] = useState(draft.name);
  const [description, setDescription] = useState(draft.description);
  const [price, setPrice] = useState(draft.price);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const editor = useRef<HTMLFormElement>(null);
  useEffect(() => { editor.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const values = { name, description, price };
  const quantities = draft.availability.map(v => ({ size: v.size, stock: stocks[v.size] || 0 })).filter(v => v.stock > 0);
  const valid = name.trim().length >= 2 && description.trim().length >= 3 && price >= 1000 && price <= 100000000;
  const saving = busy || !!draft.productId;
  return <form ref={editor} className="studio-editor" onSubmit={e => { e.preventDefault(); if (!saving && valid) void onSave(values); }}><div className="studio-section-title"><h3>{draft.productId ? "Combo đã mở bán" : "Hoàn thiện bộ phối"}</h3><button type="button" disabled={busy} aria-label="Đóng chỉnh sửa combo" onClick={onClose}><X size={20} /></button></div><div className="studio-editor-grid"><div><img className="studio-preview" src={draft.image} alt={draft.name} /><p className="studio-preview-note">Ảnh tổng hợp các món thực tế trong combo</p><div className="studio-rationale"><Sparkles size={18} /><div><strong>{draft.engine === "openai-vision" ? "Vì sao phối cùng nhau?" : "Ghi chú bộ phối"}</strong><p>{draft.rationale}</p></div></div><ul className="studio-members">{draft.items.map(i => <li key={i.id}><img src={i.image} alt="" /><span><strong>{i.name}</strong><small>{studioCategories[i.category]}</small></span><b>{money(i.price)}</b></li>)}</ul></div><div className="studio-editor-fields"><label>Tên combo<input value={name} required minLength={2} maxLength={150} disabled={saving} onChange={e => setName(e.target.value)} /></label><label>Mô tả bán hàng<textarea rows={4} value={description} minLength={3} maxLength={3000} required disabled={saving} onChange={e => setDescription(e.target.value)} /></label><label>Giá bán combo (₫)<input type="number" min={1000} max={100000000} required value={price} disabled={saving} onChange={e => setPrice(Number(e.target.value))} /><small>Tổng giá lẻ: {money(draft.items.reduce((sum, i) => sum + i.price, 0))}</small></label>
    {draft.productId ? <div className="studio-published"><Check size={22} /><strong>Combo đã có trên gian hàng</strong><p>Bộ phối đang hiển thị tại khu vực Combo và không nằm trong danh sách sản phẩm lẻ.</p><a href="/#looks" target="_blank" rel="noreferrer">Xem khu vực Combo <ArrowRight size={15} /></a></div> : <><div className="studio-stock-title"><strong>Số bộ muốn mở bán theo size</strong><p>Mỗi bộ dùng 1 đơn vị của mỗi món. Size F dùng chung cho các size; số lượng phụ kiện cần đủ cho tổng số bộ.</p></div><div className="studio-stock-inputs">{draft.availability.map(v => <label key={v.size}>Size {v.size}<input type="number" aria-label={"Số bộ size " + v.size} min={0} max={v.stock} value={stocks[v.size] || 0} disabled={busy} onChange={e => setStocks(prev => ({ ...prev, [v.size]: Number(e.target.value) }))} /><small>Tối đa {v.stock} bộ</small></label>)}</div>{!draft.availability.length && <p className="studio-inline-error">Chưa đủ tồn kho hoặc các món không có size chung.</p>}<div className="studio-editor-actions"><button type="submit" className="studio-secondary" disabled={busy || !valid}><Save size={16} />Lưu bản nháp</button><button type="button" className="studio-primary" disabled={busy || !valid || !quantities.length || quantities.some(q => q.stock > (draft.availability.find(v => v.size === q.size)?.stock || 0))} onClick={() => { if (editor.current?.reportValidity()) void onSave(values, quantities); }}>Mở bán {quantities.reduce((sum, q) => sum + q.stock, 0)} bộ<ArrowRight size={16} /></button></div><small className="studio-privacy">Mở bán sẽ dành riêng tồn kho cho combo và hiển thị bộ phối trên gian hàng. Bản nháp chưa xuất hiện với khách.</small></>}
  </div></div></form>;
}
