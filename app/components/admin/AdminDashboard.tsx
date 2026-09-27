"use client";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Boxes, ClipboardList, LogOut, Menu, PackagePlus, RefreshCw, RotateCcw, ShieldCheck, ShoppingBag, Users, X, Sparkles, SlidersHorizontal } from "lucide-react";
import ComboStudio from "./ComboStudio";
import { api, money, orderStatuses, OrderView } from "../../../lib/client/api";
import ProductTaxonomyFields from "./ProductTaxonomyFields";
import { productGroupLabels } from "../../../lib/product-taxonomy";

type Tab = "overview" | "products" | "orders" | "returns" | "users" | "studio" | "settings";
type Variant = { id: string; sku: string; size: string; color: string; colorHex: string; stock: number };
type Product = { id: string; name: string; brand: string; category: string; subcategory: string | null; fit: string | null; price: number; image: string; active: boolean; variants: Variant[] };
type UserRow = { id: string; name: string; email: string; role: string; createdAt: string; _count?: { authSessions: number } };
type ReturnRow = { id: string; status: string; quantity: number; reason: string; createdAt: string; orderItem: { name: string; size: string; color: string }; order: { number: string; customerName: string; phone: string } };
type Dashboard = { stats: { products: number; activeProducts: number; lowStock: number; users: number; orders: number; pendingOrders: number; pendingReturns: number; deliveredRevenue: number; todayOrders: number }; recentOrders: OrderView[] };
const labels: Record<Tab, string> = { overview: "Tổng quan", products: "Sản phẩm", orders: "Đơn hàng", returns: "Đổi trả", users: "Người dùng", studio: "Trợ lý phối combo", settings: "Tính năng website" };

export default function AdminDashboard({ user }: { user: { id: string; name: string; email: string } }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [studioVersion, setStudioVersion] = useState(0);
  const [features, setFeatures] = useState<{ aiStylist: boolean } | null>(null);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("tab") === "studio") setTab("studio"); }, []);

  const load = useCallback(async (target: Tab = tab) => {
    setError("");
    try {
      if (target === "overview") setDashboard(await api<Dashboard>("admin/dashboard"));
      if (target === "products") setProducts((await api<{ products: Product[] }>("admin/products")).products);
      if (target === "orders") setOrders((await api<{ orders: OrderView[] }>("admin/orders")).orders);
      if (target === "returns") setReturns((await api<{ requests: ReturnRow[] }>("admin/returns")).requests);
      if (target === "users") setUsers((await api<{ users: UserRow[] }>("admin/users")).users);
      if (target === "settings") setFeatures(await api<{ aiStylist: boolean }>("admin/features"));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không thể tải dữ liệu quản trị.";
      setError(message);
      if (/đăng nhập|quyền quản trị/i.test(message)) setTimeout(() => { window.location.href = "/admin/login"; }, 800);
    }
  }, [tab]);

  useEffect(() => { void load(tab); }, [tab, load]);
  function flash(message: string) { setNotice(message); setTimeout(() => setNotice(""), 2500); }
  async function logout() { await api("auth/logout", { method: "POST" }); window.location.href = "/admin/login"; }
  async function perform(id: string, action: () => Promise<void>, success: string, reloadTab: Tab = tab) {
    setBusy(id); setError("");
    try { await action(); flash(success); await load(reloadTab); if (reloadTab !== "overview") setDashboard(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể cập nhật."); }
    finally { setBusy(""); }
  }

  const nav = [
    { id: "overview" as Tab, icon: BarChart3 }, { id: "studio" as Tab, icon: Sparkles }, { id: "products" as Tab, icon: Boxes },
    { id: "orders" as Tab, icon: ShoppingBag }, { id: "returns" as Tab, icon: RotateCcw }, { id: "users" as Tab, icon: Users },
    { id: "settings" as Tab, icon: SlidersHorizontal }
  ];
  return <main className="admin-shell">
    <aside className={"admin-sidebar " + (menuOpen ? "open" : "")}>
      <div className="admin-brand"><span><i /> fitcraft</span><small>ADMIN</small></div>
      <button className="admin-mobile-close" onClick={() => setMenuOpen(false)} aria-label="Đóng menu"><X size={20} /></button>
      <nav className="admin-nav">{nav.map(item => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => { setTab(item.id); setMenuOpen(false); }}><item.icon size={18} />{labels[item.id]}</button>)}</nav>
      <div className="admin-account"><strong>{user.name}</strong><span>{user.email}</span><button onClick={logout}><LogOut size={16} /> Đăng xuất</button></div>
    </aside>
    {menuOpen && <button className="admin-sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-label="Đóng menu" />}
    <section className="admin-main">
      <header className="admin-topbar">
        <button className="admin-menu-button" onClick={() => setMenuOpen(true)} aria-label="Mở menu"><Menu size={21} /></button>
        <div><p>KHU VỰC QUẢN TRỊ</p><h1>{labels[tab]}</h1></div>
        <div className="admin-top-actions">
          <button onClick={() => tab === "studio" ? setStudioVersion(v => v + 1) : void load(tab)} title="Tải lại"><RefreshCw size={17} /></button>
          <a href="/" target="_blank" rel="noreferrer">Xem website</a>
        </div>
      </header>
      <div className="admin-content">
        {error && <p className="commerce-error" role="alert">{error}</p>}
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        {tab === "overview" && <Overview data={dashboard} onNavigate={setTab} />}
        {tab === "studio" && <ComboStudio key={studioVersion} />}
        {tab === "products" && <Products products={products} busy={busy} open={createOpen} setOpen={setCreateOpen} perform={perform} />}
        {tab === "orders" && <Orders orders={orders} busy={busy} perform={perform} />}
        {tab === "returns" && <Returns rows={returns} busy={busy} perform={perform} />}
        {tab === "users" && <UsersTable rows={users} currentUserId={user.id} busy={busy} perform={perform} />}
        {tab === "settings" && <FeatureSettings features={features} busy={busy} perform={perform} />}
      </div>
    </section>
  </main>;
}

function FeatureSettings({ features, busy, perform }: { features: { aiStylist: boolean } | null; busy: string; perform: Perform }) {
  if (!features) return <Loading />;
  const enabled = features.aiStylist;
  return <section className="admin-feature-panel" aria-labelledby="feature-title">
    <div className="admin-feature-copy">
      <span className="admin-feature-kicker">Hiển thị trên gian hàng</span>
      <h2 id="feature-title">AI Stylist</h2>
      <p>Khi tắt, FitCraft ẩn banner, đường dẫn, nút nổi và phòng phối đồ AI khỏi phía khách. Trợ lý phối combo trong quản trị vẫn hoạt động độc lập.</p>
      <div className={"admin-feature-state " + (enabled ? "is-on" : "is-off")}>
        <i aria-hidden="true" />
        <span>{enabled ? "Đang hiển thị với khách" : "Đang tạm ẩn để cải thiện"}</span>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Bật hoặc tắt AI Stylist trên website"
      className="admin-feature-switch"
      disabled={busy === "ai-stylist-toggle"}
      onClick={() => perform("ai-stylist-toggle", async () => {
        const next = await api<{ aiStylist: boolean }>("admin/features/ai-stylist", { method: "PATCH", body: JSON.stringify({ enabled: !enabled }) });
        features.aiStylist = next.aiStylist;
      }, enabled ? "Đã tạm ẩn AI Stylist." : "Đã bật AI Stylist trên website.", "settings")}
    >
      <span className="admin-switch-track"><span className="admin-switch-thumb"><Sparkles size={14} /></span></span>
      <span className="admin-switch-label">{busy === "ai-stylist-toggle" ? "Đang cập nhật…" : enabled ? "Đang bật" : "Đang tắt"}</span>
    </button>
  </section>;
}

function Overview({ data, onNavigate }: { data: Dashboard | null; onNavigate: (tab: Tab) => void }) {
  if (!data) return <Loading />;
  const cards = [
    ["Doanh thu đã giao", money(data.stats.deliveredRevenue), "orders"],
    ["Đơn chờ xác nhận", String(data.stats.pendingOrders), "orders"],
    ["Yêu cầu đổi trả", String(data.stats.pendingReturns), "returns"],
    ["Sản phẩm đang bán", data.stats.activeProducts + " / " + data.stats.products, "products"],
    ["SKU sắp hết hàng", String(data.stats.lowStock), "products"],
    ["Người dùng", String(data.stats.users), "users"],
    ["Tổng đơn hàng", String(data.stats.orders), "orders"],
    ["Đơn hôm nay", String(data.stats.todayOrders), "orders"]
  ] as const;
  return <><div className="admin-stat-grid">{cards.map(([label, value, target]) => <button key={label} onClick={() => onNavigate(target)}><span>{label}</span><strong>{value}</strong></button>)}</div>
    <section className="admin-panel"><div className="admin-panel-title"><h2>Đơn hàng gần đây</h2><button onClick={() => onNavigate("orders")}>Xem tất cả</button></div>
      {!data.recentOrders.length ? <Empty text="Chưa có đơn hàng." /> : <div className="admin-table-wrap"><table><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Trạng thái</th><th>Tổng tiền</th></tr></thead><tbody>{data.recentOrders.map(order => <tr key={order.id}><td>{order.number}</td><td>{(order as OrderView & { customerName?: string }).customerName || "Khách"}</td><td><Status value={order.status} /></td><td>{money(order.total)}</td></tr>)}</tbody></table></div>}
    </section></>;
}

function Products({ products, busy, open, setOpen, perform }: { products: Product[]; busy: string; open: boolean; setOpen: (v: boolean) => void; perform: Perform }) {
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const sizes = String(form.get("sizes")).split(",").map(v => v.trim().toUpperCase()).filter(Boolean);
    const payload = { name: form.get("name"), brand: form.get("brand"), category: form.get("category"), subcategory: form.get("subcategory") || undefined, fit: form.get("fit") || undefined, price: Number(form.get("price")), image: form.get("image"), description: form.get("description"), material: form.get("material"), care: form.get("care"), style: form.get("style"), tags: Array.from(new Set(String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean))), tagBadge: form.get("tagBadge") || undefined, variants: sizes.map(size => ({ size, color: form.get("color"), colorHex: form.get("colorHex"), stock: Number(form.get("stock")) })) };
    await perform("create-product", async () => { await api("admin/products", { method: "POST", body: JSON.stringify(payload) }); setOpen(false); (event.target as HTMLFormElement).reset(); }, "Đã tạo sản phẩm.", "products");
  }
  return <><div className="admin-section-actions"><p>{products.length} sản phẩm trong trang hiện tại</p><button className="admin-primary" onClick={() => setOpen(!open)}><PackagePlus size={17} /> Thêm sản phẩm</button></div>
    {open && <form className="admin-create-form admin-panel" onSubmit={create}>
      <h2>Sản phẩm mới</h2><div className="admin-form-grid">
        <label>Tên sản phẩm<input name="name" required minLength={2} /></label><label>Thương hiệu<input name="brand" defaultValue="FitCraft Studio" required /></label>
        <ProductTaxonomyFields />
        <label>Giá bán<input name="price" type="number" min={1000} max={100000000} required /></label>
        <label className="wide">URL ảnh HTTPS<input name="image" type="url" required /></label>
        <label>Chất liệu<input name="material" /></label><label>Phong cách<input name="style" defaultValue="casual" /></label>
        <label className="wide">Mô tả<textarea name="description" /></label><label className="wide">Bảo quản<textarea name="care" /></label>
        <label>Size, cách nhau dấu phẩy<input name="sizes" defaultValue="S, M, L" required /></label><label>Màu<input name="color" defaultValue="Đen" required /></label>
        <label>Mã màu<input name="colorHex" type="color" defaultValue="#222222" required /></label><label>Tồn mỗi size<input name="stock" type="number" min={0} defaultValue={10} required /></label>
        <label>Huy hiệu<input name="tagBadge" placeholder="Mới về" /></label>
        <label>Tags, cách nhau dấu phẩy<input name="tags" placeholder="linen, summer, work" maxLength={500} /></label>
      </div><div className="admin-form-actions"><button type="button" onClick={() => setOpen(false)}>Hủy</button><button className="admin-primary" disabled={busy === "create-product"}>{busy === "create-product" ? "Đang lưu…" : "Tạo sản phẩm"}</button></div>
    </form>}
    {!products.length ? <Loading /> : <div className="admin-product-list">{products.map(product => <ProductEditor key={product.id} product={product} busy={busy} perform={perform} />)}</div>}</>;
}

function ProductEditor({ product, busy, perform }: { product: Product; busy: string; perform: Perform }) {
  const [price, setPrice] = useState(product.price);
  async function saveTaxonomy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await perform(product.id, () => api("admin/products/" + product.id, { method: "PATCH", body: JSON.stringify({ category: form.get("category"), subcategory: form.get("subcategory") || null, fit: form.get("fit") || null }) }).then(() => undefined), "Đã cập nhật phân loại sản phẩm.", "products");
  }
  return <article className="admin-product-card">
    <img src={product.image} alt="" /><div className="admin-product-main"><div><small>{product.brand} · {productGroupLabels[product.category as keyof typeof productGroupLabels] || product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}{product.fit ? ` · ${product.fit}` : ""}</small><h3>{product.name}</h3><span className={product.active ? "admin-live" : "admin-hidden"}>{product.active ? "Đang bán" : "Đã ẩn"}</span></div>
      <div className="admin-price-edit"><input aria-label={"Giá " + product.name} type="number" min={1000} value={price} onChange={e => setPrice(Number(e.target.value))} /><button disabled={busy === product.id || price === product.price} onClick={() => perform(product.id, () => api("admin/products/" + product.id, { method: "PATCH", body: JSON.stringify({ price }) }).then(() => undefined), "Đã cập nhật giá.", "products")}>Lưu giá</button>
      <button onClick={() => perform(product.id, () => api("admin/products/" + product.id, { method: "PATCH", body: JSON.stringify({ active: !product.active }) }).then(() => undefined), product.active ? "Đã ẩn sản phẩm." : "Đã mở bán sản phẩm.", "products")}>{product.active ? "Ẩn" : "Mở bán"}</button></div>
      <details className="admin-taxonomy-edit"><summary>Sửa phân loại</summary><form className="admin-form-grid" onSubmit={saveTaxonomy}><ProductTaxonomyFields initialGroup={product.category} initialSubcategory={product.subcategory} initialFit={product.fit} /><button className="admin-primary" disabled={busy === product.id}>Lưu phân loại</button></form></details>
    </div>
    <div className="admin-variant-grid">{product.variants.map(variant => <VariantStock key={variant.id} variant={variant} busy={busy} perform={perform} />)}</div>
  </article>;
}

function VariantStock({ variant, busy, perform }: { variant: Variant; busy: string; perform: Perform }) {
  const [stock, setStock] = useState(variant.stock);
  return <div className={variant.stock <= 5 ? "low" : ""}><span>{variant.size} · {variant.color}</span><small>{variant.sku}</small><div><input type="number" min={0} max={100000} value={stock} aria-label={"Tồn kho " + variant.sku} onChange={e => setStock(Number(e.target.value))} /><button disabled={busy === variant.id || stock === variant.stock} onClick={() => perform(variant.id, () => api("admin/variants/" + variant.id, { method: "PATCH", body: JSON.stringify({ stock, expectedStock: variant.stock }) }).then(() => undefined), "Đã cập nhật tồn kho.", "products")}>Lưu</button></div></div>;
}

function Orders({ orders, busy, perform }: { orders: OrderView[]; busy: string; perform: Perform }) {
  if (!orders.length) return <Loading />;
  return <div className="admin-order-list">{orders.map(order => <article className="admin-panel admin-order" key={order.id}>
    <div className="admin-order-head"><div><small>{new Date(order.createdAt).toLocaleString("vi-VN")}</small><h3>{order.number}</h3></div><Status value={order.status} /><strong>{money(order.total)}</strong></div>
    <div className="admin-order-customer"><span>{(order as OrderView & { customerName?: string }).customerName}</span><span>{(order as OrderView & { phone?: string }).phone}</span><span>{(order as OrderView & { address?: string; city?: string }).address}, {(order as OrderView & { city?: string }).city}</span></div>
    <details><summary>{order.items.length} dòng sản phẩm</summary>{order.items.map(item => <p key={item.id}>{item.name} · {item.color} · {item.size} × {item.quantity}</p>)}</details>
    <OrderActions order={order} busy={busy} perform={perform} />
  </article>)}</div>;
}

function OrderActions({ order, busy, perform }: { order: OrderView; busy: string; perform: Perform }) {
  const [carrier, setCarrier] = useState(order.carrier || "GHN");
  const [trackingNumber, setTracking] = useState(order.trackingNumber || "");
  const actions: Record<string, { value: string; label: string }[]> = { PENDING: [{ value: "CONFIRMED", label: "Xác nhận đơn" }, { value: "CANCELLED", label: "Hủy đơn" }], CONFIRMED: [{ value: "SHIPPED", label: "Bàn giao vận chuyển" }, { value: "CANCELLED", label: "Hủy đơn" }], SHIPPED: [{ value: "DELIVERED", label: "Xác nhận đã giao" }] };
  const update = (status: string) => perform(order.id, () => api("admin/orders/" + order.id, { method: "PATCH", body: JSON.stringify({ status, ...(status === "SHIPPED" ? { carrier, trackingNumber } : {}) }) }).then(() => undefined), "Đã cập nhật đơn hàng.", "orders");
  return <div className="admin-order-actions">
    {order.status === "CONFIRMED" && <><input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Đơn vị vận chuyển" /><input value={trackingNumber} onChange={e => setTracking(e.target.value)} placeholder="Mã vận đơn" /></>}
    {actions[order.status]?.map(action => <button key={action.value} className={action.value === "CANCELLED" ? "danger" : ""} disabled={busy === order.id || (action.value === "SHIPPED" && (!carrier || !trackingNumber))} onClick={() => update(action.value)}>{action.label}</button>)}
  </div>;
}

function Returns({ rows, busy, perform }: { rows: ReturnRow[]; busy: string; perform: Perform }) {
  if (!rows.length) return <Empty text="Chưa có yêu cầu đổi trả." />;
  return <div className="admin-order-list">{rows.map(row => <article className="admin-panel admin-return" key={row.id}>
    <div className="admin-order-head"><div><small>{new Date(row.createdAt).toLocaleString("vi-VN")}</small><h3>{row.order.number}</h3></div><Status value={"RETURN_" + row.status} /></div>
    <p><strong>{row.order.customerName}</strong> · {row.order.phone}</p><p>{row.orderItem.name} · {row.orderItem.color} · size {row.orderItem.size} × {row.quantity}</p><blockquote>{row.reason}</blockquote>
    <div className="admin-order-actions">{row.status === "REQUESTED" && <><button onClick={() => perform(row.id, () => api("admin/returns/" + row.id, { method: "PATCH", body: JSON.stringify({ status: "APPROVED" }) }).then(() => undefined), "Đã duyệt yêu cầu.", "returns")}>Duyệt</button><button className="danger" onClick={() => perform(row.id, () => api("admin/returns/" + row.id, { method: "PATCH", body: JSON.stringify({ status: "REJECTED" }) }).then(() => undefined), "Đã từ chối yêu cầu.", "returns")}>Từ chối</button></>}{row.status === "APPROVED" && <button disabled={busy === row.id} onClick={() => perform(row.id, () => api("admin/returns/" + row.id, { method: "PATCH", body: JSON.stringify({ status: "RECEIVED" }) }).then(() => undefined), "Đã ghi nhận hàng trả.", "returns")}>Đã nhận hàng trả</button>}</div>
  </article>)}</div>;
}

function UsersTable({ rows, currentUserId, busy, perform }: { rows: UserRow[]; currentUserId: string; busy: string; perform: Perform }) {
  if (!rows.length) return <Loading />;
  return <section className="admin-panel"><div className="admin-table-wrap"><table><thead><tr><th>Người dùng</th><th>Ngày tạo</th><th>Phiên</th><th>Quyền</th></tr></thead><tbody>{rows.map(user => <tr key={user.id}><td><strong>{user.name}{user.id === currentUserId ? " (bạn)" : ""}</strong><small>{user.email}</small></td><td>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td><td>{user._count?.authSessions || 0}</td><td><select aria-label={"Quyền của " + user.email} value={user.role} disabled={busy === user.id} onChange={e => perform(user.id, () => api("admin/users/" + user.id, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) }).then(() => undefined), "Đã cập nhật quyền người dùng.", "users")}><option value="CUSTOMER">Khách hàng</option><option value="ADMIN">Quản trị viên</option></select></td></tr>)}</tbody></table></div></section>;
}

type Perform = (id: string, action: () => Promise<void>, success: string, reloadTab?: Tab) => Promise<void>;
function Status({ value }: { value: string }) { const text: Record<string, string> = { ...orderStatuses, RETURN_REQUESTED: "Chờ duyệt", RETURN_APPROVED: "Đã duyệt", RETURN_REJECTED: "Từ chối", RETURN_RECEIVED: "Đã nhận hàng" }; return <span className={"admin-status status-" + value.toLowerCase()}>{text[value] || value}</span>; }
function Loading() { return <div className="admin-loading"><RefreshCw size={20} /> Đang tải dữ liệu…</div>; }
function Empty({ text }: { text: string }) { return <div className="admin-empty"><ClipboardList size={28} /><p>{text}</p></div>; }
