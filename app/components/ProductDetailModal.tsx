"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Minus, Plus, Ruler, ShoppingBag, Sparkles, Truck, RotateCcw, X, ZoomIn } from "lucide-react";
import { api, money } from "../../lib/client/api";
import type { ComboLookData } from "./ComboDetailModal";
import AddToWardrobeButton from "./AddToWardrobeButton";

type Variant = { id: string; size: string; color: string; colorHex?: string; stock: number };
type SizeRow = { size: string; chestMin: number | null; chestMax: number | null; waistMin: number | null; waistMax: number | null; hipMin: number | null; hipMax: number | null };
type Product = { id: string; name: string; brand: string; price: number; image: string; category: string; style: string; tags?: string[]; description: string; material: string; care: string; variants: Variant[]; sizeGuide: SizeRow[]; combo?: ComboLookData };
type Policy = { shippingFee: number; freeShippingThreshold: number; returnWindowDays: number };
export type DetailCart = { items: { id: string; variantId: string; quantity: number; size: string; color: string; product: Product & { category: "TOP" | "BOTTOM" | "OUTERWEAR" | "ACCESSORY" | "FOOTWEAR"; priceFormatted: string; selectedSize: string; availableSizes: string[] } }[]; subtotal: number; shippingFee: number; total: number };
type Props = { productId: string; combo?: ComboLookData; onClose: () => void; onAdded: (cart: DetailCart, checkout: boolean) => void; onTryOn?: (title: string) => void };

export default function ProductDetailModal(props: Props) {
  return <ProductDetail key={props.productId} {...props} />;
}

function ImageZoom({ image, title, onClose }: { image: string; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="pdp-lightbox" aria-label={"Ảnh phóng to " + title} onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); ref.current?.querySelector("button")?.focus(); } }} onCancel={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}>
    <button autoFocus className="pdp-lightbox-close" onClick={onClose}><X size={20} /> Đóng ảnh</button><img src={image} alt={title + " — phóng to"} />
  </dialog>;
}

function ProductDetail({ productId, combo: initialCombo, onClose, onAdded, onTryOn }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const sizeSection = useRef<HTMLFieldSetElement>(null);
  const lock = useRef(false);
  const [product, setProduct] = useState<Product | null>(null);
  const combo = product?.combo || initialCombo;
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("full-set");
  const [partSizes, setPartSizes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<any>(false);
  const [busyPart, setBusyPart] = useState("");
  const [guide, setGuide] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const modal = dialog.current;
    modal?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { modal?.close(); document.body.style.overflow = overflow; queueMicrotask(() => { if (previous?.isConnected) previous.focus(); }); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError("");
    api<{ product: Product }>("products/" + encodeURIComponent(productId)).then(({ product: result }) => {
      if (cancelled) return;
      setProduct(result);
      setColor(result.variants.find(v => v.stock > 0)?.color || result.variants[0]?.color || "");
    }).catch(e => { if (!cancelled) setLoadError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    api<Policy>("policies").then(result => { if (!cancelled) setPolicy(result); }).catch(() => {});
    return () => { cancelled = true; };
  }, [productId, attempt]);

  const activeOption = combo?.options?.find(o => o.id === selectedOptionId) || combo?.options?.[0];
  const isFullSet = !combo?.options?.length || !activeOption || activeOption.id === "full-set";
  const isAccessoryOnly = Boolean(
    !isFullSet &&
    activeOption?.includedSkus?.length &&
    combo?.items?.filter(it => it.sku && activeOption.includedSkus!.includes(it.sku)).every(it => it.variants?.every(v => v.size === "F"))
  );
  const effectivePrice = activeOption ? activeOption.price : (product?.price || 0);

  const variant = product?.variants.find(v => v.color === color && v.size === size);
  const colors = Array.from(new Set(product?.variants.map(v => v.color) || []));
  const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const sizes = Array.from(new Set(product?.variants.map(v => v.size) || [])).sort((a, b) => {
    const ai = order.indexOf(a), bi = order.indexOf(b);
    return ai >= 0 && bi >= 0 ? ai - bi : a.localeCompare(b, "vi", { numeric: true });
  });
  const title = combo?.title.replace(/^Combo \d+: /, "") || product?.name || "Chi tiết sản phẩm";
  const soldOut = product ? !product.variants.some(v => v.stock > 0) : false;
  const total = effectivePrice * quantity;

  async function purchase(checkout: boolean) {
    if (lock.current || !product) return;

    // Nếu chọn gói mua lẻ từ combo (không phải full-set)
    if (combo?.options?.length && activeOption && activeOption.id !== "full-set") {
      const includedSkus = activeOption.includedSkus || [];
      const matchingItems = combo.items.filter(it => it.sku && includedSkus.includes(it.sku));

      const needsApparelSize = matchingItems.some(it => it.variants?.some(v => v.size !== "F"));
      if (needsApparelSize && !size) {
        setError("Bạn hãy chọn kích cỡ cho món đồ trước khi tiếp tục.");
        sizeSection.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        sizeSection.current?.querySelector<HTMLButtonElement>("button[data-size]:not(:disabled)")?.focus();
        return;
      }

      const itemsToAdd: { variantId: string; quantity: number }[] = [];
      for (const it of matchingItems) {
        if (!it.variants?.length) continue;
        const chosen = (size ? it.variants.find(v => v.size === size && v.stock > 0) : null)
          || it.variants.find(v => v.size === "F" && v.stock > 0)
          || it.variants.find(v => v.stock > 0);
        if (!chosen) {
          setError(`Món "${it.name}" hiện đã hết hàng ở size này.`);
          return;
        }
        itemsToAdd.push({ variantId: chosen.id, quantity });
      }

      if (!itemsToAdd.length) {
        setError("Không tìm thấy biến thể hợp lệ cho gói này.");
        return;
      }

      lock.current = true; setBusy(true); setError("");
      try {
        const cart = await api<DetailCart>("cart/items", { method: "POST", body: JSON.stringify({ items: itemsToAdd }) });
        onAdded(cart, checkout);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không thể thêm vào giỏ. Vui lòng thử lại.");
      } finally {
        lock.current = false; setBusy(false);
      }
      return;
    }

    // Mua nguyên bộ combo hoặc sản phẩm thông thường
    if (!variant || variant.stock < 1) {
      setError("Bạn hãy chọn kích cỡ còn hàng trước khi tiếp tục.");
      sizeSection.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      sizeSection.current?.querySelector<HTMLButtonElement>("button[data-size]:not(:disabled)")?.focus();
      return;
    }
    lock.current = true; setBusy(true); setError("");
    try {
      const cart = await api<DetailCart>("cart/items", { method: "POST", body: JSON.stringify({ items: [{ variantId: variant.id, quantity }] }) });
      onAdded(cart, checkout);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể thêm vào giỏ. Vui lòng thử lại."); }
    finally { lock.current = false; setBusy(false); }
  }

  async function purchasePart(item: NonNullable<ComboLookData["items"]>[number]) {
    if (lock.current || !item.id || !item.variants?.length) return;
    const selected = partSizes[item.id] || item.variants.find(v => v.stock > 0)?.size;
    const chosen = item.variants.find(v => v.size === selected && v.stock > 0) || item.variants.find(v => v.stock > 0);
    if (!chosen) { setError("Món này hiện đã hết size còn hàng."); return; }
    lock.current = true; setBusy(true); setBusyPart("part-" + item.id); setError("");
    try {
      const cart = await api<DetailCart>("cart/items", { method: "POST", body: JSON.stringify({ items: [{ variantId: chosen.id, quantity: 1 }] }) });
      onAdded(cart, false);
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể thêm món lẻ vào giỏ."); }
    finally { lock.current = false; setBusy(false); setBusyPart(""); }
  }

  return <dialog ref={dialog} className="pdp-dialog" aria-label="Chi tiết sản phẩm" aria-labelledby={product ? "pdp-title" : undefined} onCancel={e => { e.preventDefault(); if (zoom) setZoom(false); else if (!lock.current) onClose(); }} onClick={e => { if (e.target === e.currentTarget && !lock.current) onClose(); }}>
    <div className="pdp-shell">
      <header className="pdp-header"><div><span className="pdp-wordmark">FitCraft<span> / </span></span><span>Chi tiết {combo ? "bộ phối" : "sản phẩm"}</span></div><button ref={closeButton} className="pdp-icon" aria-label="Đóng chi tiết" disabled={busy} onClick={onClose}><X size={20} /></button></header>
      {loading ? <div className="pdp-empty" role="status">Đang tải thông tin sản phẩm…</div> : loadError ? <div className="pdp-empty" role="alert"><p>{loadError}</p><button className="pdp-primary" onClick={() => setAttempt(v => v + 1)}>Thử lại</button></div> : product && <>
        <div className="pdp-scroll">
          <div className="pdp-grid">
            <section className="pdp-gallery" aria-label="Ảnh sản phẩm">
              <div className="pdp-image-wrap">
                {imageFailed ? <div className="pdp-empty">Ảnh sản phẩm đang được cập nhật.</div> : <button className="pdp-image-button" onClick={() => setZoom(true)} aria-label="Phóng to ảnh sản phẩm"><img src={product.image} alt={title} onError={() => setImageFailed(true)} /><span className="pdp-zoom-label"><ZoomIn size={16} /> Phóng to ảnh</span></button>}
                {combo && <span className="pdp-image-badge">THE COMPLETE LOOK · {combo.items.length} MÓN</span>}
              </div>
              <p className="pdp-caption">{combo ? "Một bộ phối. Phong cách của riêng bạn." : "Khám phá từng chi tiết, chọn đúng phong cách."}</p>
              {onTryOn && <button className="pdp-stylist" disabled={busy} onClick={() => onTryOn(title)}><Sparkles size={19} /><span><strong>Chưa biết phối thế nào?</strong><small>Khám phá cùng stylist FitCraft</small></span><ChevronRight size={18} /></button>}
            </section>
            <section className="pdp-info">
              <p className="pdp-eyebrow">{product.brand || "FITCRAFT STUDIO"}{combo ? " / " + combo.styleName : ""}</p>
              <h2 id="pdp-title">{title}</h2>
              <AddToWardrobeButton product={product} />
              <p className="pdp-intro">{combo?.description || product.description}</p>
              <div className="pdp-price">
                <strong>{money(effectivePrice)}</strong>
                <span>{activeOption ? (activeOption.id === "full-set" ? `Trọn bộ ${combo?.items.length || 0} món` : activeOption.name) : (combo ? `Trọn bộ ${combo.items.length} món` : "Giá sản phẩm")}</span>
              </div>
              {combo && <div className="pdp-bundle-note">
                <Check size={17} />
                <span>
                  {!isFullSet && activeOption
                    ? `Tùy chọn: ${activeOption.name}. Mua lẻ theo gói đã chọn (hoặc chọn mua từng món bên dưới).`
                    : "Bán nguyên bộ hoặc mua lẻ từng món bên dưới; phụ kiện đi kèm theo mẫu."}
                </span>
              </div>}

              {/* Tùy chọn các gói mua lẻ trong combo */}
              {combo?.options && combo.options.length > 1 && (
                <fieldset className="pdp-fieldset">
                  <legend>Tùy chọn mua <span>— {activeOption?.name || "Chọn gói mua"}</span></legend>
                  <div className="pdp-combo-options">
                    {combo.options.map(opt => {
                      const isSelected = (selectedOptionId || "full-set") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className="pdp-combo-option-btn"
                          aria-pressed={isSelected}
                          disabled={busy}
                          onClick={() => {
                            setSelectedOptionId(opt.id);
                            setError("");
                          }}
                        >
                          <span className="pdp-combo-opt-name">{opt.name}</span>
                          <span className="pdp-combo-opt-price">{opt.priceFormatted || money(opt.price)}</span>
                          {isSelected && <Check size={14} className="pdp-combo-opt-check" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <fieldset className="pdp-fieldset"><legend>Màu sắc <span>— {color}</span></legend><div className="pdp-options">{colors.map(c => {
                const available = product.variants.some(v => v.color === c && v.stock > 0);
                return <button key={c} className="pdp-color" disabled={!available || busy} aria-pressed={color === c} onClick={() => { setColor(c); if (!product.variants.some(v => v.color === c && v.size === size && v.stock > 0)) setSize(""); setQuantity(1); setError(""); }}><i style={{ background: product.variants.find(v => v.color === c)?.colorHex || "#e1e5df" }} />{c}{color === c && <Check size={14} />}{!available && " · Hết hàng"}</button>;
              })}</div></fieldset>
              <fieldset className="pdp-fieldset" ref={sizeSection}>
                <legend>Kích cỡ <span>— {isAccessoryOnly ? "Freesize (Phụ kiện)" : size || "Chọn size của bạn"}</span></legend>
                {!isAccessoryOnly && <button className="pdp-guide-link" aria-expanded={guide} aria-controls="pdp-guide" onClick={() => setGuide(v => !v)}><Ruler size={15} /> Hướng dẫn chọn size</button>}
                {!isAccessoryOnly ? (
                  <div className="pdp-options">{sizes.map(s => {
                    const available = product.variants.some(v => v.color === color && v.size === s && v.stock > 0);
                    return <button key={s} data-size className="pdp-size" aria-label={`Size ${s}${available ? "" : " — hết hàng"}`} aria-pressed={size === s} disabled={!available || busy} onClick={() => { setSize(s); setQuantity(1); setError(""); }}>{s}</button>;
                  })}</div>
                ) : (
                  <div className="pdp-options"><span className="pdp-size" aria-pressed="true">Freesize</span></div>
                )}
              </fieldset>
              {guide && <section id="pdp-guide" className="pdp-guide"><h3>Bảng kích cỡ · cm</h3>{product.sizeGuide?.length ? <div className="pdp-table-scroll"><table><caption>Số đo cơ thể tham khảo theo sản phẩm</caption><thead><tr><th>Size</th><th>Ngực</th><th>Eo</th><th>Hông</th></tr></thead><tbody>{[...product.sizeGuide].sort((a, b) => sizes.indexOf(a.size) - sizes.indexOf(b.size)).map(row => <tr key={row.size}><th>{row.size}</th>{(["chest", "waist", "hip"] as const).map(key => <td key={key}>{row[`${key}Min`] != null && row[`${key}Max`] != null ? `${row[`${key}Min`]}–${row[`${key}Max`]}` : "—"}</td>)}</tr>)}</tbody></table></div> : <p>Shop chưa cập nhật bảng số đo cho sản phẩm này. Vui lòng xác nhận số đo với shop trước khi chọn size.</p>}<p>Đo vòng ngực và hông ở phần đầy nhất, vòng eo ở phần nhỏ nhất. Giữ thước ngang, vừa sát cơ thể, không siết chặt.</p></section>}
              <div className="pdp-quantity-row"><div className="pdp-quantity"><button aria-label="Giảm số lượng" disabled={quantity <= 1 || busy} onClick={() => setQuantity(v => v - 1)}><Minus size={16} /></button><output aria-label="Số lượng">{quantity}</output><button aria-label="Tăng số lượng" disabled={!variant || quantity >= Math.min(variant.stock, 20) || busy} onClick={() => setQuantity(v => v + 1)}><Plus size={16} /></button></div><span className="pdp-stock" role="status">{soldOut ? "Tạm hết hàng" : variant ? `${variant.stock} ${combo ? "bộ" : "sản phẩm"} còn hàng` : "Chọn size để xem tồn kho"}</span></div>
              <div className="pdp-services"><div><Truck size={19} /><span><strong>Giao hàng & thanh toán COD</strong><small>{policy ? `Phí ${money(policy.shippingFee)} · Miễn phí từ ${money(policy.freeShippingThreshold)}` : "Phí vận chuyển được tính trong giỏ hàng"}</small></span></div><div><RotateCcw size={19} /><span><strong>{policy ? `Yêu cầu trả hàng trong ${policy.returnWindowDays} ngày` : "Hỗ trợ trả hàng"}</strong><small>Xem điều kiện ở phần thông tin bên dưới</small></span></div></div>
            </section>
          </div>
          <div className="pdp-details">
            {combo && <section className="pdp-included"><div className="pdp-section-heading"><span className="pdp-eyebrow">TRONG BỘ PHỐI NÀY</span><h3>{combo.items.length} món, một tổng thể hài hòa</h3><p>Có thể mua trọn bộ hoặc chọn riêng từng món.</p></div><ol>{combo.items.map((item, i) => { const sizes = Array.from(new Set((item.variants || []).filter(v => v.stock > 0).map(v => v.size))); const canBuy = Boolean(item.id && item.variants?.length); return <li key={item.sku || i}><span className="pdp-item-number">{String(i + 1).padStart(2, "0")}</span><div><strong>{item.name}</strong><span>{item.type} · {money(item.price)}</span>{canBuy && <div className="pdp-part-buy"><select aria-label={`Size món ${item.name}`} value={partSizes[item.id!] || sizes[0] || ""} disabled={busy} onChange={e => setPartSizes(prev => ({ ...prev, [item.id!]: e.target.value }))}>{sizes.map(s => <option key={s} value={s}>{s}</option>)}</select><button type="button" disabled={busy || !sizes.length} onClick={() => void purchasePart(item)}>{busy === "part-" + item.id ? "Đang thêm…" : "Mua lẻ"}</button></div>}</div><Check size={17} /></li>; })}</ol></section>}
            <section className="pdp-accordions" aria-label="Thông tin sản phẩm"><details open><summary>Mô tả & chất liệu</summary><p>{product.description}</p><p><strong>Chất liệu / thành phần: </strong>{product.material || "Shop đang cập nhật."}</p></details><details><summary>Hướng dẫn bảo quản</summary><p>{product.care || "Shop đang cập nhật. Vui lòng tham khảo nhãn hướng dẫn trên sản phẩm."}</p></details><details><summary>Giao hàng & trả hàng</summary><p>{policy ? `Phí giao hàng ${money(policy.shippingFee)}, miễn phí cho giỏ hàng từ ${money(policy.freeShippingThreshold)}. Có thể gửi yêu cầu trả hàng trong ${policy.returnWindowDays} ngày kể từ khi nhận hàng tại mục Đơn hàng; shop sẽ xem xét yêu cầu.` : "Phí vận chuyển hiển thị trong giỏ hàng. Bạn có thể theo dõi đơn và gửi yêu cầu trả hàng tại mục Đơn hàng."}</p><p>Thanh toán khi nhận hàng (COD). Phí giao hàng cuối cùng được tính theo toàn bộ giỏ hàng.</p></details></section>
          </div>
        </div>
        <footer className="pdp-purchase"><div className="pdp-purchase-summary"><span>Tạm tính · {quantity} {combo ? (!isFullSet ? "gói" : "bộ") : "sản phẩm"}</span><strong>{money(total)}</strong><small>{isAccessoryOnly ? "Freesize (Phụ kiện)" : size ? `${color} · Size ${size}` : "Vui lòng chọn kích cỡ"}</small></div><div className="pdp-purchase-actions">{error && <p className="pdp-error" role="alert">{error}</p>}<div><button className="pdp-secondary" disabled={busy || soldOut} onClick={() => void purchase(false)}><ShoppingBag size={18} /><span>{busy ? "Đang xử lý…" : "Thêm vào giỏ"}</span></button><button className="pdp-primary" disabled={busy || soldOut} onClick={() => void purchase(true)}>{soldOut ? "Tạm hết hàng" : busy ? "Đang xử lý…" : "Mua ngay"}<ChevronRight size={17} /></button></div></div></footer>
      </>}
      {zoom && product && <ImageZoom image={product.image} title={title} onClose={() => setZoom(false)} />}
    </div>
  </dialog>;
}
