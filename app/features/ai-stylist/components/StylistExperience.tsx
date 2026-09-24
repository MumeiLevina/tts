"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Check, RefreshCw, Shirt, ShoppingBag, Sparkles } from "lucide-react";
import { api, money } from "../../../../lib/client/api";
import { buildOutfitCartLines, OutfitCartSelectionError } from "../../../../lib/outfit/cart-selection";
import type { RecommendOutfitResponse, ResolvedOutfit, StylingOccasion, StylingSeason } from "../../../../lib/outfit/types";
import OutfitCanvas from "./OutfitCanvas";
import styles from "./StylistExperience.module.css";

type FormState = {
  request: string;
  occasion: StylingOccasion | "";
  season: StylingSeason | "";
  budget: string;
  numberOfOutfits: number;
};

const INITIAL_FORM: FormState = { request: "", occasion: "", season: "", budget: "", numberOfOutfits: 3 };
const SUGGESTIONS = ["Đi cà phê cuối tuần, trẻ trung tối giản", "Đi làm mùa hè, thanh lịch và thoải mái", "Hẹn hò buổi tối, hiện đại nhưng không quá trang trọng"];
const OCCASIONS: { value: StylingOccasion; label: string }[] = [
  { value: "casual", label: "Hằng ngày" }, { value: "cafe", label: "Đi cà phê" },
  { value: "work", label: "Đi làm" }, { value: "date", label: "Hẹn hò" },
  { value: "party", label: "Dự tiệc" }, { value: "wedding", label: "Đám cưới" },
  { value: "beach", label: "Đi biển" }, { value: "travel", label: "Du lịch" },
  { value: "formal", label: "Trang trọng" }
];
const SEASONS: { value: StylingSeason; label: string }[] = [
  { value: "spring", label: "Mùa xuân" }, { value: "summer", label: "Mùa hè" },
  { value: "autumn", label: "Mùa thu" }, { value: "winter", label: "Mùa đông" },
  { value: "all-season", label: "Quanh năm" }
];
const SLOT_LABELS = { top: "Áo", bottom: "Quần", dress: "Váy", jumpsuit: "Jumpsuit", outerwear: "Áo khoác", shoes: "Giày", accessory: "Phụ kiện" } as const;

class RecommendationRequestError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

async function requestRecommendations(form: FormState, signal: AbortSignal) {
  const budget = form.budget ? Number(form.budget) : null;
  const requestController = new AbortController();
  const cancel = () => requestController.abort();
  signal.addEventListener("abort", cancel, { once: true });
  const timeout = window.setTimeout(cancel, 60000);
  let response: Response;
  try {
    response = await fetch("/api/outfits/recommend", {
      method: "POST", credentials: "same-origin", cache: "no-store", signal: requestController.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request: form.request.trim(), numberOfOutfits: form.numberOfOutfits,
        context: { occasion: form.occasion || null, season: form.season || null, weather: null, temperature: null, budget }
      })
    });
  } catch (cause) {
    if (signal.aborted) throw cause;
    if (requestController.signal.aborted) throw new RecommendationRequestError("Stylist cần nhiều thời gian hơn dự kiến. Hãy thử lại với yêu cầu ngắn gọn hơn.", "CLIENT_TIMEOUT");
    throw new RecommendationRequestError("Không thể kết nối tới AI Stylist. Hãy kiểm tra mạng và thử lại.", "NETWORK_ERROR");
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
  const data = await response.json().catch(() => null) as RecommendOutfitResponse | { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    const failure = data && "error" in data ? data.error : undefined;
    throw new RecommendationRequestError(failure?.message || "AI Stylist chưa thể tạo gợi ý. Vui lòng thử lại.", failure?.code);
  }
  if (!data || !("status" in data) || data.status !== "success" || !Array.isArray(data.outfits) || !data.outfits.length) throw new RecommendationRequestError("Máy chủ trả kết quả chưa hoàn chỉnh. Hãy tạo lại gợi ý.", "INVALID_RESPONSE");
  return data;
}

const ERROR_COPY: Record<string, { title: string; hint: string; retry: boolean }> = {
  NO_PRODUCTS: { title: "Chưa tìm thấy món phù hợp", hint: "Thử mô tả rộng hơn hoặc bỏ bớt điều kiện về dịp và mùa.", retry: false },
  INSUFFICIENT_PRODUCTS: { title: "Chưa đủ món cho một outfit", hint: "Tăng ngân sách hoặc khám phá thêm sản phẩm để có đủ áo, quần hoặc váy và giày.", retry: false },
  AI_NOT_CONFIGURED: { title: "Stylist chưa sẵn sàng", hint: "Tính năng AI chưa được cấu hình trên máy chủ. Vui lòng quay lại sau.", retry: false },
  AI_UNAVAILABLE: { title: "Stylist đang gián đoạn", hint: "Kết nối tới nhà cung cấp AI chưa ổn định. Bạn có thể thử lại ngay.", retry: true },
  INVALID_AI_OUTPUT: { title: "Chưa tạo được bộ phối hợp lệ", hint: "Stylist đã tự thử lại một lần nhưng kết quả vẫn chưa đạt yêu cầu.", retry: true },
  CATALOG_CHANGED: { title: "Sản phẩm vừa thay đổi", hint: "Tồn kho hoặc trạng thái sản phẩm vừa được cập nhật. Hãy tạo một gợi ý mới.", retry: true },
  CLIENT_TIMEOUT: { title: "Stylist phản hồi quá lâu", hint: "Hãy thử lại với yêu cầu ngắn gọn hơn hoặc giảm số outfit.", retry: true },
  NETWORK_ERROR: { title: "Không thể kết nối", hint: "Kiểm tra kết nối mạng của bạn rồi thử lại.", retry: true },
  RATE_LIMIT: { title: "Bạn đang yêu cầu quá nhanh", hint: "Vui lòng chờ một lúc trước khi tạo thêm outfit.", retry: false },
  INTERNAL_ERROR: { title: "Hệ thống chưa xử lý được yêu cầu", hint: "Dữ liệu của bạn vẫn an toàn. Vui lòng thử lại sau.", retry: true }
};

function outfitProducts(outfit: ResolvedOutfit) {
  return [outfit.items.top, outfit.items.bottom, outfit.items.dress, outfit.items.jumpsuit, outfit.items.outerwear, outfit.items.shoes, ...outfit.items.accessories].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function ProductImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <div className={styles.imageFallback}><Shirt size={24} aria-hidden="true" /><span>Ảnh đang cập nhật</span></div> : <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}

function OutfitResult({ outfit, index }: { outfit: ResolvedOutfit; index: number }) {
  const products = outfitProducts(outfit);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function addProducts(items: ResolvedOutfit["items"]["shoes"][]) {
    if (pending) return;
    let lines;
    try { lines = buildOutfitCartLines(items, selectedVariants); }
    catch (cause) { setCartMessage({ tone: "error", text: cause instanceof OutfitCartSelectionError ? cause.message : "Lựa chọn sản phẩm không hợp lệ." }); return; }
    setPending(items.length === 1 ? items[0].id : "all"); setCartMessage(null);
    try {
      await api("cart/items", { method: "POST", body: JSON.stringify({ items: lines }) });
      setCartMessage({ tone: "success", text: items.length === 1 ? `Đã thêm ${items[0].name} vào giỏ hàng.` : `Đã thêm trọn bộ ${items.length} món vào giỏ hàng.` });
    } catch (cause) {
      setCartMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Không thể thêm sản phẩm vào giỏ hàng." });
    } finally { setPending(null); }
  }

  return (
    <article className={styles.outfit} aria-labelledby={`outfit-${outfit.id}`}>
      <div className={styles.canvasColumn}><OutfitCanvas outfit={outfit} /></div>
      <div className={styles.outfitDetails}>
        <header className={styles.outfitHeader}>
          <span>Gợi ý {index + 1}</span>
          <h2 id={`outfit-${outfit.id}`}>{outfit.name}</h2>
          <p>{outfit.stylistAdvice}</p>
        </header>
        <div className={styles.productRail} aria-label={`Sản phẩm trong ${outfit.name}`}>
          {products.map(product => (
            <article className={styles.product} key={product.id}>
              <div className={styles.productImage}><ProductImage src={product.imageUrl} name={product.name} /></div>
              <div className={styles.productCopy}>
                <span>{SLOT_LABELS[product.category]}</span><h3>{product.name}</h3><strong>{money(product.price)}</strong>
                <label className={styles.variantLabel} htmlFor={`variant-${outfit.id}-${product.id}`}>Size và màu</label>
                <select id={`variant-${outfit.id}-${product.id}`} className={styles.variantSelect} value={selectedVariants[product.id] || ""} onChange={event => { setSelectedVariants(current => ({ ...current, [product.id]: event.target.value })); setCartMessage(null); }}>
                  <option value="">Chọn phiên bản</option>
                  {product.variants.map(variant => <option value={variant.id} key={variant.id}>{variant.size} / {variant.color} ({variant.stock} có sẵn)</option>)}
                </select>
                <button type="button" className={styles.addOne} disabled={Boolean(pending) || !selectedVariants[product.id]} onClick={() => void addProducts([product])}><ShoppingBag size={14} aria-hidden="true" />{pending === product.id ? "Đang thêm" : "Thêm món"}</button>
              </div>
            </article>
          ))}
        </div>
        <footer className={styles.outfitTotal}>
          <div><span>{products.length} món trong bộ phối</span><p>Tổng <strong>{money(outfit.totalPrice)}</strong></p></div>
          <button type="button" className={styles.addAll} disabled={Boolean(pending) || products.some(product => !selectedVariants[product.id])} onClick={() => void addProducts(products)}><ShoppingBag size={16} aria-hidden="true" />{pending === "all" ? "Đang thêm cả bộ" : "Thêm cả bộ vào giỏ"}</button>
        </footer>
        {cartMessage && <p className={cartMessage.tone === "success" ? styles.cartSuccess : styles.cartError} role={cartMessage.tone === "error" ? "alert" : "status"}>{cartMessage.text}</p>}
      </div>
    </article>
  );
}

export default function StylistExperience() {
  const formId = useId();
  const controllerRef = useRef<AbortController | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState<RecommendOutfitResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const request = form.request.trim();
    if (request.length < 3) { setError("Hãy mô tả outfit bạn muốn bằng ít nhất 3 ký tự."); setErrorCode(""); setStatus("error"); return; }
    if (form.budget && (!Number.isInteger(Number(form.budget)) || Number(form.budget) < 1000)) { setError("Ngân sách cần từ 1.000₫ trở lên."); setErrorCode(""); setStatus("error"); return; }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading"); setError(""); setErrorCode("");
    try {
      const data = await requestRecommendations({ ...form, request }, controller.signal);
      if (controller.signal.aborted) return;
      setResult(data); setStatus("success");
      requestAnimationFrame(() => document.getElementById("stylist-results")?.focus({ preventScroll: false }));
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Không thể tạo gợi ý lúc này.");
      setErrorCode(cause instanceof RecommendationRequestError ? cause.code || "INTERNAL_ERROR" : "INTERNAL_ERROR");
      setStatus("error");
      requestAnimationFrame(() => document.getElementById("stylist-results")?.focus({ preventScroll: false }));
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby={formId + "-title"}>
        <div className={styles.introCopy}>
          <span className={styles.eyebrow}><Sparkles size={14} aria-hidden="true" /> AI Stylist</span>
          <h1 id={formId + "-title"}>Nói gu của bạn.<br />Xem outfit hoàn chỉnh.</h1>
          <p>FitCraft chọn và phối trực tiếp từ sản phẩm đang có trong shop.</p>
        </div>
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.fieldWide}>
            <label htmlFor={formId + "-request"}>Bạn muốn mặc gì?</label>
            <textarea id={formId + "-request"} rows={4} maxLength={1000} value={form.request} onChange={event => setForm(current => ({ ...current, request: event.target.value }))} placeholder="Ví dụ: Phối đồ đi cà phê cuối tuần, phong cách trẻ trung tối giản" aria-describedby={formId + "-hint"} />
            <small id={formId + "-hint"}>Mô tả dịp, phong cách hoặc món đồ bạn muốn phối.</small>
          </div>
          <div className={styles.suggestions} aria-label="Yêu cầu mẫu">{SUGGESTIONS.map(suggestion => <button type="button" key={suggestion} onClick={() => setForm(current => ({ ...current, request: suggestion }))}>{suggestion}</button>)}</div>
          <div className={styles.fieldGrid}>
            <div><label htmlFor={formId + "-occasion"}>Dịp</label><select id={formId + "-occasion"} value={form.occasion} onChange={event => setForm(current => ({ ...current, occasion: event.target.value as FormState["occasion"] }))}><option value="">Để stylist tự chọn</option>{OCCASIONS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div>
            <div><label htmlFor={formId + "-season"}>Mùa</label><select id={formId + "-season"} value={form.season} onChange={event => setForm(current => ({ ...current, season: event.target.value as FormState["season"] }))}><option value="">Không giới hạn</option>{SEASONS.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div>
            <div><label htmlFor={formId + "-budget"}>Ngân sách tối đa</label><input id={formId + "-budget"} type="number" inputMode="numeric" min="1000" step="1000" value={form.budget} onChange={event => setForm(current => ({ ...current, budget: event.target.value }))} placeholder="Không giới hạn" /></div>
            <div><label htmlFor={formId + "-count"}>Số gợi ý</label><select id={formId + "-count"} value={form.numberOfOutfits} onChange={event => setForm(current => ({ ...current, numberOfOutfits: Number(event.target.value) }))}><option value={1}>1 outfit</option><option value={2}>2 outfit</option><option value={3}>3 outfit</option></select></div>
          </div>
          {status === "error" && !errorCode && <p className={styles.formError} role="alert">{error}</p>}
          <button className={styles.submit} type="submit" disabled={status === "loading"}>{status === "loading" ? <><RefreshCw size={18} className={styles.spin} aria-hidden="true" /> Đang chọn outfit</> : <>Gợi ý outfit <ArrowRight size={18} aria-hidden="true" /></>}</button>
        </form>
      </section>

      {status === "idle" && <section className={styles.empty} aria-label="Hướng dẫn bắt đầu"><Shirt size={30} aria-hidden="true" /><h2>Một mô tả là đủ để bắt đầu</h2><p>Stylist sẽ cân đối kiểu dáng, màu sắc, hoàn cảnh và ngân sách.</p></section>}
      {status === "loading" && <section id="stylist-results" className={styles.results} aria-live="polite" aria-busy="true"><p className={styles.loadingMessage}><Sparkles size={16} aria-hidden="true" /> Stylist đang phối đồ cho bạn...</p>{Array.from({ length: form.numberOfOutfits }, (_, index) => <div className={styles.skeleton} key={index}><div /><section><i /><i /><i /></section></div>)}</section>}
      {status === "error" && errorCode && (() => { const copy = ERROR_COPY[errorCode] || ERROR_COPY.INTERNAL_ERROR; return <section id="stylist-results" className={styles.failure} role="alert" tabIndex={-1}><AlertCircle size={28} aria-hidden="true" /><div><h2>{copy.title}</h2><p>{error}</p><small>{copy.hint}</small><div className={styles.failureActions}>{copy.retry && <button type="button" onClick={() => void submit()}><RefreshCw size={15} aria-hidden="true" /> Thử lại</button>}{["NO_PRODUCTS", "INSUFFICIENT_PRODUCTS"].includes(errorCode) && <a href="/#products">Xem sản phẩm <ArrowRight size={15} aria-hidden="true" /></a>}</div></div></section>; })()}
      {status === "success" && result && <section id="stylist-results" className={styles.results} tabIndex={-1} aria-labelledby={formId + "-results-title"}>
        <header className={styles.resultsHeader}><div><span><Check size={15} aria-hidden="true" /> Đã phối từ {result.meta.eligibleCount} sản phẩm phù hợp</span><h2 id={formId + "-results-title"}>Outfit dành cho bạn</h2></div><button type="button" onClick={() => void submit()}><RefreshCw size={16} aria-hidden="true" /> Tạo lại</button></header>
        <div className={styles.outfitList}>{result.outfits.map((outfit, index) => <OutfitResult outfit={outfit} index={index} key={outfit.id} />)}</div>
      </section>}
    </div>
  );
}
