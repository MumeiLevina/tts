"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Heart,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Upload,
  Eye,
  X
} from "lucide-react";
import TryOnPreviewCanvas from "../components/TryOnPreviewCanvas";
import CheckoutForm from "../components/CheckoutForm";
import AuthMenu from "../components/AuthMenu";
import ComboDetailModal, { ComboLookData } from "../components/ComboDetailModal";
import { curatedCombos } from "../../lib/client/combos";
import { api, money } from "../../lib/client/api";

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  category: "TOP" | "BOTTOM" | "OUTERWEAR" | "ACCESSORY" | "FOOTWEAR";
  variants: { id: string; size: string; color: string; stock: number }[];
  selectedVariantId?: string;
  cartLineId?: string;
  quantity?: number;
  description?: string;
  material?: string;
  care?: string;
  image: string;
  selectedSize: string;
  availableSizes: string[];
  brand?: string;
  tagBadge?: string;
}

const modelAngles = [
  { id: "front", label: "Góc thẳng", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85" },
  { id: "side", label: "Góc 45°", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=85" },
  { id: "full", label: "Toàn thân", url: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1100&q=85" }
];

const sampleUserPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1100&q=85";

const defaultPills = [
  "Combo 1: Minimalism Dạo phố",
  "Combo 2: Smart Casual",
  "Combo 3: Edgy Workwear",
  "Combo 4: Preppy Clean",
  "Combo 5: Art-Garde Minimalist",
  "Set đi làm thanh lịch dưới 1.5tr",
  "Phong cách tối giản Minimalist"
];

export default function FittingRoomPage() {
  const [currentOutfit, setCurrentOutfit] = useState<ProductItem[]>([]);
  const [shopProducts, setShopProducts] = useState<ProductItem[]>([]);
  const [cart, setCart] = useState<ProductItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartTotals, setCartTotals] = useState({ subtotal: 0, shippingFee: 0, total: 0 });
  const [viewingCombo, setViewingCombo] = useState<ComboLookData | null>(null);

  // Stylist Chat
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "assistant"; text: string }[]>([
    {
      sender: "assistant",
      text: "Xin chào! Mình là FitCraft Stylist AI. Bạn đang chuẩn bị trang phục cho dịp nào và có ngân sách dự kiến bao nhiêu?"
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [suggestionPills, setSuggestionPills] = useState<string[]>(defaultPills);

  // Model & Photo Canvas
  const [angleIndex, setAngleIndex] = useState(0);
  const [userPhoto, setUserPhoto] = useState<string>(sampleUserPhoto);
  const [hasUploadedUserPhoto, setHasUploadedUserPhoto] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatLock = useRef(false);
  const cartLock = useRef(false);

  function showToast(text: string) {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function applyCart(data: { items: { id: string; variantId: string; quantity: number; size: string; color: string; product: { id: string; name: string; price: number; image: string; variants: { id: string; size: string; color: string; stock: number }[] } }[]; subtotal: number; shippingFee: number; total: number }) {
    setCart(data.items.map(item => ({
      id: item.product.id,
      cartLineId: item.id,
      selectedVariantId: item.variantId,
      name: item.product.name,
      price: item.product.price,
      priceFormatted: money(item.product.price),
      category: "TOP",
      variants: item.product.variants,
      image: item.product.image,
      selectedSize: item.size,
      availableSizes: item.product.variants.map(v => v.size),
      quantity: item.quantity
    })));
    setCartTotals({ subtotal: data.subtotal, shippingFee: data.shippingFee, total: data.total });
  }

  async function loadCatalog() {
    try {
      const data = await api<{ products: { id: string; name: string; price: number; category: string; image: string; brand: string; tagBadge?: string; description: string; material: string; care: string; variants: { id: string; size: string; color: string; stock: number }[] }[] }>("products?limit=100");
      const mapped: ProductItem[] = data.products.map(p => {
        const inStockVariants = p.variants.filter(v => v.stock > 0);
        const firstVariant = inStockVariants[0] || p.variants[0];
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          priceFormatted: money(p.price),
          category: p.category as ProductItem["category"],
          variants: p.variants,
          selectedVariantId: firstVariant?.id,
          description: p.description,
          material: p.material,
          care: p.care,
          image: p.image,
          selectedSize: firstVariant?.size || "M",
          availableSizes: Array.from(new Set(p.variants.map(v => v.size))),
          brand: p.brand,
          tagBadge: p.tagBadge
        };
      });
      setShopProducts(mapped);

      // Default outfit: top-1, bottom-1, acc-1
      const defaultItems = mapped.filter(p => ["top-1", "bottom-1", "acc-1"].includes(p.id));
      if (defaultItems.length > 0) {
        setCurrentOutfit(defaultItems);
      } else {
        setCurrentOutfit(mapped.slice(0, 3));
      }
    } catch {
      showToast("Không thể tải danh mục sản phẩm.");
    }
  }

  async function loadCart() {
    try {
      const data = await api<{ items: { id: string; variantId: string; quantity: number; size: string; color: string; product: { id: string; name: string; price: number; image: string; variants: { id: string; size: string; color: string; stock: number }[] } }[]; subtotal: number; shippingFee: number; total: number }>("cart");
      applyCart(data);
    } catch {
      // ignore guest cart error
    }
  }

  useEffect(() => {
    void loadCatalog();
    void loadCart();

    // Check URL query params for auto-upload or style
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upload") === "1" || params.get("upload") === "true") {
        setTimeout(() => fileInputRef.current?.click(), 400);
      }
      const styleParam = params.get("style");
      if (styleParam) {
        setTimeout(() => {
          handleSendMessage(`Tôi muốn phối và thử ${styleParam}`);
        }, 600);
      }
    }
  }, []);

  async function handleSendMessage(customPrompt?: string) {
    const textToSend = customPrompt || inputMsg;
    if (!textToSend.trim() || chatLock.current) return;
    chatLock.current = true;
    setChatBusy(true);

    const userMsg = textToSend.trim();
    if (!customPrompt) setInputMsg("");
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);

    try {
      const res = await api<{ message: string; suggestions: string[]; outfit: { id: string; name: string; price: number; category: string; image: string; variants: { id: string; size: string; color: string; stock: number }[] }[] }>("stylist/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMsg })
      });

      setChatMessages(prev => [...prev, { sender: "assistant", text: res.message }]);
      if (res.suggestions?.length) setSuggestionPills(res.suggestions);

      if (res.outfit?.length) {
        const mappedOutfit: ProductItem[] = res.outfit.map(p => {
          const firstInStock = p.variants.find(v => v.stock > 0) || p.variants[0];
          return {
            id: p.id,
            name: p.name,
            price: p.price,
            priceFormatted: money(p.price),
            category: p.category as ProductItem["category"],
            variants: p.variants,
            selectedVariantId: firstInStock?.id,
            image: p.image,
            selectedSize: firstInStock?.size || "M",
            availableSizes: Array.from(new Set(p.variants.map(v => v.size)))
          };
        });
        setCurrentOutfit(mappedOutfit);
        setIsSaved(false);
        showToast("Đã cập nhật bộ phối đồ mới!");
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { sender: "assistant", text: "Xin lỗi, stylist tạm thời gián đoạn kết nối. Bạn hãy thử lại sau ít giây nhé." }
      ]);
    } finally {
      setChatBusy(false);
      chatLock.current = false;
    }
  }

  function handleSelectSize(productId: string, size: string) {
    setCurrentOutfit(prev =>
      prev.map(item => {
        if (item.id === productId) {
          const matching = item.variants.find(v => v.size === size && v.stock > 0) || item.variants.find(v => v.size === size);
          return {
            ...item,
            selectedSize: size,
            selectedVariantId: matching?.id || item.selectedVariantId
          };
        }
        return item;
      })
    );
  }

  function handleSwapItem(category: string) {
    const candidates = shopProducts.filter(p => p.category === category && !currentOutfit.some(c => c.id === p.id));
    if (!candidates.length) {
      showToast(`Không còn món đồ ${category} nào khác để đổi.`);
      return;
    }
    const nextItem = candidates[Math.floor(Math.random() * candidates.length)];
    setCurrentOutfit(prev => prev.map(item => (item.category === category ? nextItem : item)));
    setIsSaved(false);
    showToast(`Đã đổi sang: ${nextItem.name}`);
  }

  async function handleAddBundleToCart() {
    if (cartLock.current || !currentOutfit.length) return;
    cartLock.current = true;
    setCartBusy(true);

    try {
      const items = currentOutfit.map(item => {
        const variantId = item.selectedVariantId || item.variants.find(v => v.size === item.selectedSize)?.id || item.variants[0]?.id;
        return { variantId, quantity: 1 };
      });
      const res = await api<{ items: { id: string; variantId: string; quantity: number; size: string; color: string; product: { id: string; name: string; price: number; image: string; variants: { id: string; size: string; color: string; stock: number }[] } }[]; subtotal: number; shippingFee: number; total: number }>("cart/items", {
        method: "POST",
        body: JSON.stringify({ items })
      });
      applyCart(res);
      setIsCartOpen(true);
      showToast(`Đã thêm trọn bộ ${currentOutfit.length} món vào giỏ hàng!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng.");
    } finally {
      setCartBusy(false);
      cartLock.current = false;
    }
  }

  async function handleAddProductToCart(product: ProductItem) {
    if (cartLock.current) return;
    cartLock.current = true;
    setCartBusy(true);

    try {
      const variantId = product.selectedVariantId || product.variants.find(v => v.size === product.selectedSize)?.id || product.variants[0]?.id;
      if (!variantId) throw new Error("Vui lòng chọn size còn hàng.");
      const res = await api<{ items: { id: string; variantId: string; quantity: number; size: string; color: string; product: { id: string; name: string; price: number; image: string; variants: { id: string; size: string; color: string; stock: number }[] } }[]; subtotal: number; shippingFee: number; total: number }>("cart/items", {
        method: "POST",
        body: JSON.stringify({ items: [{ variantId, quantity: 1 }] })
      });
      applyCart(res);
      setIsCartOpen(true);
      showToast(`Đã thêm ${product.name} vào giỏ hàng!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng.");
    } finally {
      setCartBusy(false);
      cartLock.current = false;
    }
  }

  async function saveOutfit() {
    if (isSaved) {
      if (savedOutfitId) {
        try {
          await api("outfits/" + savedOutfitId, { method: "DELETE" });
          setIsSaved(false);
          setSavedOutfitId("");
          showToast("Đã bỏ lưu set đồ.");
        } catch {
          showToast("Không thể xóa set đồ đã lưu.");
        }
      }
      return;
    }

    try {
      const data = await api<{ outfit: { id: string; name: string } }>("outfits", {
        method: "POST",
        body: JSON.stringify({
          name: "Bộ đồ " + new Date().toLocaleDateString("vi-VN"),
          productIds: currentOutfit.map(i => i.id)
        })
      });
      setIsSaved(true);
      setSavedOutfitId(data.outfit.id);
      showToast("Đã lưu set đồ vào danh sách yêu thích!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể lưu set đồ.");
    }
  }

  const totalPrice = currentOutfit.reduce((sum, item) => sum + item.price, 0);
  const formattedTotalPrice = money(totalPrice);

  return (
    <div className="fitting-page-wrapper">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            setUserPhoto(URL.createObjectURL(file));
            setHasUploadedUserPhoto(true);
            showToast("Đã áp dụng ảnh chân dung của bạn!");
          }
        }}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fc-toast" role="status">
          <Sparkles size={16} color="var(--coral)" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <div className="cart-title-row">
                <ShoppingBag size={20} color="var(--ink)" />
                <h3>Giỏ hàng của bạn ({cart.length})</h3>
              </div>
              <button className="close-btn" onClick={() => setIsCartOpen(false)} aria-label="Đóng giỏ hàng">
                <X size={20} />
              </button>
            </div>

            <div className="cart-items-list">
              {cart.length === 0 ? (
                <div className="empty-cart-view">
                  <Package size={48} color="var(--muted-light)" strokeWidth={1.5} />
                  <p>Giỏ hàng đang trống.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.cartLineId || item.id} className="cart-item-card">
                    <img src={item.image} alt={item.name} className="cart-item-img" />
                    <div className="cart-item-info">
                      <strong>{item.name}</strong>
                      <div className="cart-item-specs">
                        <span>Size: {item.selectedSize}</span>
                        <span>{item.priceFormatted}</span>
                      </div>
                      <span className="cart-item-qty">Số lượng: {item.quantity || 1}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="total-row">
                  <span className="total-label">Tổng thanh toán:</span>
                  <span className="total-amount">{money(cartTotals.total)}</span>
                </div>
                <p>Phí giao hàng: {money(cartTotals.shippingFee)} · Miễn phí từ 1.000.000₫</p>
                {isCheckout ? (
                  <CheckoutForm
                    onBack={() => setIsCheckout(false)}
                    onComplete={order => {
                      applyCart({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
                      setIsCheckout(false);
                      setIsCartOpen(false);
                      showToast(`Đã tạo đơn ${order.number}. Xem tại Đơn hàng của bạn.`);
                      void loadCatalog();
                    }}
                  />
                ) : (
                  <button className="btn-buy-bundle" disabled={cartBusy} onClick={() => setIsCheckout(true)}>
                    <Check size={16} /> Tiến hành đặt hàng
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top App Bar */}
      <header className="fitting-nav">
        <div className="fitting-nav-left">
          <a href="/" className="fitting-back-link">
            <ArrowLeft size={16} />
            <span>Về trang chủ</span>
          </a>
          <span className="fitting-nav-divider">/</span>
          <div className="fitting-nav-brand">
            <span className="fitting-badge">AI STYLIST</span>
            <h1>Phòng Phối Đồ Trực Quan</h1>
          </div>
        </div>

        <div className="fitting-nav-right">
          <button
            className="fitting-icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Tải ảnh toàn thân của bạn"
          >
            <Camera size={16} />
            <span className="btn-text-desktop">Đổi ảnh của bạn</span>
          </button>

          <button
            className="fitting-icon-btn cart-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label="Xem giỏ hàng"
          >
            <ShoppingBag size={17} />
            {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </button>

          <AuthMenu />
        </div>
      </header>

      {/* Main 3-Column Immersive Grid */}
      <main className="fitting-workspace">
        <div className="fitting-room-grid">
          {/* CỘT 1: AI STYLIST CHAT */}
          <section className="chat-panel" aria-label="Khung trò chuyện với AI Stylist">
            <div className="chat-header">
              <div className="chat-header-title">
                <Sparkles size={16} color="var(--coral)" /> FitCraft Stylist AI
              </div>
              <div className="stylist-status-pill">
                <span className="stylist-status-dot" /> Trực tuyến 24/7
              </div>
            </div>

            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`msg ${msg.sender === "user" ? "msg-user" : "msg-assistant"}`}>
                  {msg.text}
                </div>
              ))}
              {chatBusy && (
                <div className="msg msg-assistant typing">
                  <RefreshCw size={14} className="spin" /> Stylist đang chuẩn bị set đồ…
                </div>
              )}
            </div>

            {/* Quick Suggestion Pills */}
            <div className="suggestion-pills-container">
              <div className="suggestion-pills-label">
                <Sparkles size={12} color="var(--coral)" /> Gợi ý phong cách nhanh:
              </div>
              <div className="suggestion-pills">
                {suggestionPills.map(pill => (
                  <button
                    key={pill}
                    className="pill-btn"
                    disabled={chatBusy}
                    onClick={() => handleSendMessage(pill)}
                  >
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="chat-input-wrapper">
              <input
                type="text"
                placeholder="Ví dụ: Phối đồ đi tiệc sang trọng dưới 2 triệu..."
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleSendMessage();
                }}
              />
              <button
                className="chat-send-btn"
                disabled={chatBusy || !inputMsg.trim()}
                onClick={() => handleSendMessage()}
                aria-label="Gửi tin nhắn"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          {/* CỘT 2: KHUNG HIỂN THỊ NGƯỜI MẪU & TRY-ON CANVAS */}
          <section className="canvas-panel" aria-label="Phòng thử đồ ảo">
            <TryOnPreviewCanvas
              modelAngles={modelAngles}
              currentAngleIndex={angleIndex}
              onCycleAngle={() => {
                setAngleIndex(prev => (prev + 1) % modelAngles.length);
                showToast(`Góc nhìn: ${modelAngles[(angleIndex + 1) % modelAngles.length].label}`);
              }}
              userPhotoUrl={hasUploadedUserPhoto ? userPhoto : null}
              onUploadUserPhoto={file => {
                setUserPhoto(URL.createObjectURL(file));
                setHasUploadedUserPhoto(true);
                showToast("Đã tải ảnh lên thành công!");
              }}
              onSelectSamplePhoto={url => {
                setUserPhoto(url);
                setHasUploadedUserPhoto(true);
                showToast("Đã áp dụng người mẫu thử nghiệm!");
              }}
              isSaved={isSaved}
              onToggleSave={() => void saveOutfit()}
              onDownloadHD={() => showToast("Chưa có ảnh AI để tải xuống.")}
              onShare={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  showToast("Đã sao chép liên kết phòng thử đồ!");
                } catch {
                  showToast("Không thể sao chép liên kết.");
                }
              }}
            />
          </section>

          {/* CỘT 3: SHOP THE LOOK */}
          <section className="shop-panel" aria-label="Danh sách sản phẩm trong set">
            <div className="shop-header">
              <div>
                <strong>Món Đồ Trong Set</strong>
                <span className="item-count-tag">{currentOutfit.length} món</span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="btn-refresh-outfit"
                  onClick={() => setViewingCombo(curatedCombos[0])}
                  title="Xem chi tiết 5 combo thời trang của shop"
                >
                  <Eye size={13} /> 5 Combo
                </button>
                <button
                  className="btn-refresh-outfit"
                  onClick={() => handleSendMessage("Phối cho mình một set đồ khác ngẫu nhiên")}
                  title="Đổi toàn bộ set đồ ngẫu nhiên"
                >
                  <RefreshCw size={13} /> Đổi set
                </button>
              </div>
            </div>

            {currentOutfit.some(item => item.id.startsWith("combo-")) && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  margin: "0 0 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 600 }}>
                  ✦ Set đồ Combo chính thức của Shop
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const found = curatedCombos.find(c => currentOutfit.some(o => o.id === c.id));
                    if (found) setViewingCombo(found);
                  }}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Xem bảng giá từng món
                </button>
              </div>
            )}

            <div className="shop-items-list">
              {currentOutfit.map(item => (
                <div key={item.id} className="shop-item-card">
                  <img src={item.image} alt={item.name} className="shop-item-img" />

                  <div className="shop-item-details">
                    <div className="shop-item-top">
                      <strong className="shop-item-name">{item.name}</strong>
                      <button
                        className="btn-swap-item"
                        onClick={() => handleSwapItem(item.category)}
                        title="Đổi sang món đồ khác cùng danh mục"
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>

                    <div className="shop-item-meta">
                      <div className="size-selector">
                        <label>Size:</label>
                        <div className="size-pill-group">
                          {item.availableSizes.map(size => (
                            <button
                              key={size}
                              className={`size-btn ${item.selectedSize === size ? "active" : ""}`}
                              onClick={() => handleSelectSize(item.id, size)}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <span className="shop-item-price">{item.priceFormatted}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="shop-footer">
              <div className="total-row">
                <span className="total-label">Tổng trọn bộ set đồ:</span>
                <span className="total-amount">{formattedTotalPrice}</span>
              </div>

              <button
                className="btn-buy-bundle"
                disabled={cartBusy || !currentOutfit.length}
                onClick={handleAddBundleToCart}
              >
                <ShoppingBag size={17} /> Mua cả set ({formattedTotalPrice})
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Combo Detail Modal */}
      <ComboDetailModal
        combo={viewingCombo}
        isOpen={!!viewingCombo}
        onClose={() => setViewingCombo(null)}
        onAdded={(data, checkout) => {
          applyCart(data);
          setViewingCombo(null);
          setIsCheckout(checkout);
          setIsCartOpen(true);
        }}
        onTryOn={(title) => {
          handleSendMessage(`Tôi muốn phối và thử ${title}`);
          setViewingCombo(null);
        }}
      />
    </div>
  );
}
