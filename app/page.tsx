"use client";

import React, { useState, useRef, useEffect } from "react";
import CheckoutForm from "./components/CheckoutForm";
import AuthMenu from "./components/AuthMenu";
import Footer from "./components/Footer";
import PersonalWardrobe from "./components/PersonalWardrobe";
import AddToWardrobeButton from "./components/AddToWardrobeButton";
import { wardrobeCategories } from "../lib/wardrobe";
import ThemeToggle from "./components/ThemeToggle";
import FloatingActions from "./components/FloatingActions";
import ProductDetailModal from "./components/ProductDetailModal";
import ComboDetailModal, { ComboClothingItem, ComboLookData } from "./components/ComboDetailModal";
import { curatedCombos } from "../lib/client/combos";
import { api, money } from "../lib/client/api";
import {
  ArrowRight,
  Camera,
  Heart,
  Search,
  ShoppingBag,
  Sparkles,
  Upload,
  RefreshCw,
  Share2,
  Download,
  Maximize2,
  X,
  Lock,
  Check,
  RotateCw,
  Eye,
  Plus,
  Tag,
  Store,
  SlidersHorizontal,
  ChevronRight,
  Shirt,
  Menu,
  Truck,
  RotateCcw,
  ShieldCheck
} from "lucide-react";

// Types
export interface ProductItem {
  id: string;
  name: string;
  price: number;
  priceFormatted: string;
  category: "TOP" | "BOTTOM" | "SKIRT" | "DRESS" | "OUTERWEAR" | "ACCESSORY" | "FOOTWEAR";
  style?: string;
  tags?: string[];
  variants: { id: string; size: string; color: string; colorHex?: string; stock: number }[];
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

export type LookBookItem = ComboLookData;
const curatedLooks: LookBookItem[] = curatedCombos;

const modelAngles = [
  { id: "front", label: "Góc thẳng", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85" },
  { id: "side", label: "Góc 45°", url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1100&q=85" },
  { id: "full", label: "Toàn thân", url: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1100&q=85" }
];

const sampleUserPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1100&q=85";

export default function Home() {
  // Current outfit in the Fitting Room
  const [currentOutfit, setCurrentOutfit] = useState<ProductItem[]>([]);
  const [shopProducts, setShopProducts] = useState<ProductItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [cartTotals, setCartTotals] = useState({ subtotal: 0, shippingFee: 0, total: 0 });
  const [savedOutfitId, setSavedOutfitId] = useState("");
  const cartLock = useRef(false);
  const chatLock = useRef(false);

  // Fitting room view & angle
  const [viewMode, setViewMode] = useState<"model" | "user">("model");
  const [angleIndex, setAngleIndex] = useState(0);
  const [userPhoto, setUserPhoto] = useState<string>(sampleUserPhoto);
  const [hasUploadedUserPhoto, setHasUploadedUserPhoto] = useState(false);

  // Likes & Cart
  const [isSaved, setIsSaved] = useState(false);
  const [cart, setCart] = useState<ProductItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewingCombo, setViewingCombo] = useState<ComboLookData | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "assistant" | "user"; text: string }>>([
    { sender: "assistant", text: "Chào bạn! Bạn muốn phối đồ cho dịp gì, với ngân sách bao nhiêu? Mình sẽ chọn từ sản phẩm còn hàng trong shop." }
  ]);
  const [inputMsg, setInputMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  type CartResponse = { items: { id: string; variantId: string; quantity: number; size: string; color: string; product: ProductItem }[]; subtotal: number; shippingFee: number; total: number };
  function applyCart(data: CartResponse) {
    setCart(data.items.map(line => ({ ...line.product, selectedSize: line.size, selectedVariantId: line.variantId, cartLineId: line.id, quantity: line.quantity })));
    setCartTotals({ subtotal: data.subtotal, shippingFee: data.shippingFee, total: data.total });
  }
  async function loadCatalog() {
    setCatalogLoading(true); setCatalogError("");
    try {
      const data = await api<{ products: ProductItem[] }>("products?limit=100");
      setShopProducts(data.products);
      setCurrentOutfit(prev => prev.length ? prev : ["TOP", "BOTTOM", "ACCESSORY"].flatMap(category => data.products.filter(p => p.category === category && p.availableSizes.length).slice(0, 1)));
    } catch (e) { setCatalogError(e instanceof Error ? e.message : "Không tải được sản phẩm."); }
    finally { setCatalogLoading(false); }
  }
  useEffect(() => {
    void loadCatalog();
    api<CartResponse>("cart").then(applyCart).catch(e => setCatalogError(e.message));
  }, []);
  useEffect(() => { setIsSaved(false); setSavedOutfitId(""); }, [currentOutfit]);
  async function saveOutfit() {
    try {
      if (isSaved && savedOutfitId) { await api("outfits/" + savedOutfitId, { method: "DELETE" }); setIsSaved(false); setSavedOutfitId(""); }
      else {
        const result = await api<{ outfit: { id: string } }>("outfits", { method: "POST", body: JSON.stringify({ name: "Bộ đồ của tôi", productIds: currentOutfit.map(p => p.id) }) });
        setSavedOutfitId(result.outfit.id); setIsSaved(true);
      }
      showToast(isSaved ? "Đã bỏ lưu bộ đồ." : "Đã lưu bộ đồ trong phiên của bạn.");
    } catch (e) { showToast(e instanceof Error ? e.message : "Không thể lưu bộ đồ."); }
  }

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick suggestion pills
  const suggestionPills = [
    "💼 Đi phỏng vấn",
    "🏖️ Đi biển thanh lịch",
    "🍂 Tone ấm dưới 1.5tr",
    "🍸 Dạo phố tối thứ 7",
    "✨ Tiệc cưới ngoài trời"
  ];

  const handlePillClick = (pill: string) => {
    const cleanText = pill.replace(/^[^\s]+\s/, "");
    handleSendMessage(`Gợi ý cho mình set đồ: ${cleanText}`);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const msg = textToSend || inputMsg;
    if (!msg.trim() || chatLock.current) return;
    chatLock.current = true; setChatBusy(true);
    setChatMessages(prev => [...prev, { sender: "user", text: msg }]);
    if (!textToSend) setInputMsg("");
    try {
      const result = await api<{ rationale: string; outfit: ProductItem[] }>("stylist/chat", { method: "POST", body: JSON.stringify({ message: msg }) });
      setChatMessages(prev => [...prev, { sender: "assistant", text: result.rationale }]);
      setCurrentOutfit(result.outfit);
    } catch (e) { showToast(e instanceof Error ? e.message : "Không thể gợi ý phối đồ."); }
    finally { chatLock.current = false; setChatBusy(false); }
  };

  // Swap item within category
  const handleSwapItem = (category: ProductItem["category"]) => {
    const pool = shopProducts.filter(p => p.category === category && p.availableSizes.length > 0);
    if (!pool || pool.length === 0) return;

    const currentIndex = currentOutfit.findIndex(item => item.category === category);
    if (currentIndex === -1) return;

    const currentItem = currentOutfit[currentIndex];
    const poolIndex = pool.findIndex(p => p.id === currentItem.id);
    const nextItem = pool[(poolIndex + 1) % pool.length];

    const updated = [...currentOutfit];
    updated[currentIndex] = { ...nextItem };
    setCurrentOutfit(updated);
    showToast(`Đã đổi sang: ${nextItem.name}`);
  };

  // Update Size for an item in current outfit
  const handleSelectSize = (itemId: string, size: string) => {
    setCurrentOutfit(prev =>
      prev.map(item => (item.id === itemId ? { ...item, selectedSize: size, selectedVariantId: item.variants.find(v => v.size === size && v.stock > 0)?.id } : item))
    );
  };

  // Total price calculation
  const totalPrice = currentOutfit.reduce((sum, item) => sum + item.price, 0);
  const formattedTotalPrice = new Intl.NumberFormat("vi-VN").format(totalPrice) + "₫";

  async function addToCart(products: ProductItem[]) {
    if (cartLock.current || !products.length) return;
    cartLock.current = true; setCartBusy(true);
    try {
      // Establish the session before mutation, including clicks during initial loading.
      await api<CartResponse>("cart");
      const items = products.map(p => {
        const variant = p.variants.find(v => p.selectedVariantId ? v.id === p.selectedVariantId : v.size === p.selectedSize && v.stock > 0);
        if (!variant) throw new Error("Vui lòng chọn size còn hàng cho " + p.name);
        return { variantId: variant.id, quantity: 1 };
      });
      applyCart(await api<CartResponse>("cart/items", { method: "POST", body: JSON.stringify({ items }) }));
      showToast("Đã thêm sản phẩm vào giỏ hàng.");
    } catch (e) { showToast(e instanceof Error ? e.message : "Không thể thêm vào giỏ."); }
    finally { cartLock.current = false; setCartBusy(false); }
  }
  const handleAddBundleToCart = () => addToCart(currentOutfit);
  const handleAddProductToCart = (product: ProductItem) => addToCart([product]);
  async function removeCartItem(item: ProductItem) {
    if (cartLock.current) return;
    cartLock.current = true; setCartBusy(true);
    try { applyCart(await api<CartResponse>("cart/items/" + item.cartLineId, { method: "DELETE" })); }
    catch (e) { showToast(e instanceof Error ? e.message : "Không thể cập nhật giỏ hàng."); }
    finally { cartLock.current = false; setCartBusy(false); }
  }

  // Try on a product from catalog in Fitting Room
  const handleTryOnProduct = (product: ProductItem) => {
    window.location.href = `/fitting-room?productId=${encodeURIComponent(product.id)}`;
  };

  // Curated look apply
  const handleApplyLook = (look: LookBookItem) => {
    showToast(`Đang áp dụng: ${look.title} vào Fitting Room`);
    void handleSendMessage("Gợi ý phong cách " + look.title + " " + look.styleName);
    const element = document.getElementById("stylist");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // User uploaded photo handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUserPhoto(url);
      setHasUploadedUserPhoto(true);
      setViewMode("user");
      showToast("Đã chọn ảnh xem trước trên thiết bị. Thử đồ AI chưa được kết nối.");
    }
  };

  // Filtered shop products
  const filteredProducts = shopProducts.filter(item => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    return (selectedCategory === "ALL" || item.category === selectedCategory) && (!query || (item.name + " " + item.brand).toLocaleLowerCase("vi").includes(query));
  });

  return (
    <main>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)}>
          <div className="cart-drawer" onClick={e => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <h3>Giỏ hàng của bạn ({cart.length})</h3>
              <button className="cart-drawer-close" onClick={() => setIsCartOpen(false)} aria-label="Đóng giỏ hàng">
                <X size={18} />
              </button>
            </div>

            <div className="cart-drawer-items">
              {cart.length === 0 ? (
                <div className="cart-empty-state">
                  <ShoppingBag size={48} strokeWidth={1} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                  <p>Giỏ hàng chưa có sản phẩm nào.</p>
                  <p style={{ fontSize: "12px", color: "var(--muted-light)" }}>Hãy chọn sản phẩm từ Menu hoặc phòng thử AI!</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="shop-item-card">
                    <img src={item.image} alt={item.name} className="shop-item-img" />
                    <div className="shop-item-details">
                      <div className="shop-item-top">
                        <strong className="shop-item-name">{item.name}</strong>
                        <button
                          onClick={() => removeCartItem(item)} disabled={cartBusy || isCheckout} aria-label={"Xóa " + item.name}
                          style={{ color: "var(--muted-light)", padding: "2px" }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="shop-item-meta">
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Size: {item.selectedSize} · SL: {item.quantity || 1}</span>
                        <span className="shop-item-price">{money(item.price * (item.quantity || 1))}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="total-row">
                  <span className="total-label">Tổng thanh toán (đã gồm phí giao hàng)</span>
                  <span className="total-amount">
                    {money(cartTotals.total)}
                  </span>
                </div>
                <p>Phí giao hàng: {money(cartTotals.shippingFee)} · Miễn phí từ 1.000.000₫</p>
                {isCheckout ? <CheckoutForm onBack={() => setIsCheckout(false)} onComplete={order => {
                  applyCart({ items: [], subtotal: 0, shippingFee: 0, total: 0 });
                  setIsCheckout(false); setIsCartOpen(false);
                  showToast("Đã tạo đơn " + order.number + ". Xem tại Đơn hàng của bạn.");
                  void loadCatalog();
                }} /> : <button className="btn-buy-bundle" disabled={cartBusy} onClick={() => setIsCheckout(true)}><Check size={16} /> Tiến hành đặt hàng</button>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
            <div className="mobile-nav-top">
              <a href="#" className="logo"><i /> fitcraft</a>
              <button className="mobile-nav-close" onClick={() => setIsMobileMenuOpen(false)} aria-label="Đóng menu">
                <X size={20} />
              </button>
            </div>
            <nav className="mobile-nav-links">
              <a href="/fitting-room" onClick={() => setIsMobileMenuOpen(false)} className="mobile-nav-highlight">
                <Sparkles size={18} />
                <span>Phòng phối đồ</span>
              </a>
              <a href="#looks" onClick={() => setIsMobileMenuOpen(false)}>
                <span>Bộ sưu tập (Lookbook)</span>
              </a>
              <a href="#products" onClick={() => setIsMobileMenuOpen(false)}>
                <span>Sản phẩm shop</span>
              </a>
              <a href="/orders" onClick={() => setIsMobileMenuOpen(false)}>
                <span>Đơn hàng của bạn</span>
              </a>
              <a href="#closet" onClick={() => setIsMobileMenuOpen(false)}>
                <span>Tủ đồ số</span>
              </a>
            </nav>
            <div className="mobile-nav-footer">
              <p>Hotline hỗ trợ: <strong>1900 8888</strong> (8:30 - 21:30)</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          1. HEADER & TOP NAVIGATION
          ======================================================== */}
      <header className="top">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Mở danh mục điều hướng"
        >
          <Menu size={22} />
        </button>

        <a href="/" className="logo" aria-label="FitCraft - Trang chủ">
          <i /> fitcraft
        </a>

        <nav>
          <a href="/fitting-room" className="nav-highlight-link">
            <Sparkles size={14} className="nav-sparkle" /> Phòng phối đồ AI
          </a>
          <a href="#looks">Bộ sưu tập</a>
          <a href="#products">Sản phẩm shop</a>
          <a href="/orders">Đơn hàng của bạn</a>
          <a href="#closet">Tủ đồ số</a>
        </nav>

        {/* Smart Search Bar */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={16} color="var(--muted)" />
            <input
              type="text"
              placeholder="Tìm theo dịp, phong cách, màu sắc..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
          </div>

          {isSearchFocused && (
            <div className="search-dropdown">
              <div className="search-dropdown-title">Gợi ý tìm kiếm phổ biến</div>
              <div className="search-tags">
                {["Set đồ công sở", "Đi tiệc tối", "Tone màu Pastel", "Minimalist", "Mùa thu đông"].map(tag => (
                  <button
                    key={tag}
                    className="search-tag-item"
                    onMouseDown={() => {
                      setSearchQuery(tag);
                      handleSendMessage(`Tìm đồ phong cách: ${tag}`);
                      const el = document.getElementById("stylist");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tools & Cart */}
        <div className="tools">
          <div className="cart-btn-wrapper">
            <button className="icon-btn" onClick={() => setIsCartOpen(true)} aria-label="Xem giỏ hàng">
              <ShoppingBag size={18} />
              {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
            </button>
          </div>
          <ThemeToggle />
          <AuthMenu />
        </div>
      </header>

      {/* ========================================================
          2. HERO SECTION
          ======================================================== */}
      <section className="hero" data-reveal>
        <div className="hero-content">
          <span className="eyebrow-label">Stylist cá nhân của FitCraft</span>
          <h1>
            Mặc đúng gu.<br/><em>Sống đúng nhịp.</em>
          </h1>
          <p className="hero-description">
            Chọn dịp mặc và ngân sách. FitCraft ghép những món đang có trong shop thành một tổng thể hợp với bạn.
          </p>

          <div className="hero-cta-group">
            <a className="cta-primary" href="/fitting-room">
              Thử stylist ngay <span className="cta-icon"><ArrowRight size={16} /></span>
            </a>
            <a
              className="cta-outline"
              href="/fitting-room?upload=1"
            >
              <Camera size={16} strokeWidth={2.2} /> Xem trước với ảnh của tôi
            </a>
          </div>
        </div>

        <div className="heroImg">
          <img src={modelAngles[0].url} alt="Ảnh cảm hứng thời trang FitCraft" />
          <div className="heroImg-caption">
            <strong>Soft Tailoring</strong>
            <span>Một gợi ý thanh lịch cho ngày đi làm</span>
          </div>
        </div>
      </section>

      {/* ========================================================
          VALUE PROPS / TRUST BAR (CAM KẾT DỊCH VỤ)
          ======================================================== */}
      <section className="fc-home-props-bar" aria-label="Cam kết dịch vụ" data-reveal>
        <div className="fc-props-container">
          <div className="fc-prop-card">
            <div className="fc-prop-icon">
              <Truck size={20} />
            </div>
            <div className="fc-prop-text">
              <strong>Giao hàng & COD toàn quốc</strong>
              <span>Đồng kiểm khi nhận, freeship từ 1tr</span>
            </div>
          </div>
          <div className="fc-prop-card">
            <div className="fc-prop-icon">
              <RotateCcw size={20} />
            </div>
            <div className="fc-prop-text">
              <strong>Đổi trả linh hoạt 14 ngày</strong>
              <span>Hỗ trợ đổi size & mẫu tận nhà</span>
            </div>
          </div>
          <div className="fc-prop-card">
            <div className="fc-prop-icon">
              <Sparkles size={20} />
            </div>
            <div className="fc-prop-text">
              <strong>Stylist theo dịp và ngân sách</strong>
              <span>Gợi ý từ những sản phẩm đang còn hàng</span>
            </div>
          </div>
          <div className="fc-prop-card">
            <div className="fc-prop-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="fc-prop-text">
              <strong>Chất liệu chọn lọc cao cấp</strong>
              <span>Lụa, linen, organic cotton thoáng mát</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. CURATED LOOKBOOK SECTION
          ======================================================== */}
      <section className="section" id="looks" data-reveal>
        <div className="section-header">
            <span className="eyebrow-label">Bộ phối theo dịp</span>
          <h2>Chọn một tổng thể, không chỉ một món đồ</h2>
          <p>Ảnh cảm hứng cho những dịp khác nhau. Chọn một phong cách để thử đồ trực quan và nhận gợi ý từ shop.</p>
        </div>

        <div className="looks-grid">
          {curatedLooks.map(look => (
            <article
              key={look.id}
              className="look-card"
              style={{ cursor: "pointer" }}
              onClick={() => setViewingCombo(look)}
            >
              <img src={look.image} alt={look.title} />
              <div className="look-card-overlay">
                <span className="look-style-badge">{look.styleName}</span>
                <div className="look-info-box">
                  <h3 className="look-title">{look.title}</h3>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", margin: "2px 0", lineHeight: 1.4 }}>
                    {look.description}
                  </p>
                  <div className="look-details">
                    <span>Trọn bộ ước tính:</span>
                    <strong className="look-price">{look.estimatedPrice}</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                    <button
                      type="button"
                      className="btn-combo-card-detail"
                      onClick={e => {
                        e.stopPropagation();
                        setViewingCombo(look);
                      }}
                    >
                      <Eye size={14} /> Xem chi tiết ({look.items.length} món)
                    </button>
                    <button
                      type="button"
                      className="btn-combo-card-cart"
                      onClick={e => {
                        e.stopPropagation();
                        setViewingCombo(look);
                      }}
                    >
                      <ShoppingBag size={14} /> Chọn size & mua
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>


      {/* ========================================================
          5. MENU SẢN PHẨM CỦA SHOP (PRODUCT CATALOG)
          ======================================================== */}
      <section className="section" id="products" data-reveal>
        <div className="catalog-header-actions">
          <div>
            <span className="eyebrow-label">Danh mục FitCraft</span>
            <h2>Những món đồ để bạn mặc theo cách riêng</h2>
            <p>Khám phá danh mục của shop, chọn size và màu còn hàng để phối đồ hoặc đặt mua.</p>
          </div>

        </div>

        {/* Category Tabs */}
        <div className="catalog-filter-bar">
          <div className="category-tabs">
            {[
              { id: "ALL", label: "Tất cả sản phẩm" },
              { id: "TOP", label: "Áo (Tops)" },
              { id: "BOTTOM", label: "Quần & Váy (Bottoms)" },
              { id: "SKIRT", label: "Chân váy" },
              { id: "DRESS", label: "Váy liền" },
              { id: "OUTERWEAR", label: "Áo khoác / Blazer" },
              { id: "ACCESSORY", label: "Phụ kiện" },
              { id: "FOOTWEAR", label: "Giày" }
            ].map(tab => (
              <button
                key={tab.id}
                className={`category-tab-btn ${selectedCategory === tab.id ? "active" : ""}`}
                onClick={() => setSelectedCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>
            Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm
          </div>
        </div>

        {catalogLoading && <p role="status">Đang tải sản phẩm…</p>}
        {catalogError && <p role="alert" className="commerce-error">{catalogError} <button onClick={() => void loadCatalog()}>Thử lại</button></p>}
        {!catalogLoading && !catalogError && !filteredProducts.length && <p>Chưa có sản phẩm phù hợp.</p>}
        {/* Product Grid */}
        <div className="product-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-card-img-wrapper">
                <button className="catalog-image-link" aria-label={"Xem chi tiết " + product.name} onClick={() => setViewingProductId(product.id)}><img src={product.image} alt={product.name} loading="lazy" /></button>
                <div className="catalog-wardrobe-action"><AddToWardrobeButton product={product} compact /></div>

                <div className="product-badge-group">
                  {product.tagBadge && (
                    <span className={`product-badge ${product.tagBadge === "Mới về" || product.tagBadge === "Mới đăng" ? "new" : ""}`}>
                      {product.tagBadge}
                    </span>
                  )}
                  <span className="product-badge">
                    {wardrobeCategories[product.category] || product.category}
                  </span>
                </div>

                <div className="product-card-quick-actions">
                  <button
                    className="btn-card-tryon"
                    onClick={() => handleTryOnProduct(product)}
                    title="Đưa vào bộ phối đồ"
                  >
                    <Sparkles size={13} /> Phối thử
                  </button>
                  <button
                    className="btn-card-cart"
                    onClick={() => setViewingProductId(product.id)}
                    title="Chọn size và thêm vào giỏ hàng" aria-label={"Chọn size và mua " + product.name} disabled={cartBusy || !product.availableSizes.length}
                  >
                    <ShoppingBag size={15} />
                  </button>
                </div>
              </div>

              <div className="product-card-body">
                <div>
                  <div className="product-card-brand">{product.brand || "FitCraft Studio"}</div>
                  <h4 className="product-card-title"><button className="catalog-title-link" onClick={() => setViewingProductId(product.id)}>{product.name}</button></h4>
                  <button className="catalog-detail-link" onClick={() => setViewingProductId(product.id)}>Xem chi tiết & chọn size <ChevronRight size={14} /></button>
                </div>

                <div className="product-card-meta">
                  <span className="product-card-price">{product.priceFormatted}</span>
                  <span className="product-card-sizes">
                    Size: {product.availableSizes.join(", ")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          6. DIGITAL CLOSET (TỦ ĐỒ SỐ)
          ======================================================== */}
      <PersonalWardrobe />

      {/* Footer */}
      <Footer />

      {/* Floating Action Buttons */}
      <FloatingActions />

      {/* Combo Detail Modal */}
      {viewingProductId && <ProductDetailModal
        productId={viewingProductId}
        combo={curatedLooks.find(look => look.id === viewingProductId)}
        onClose={() => setViewingProductId(null)}
        onAdded={(data, checkout) => { applyCart(data); setViewingProductId(null); setIsCheckout(checkout); setIsCartOpen(true); }}
        onTryOn={title => { window.location.href = `/fitting-room?style=${encodeURIComponent(title)}`; }}
      />}
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
          window.location.href = `/fitting-room?style=${encodeURIComponent(title)}`;
        }}
      />
    </main>
  );
}
