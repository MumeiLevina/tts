"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  Package,
  PackageCheck,
  PackageX,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  X,
  AlertCircle
} from "lucide-react";
import { api, money, orderStatuses, OrderView } from "../../lib/client/api";

type FilterTab = "ALL" | "PENDING" | "SHIPPING" | "DELIVERED" | "CANCELLED" | "RETURNS";
type SortOption = "newest" | "oldest" | "highest_total";

export default function OrderDashboard() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [copiedId, setCopiedId] = useState("");
  const [openEvents, setOpenEvents] = useState<Record<string, boolean>>({});

  // Cancel confirmation modal state
  const [cancelTarget, setCancelTarget] = useState<OrderView | null>(null);

  // Return request modal state
  const [returnTarget, setReturnTarget] = useState<OrderView | null>(null);
  const [returnItemId, setReturnItemId] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("");

  async function reload() {
    try {
      const data = await api<{ orders: OrderView[] }>("orders");
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đơn hàng.");
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    flash(`Đã sao chép ${label}: ${text}`);
    setTimeout(() => setCopiedId(""), 2000);
  }

  function toggleEvents(orderId: string) {
    setOpenEvents(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  }

  async function handleCancelOrder() {
    if (!cancelTarget) return;
    setBusy(cancelTarget.id);
    setError("");
    try {
      await api(`orders/${cancelTarget.id}/cancel`, { method: "POST" });
      flash(`Đã hủy thành công đơn hàng ${cancelTarget.number}`);
      setCancelTarget(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy đơn hàng.");
    } finally {
      setBusy("");
    }
  }

  async function handleReturnSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!returnTarget || !returnItemId) return;
    setBusy(returnTarget.id);
    setError("");
    try {
      await api(`orders/${returnTarget.id}/returns`, {
        method: "POST",
        body: JSON.stringify({
          orderItemId: returnItemId,
          quantity: Number(returnQuantity),
          reason: returnReason
        })
      });
      flash("Yêu cầu trả hàng đã được gửi tới shop.");
      setReturnTarget(null);
      setReturnItemId("");
      setReturnQuantity(1);
      setReturnReason("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi yêu cầu trả hàng.");
    } finally {
      setBusy("");
    }
  }

  // Statistics calculation
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pending = orders.filter(o => o.status === "PENDING").length;
    const shipping = orders.filter(o => o.status === "CONFIRMED" || o.status === "SHIPPED").length;
    const delivered = orders.filter(o => o.status === "DELIVERED").length;
    const cancelled = orders.filter(o => o.status === "CANCELLED").length;
    const returns = orders.filter(o => o.returns && o.returns.length > 0).length;
    const totalSpent = orders
      .filter(o => o.status !== "CANCELLED")
      .reduce((sum, o) => sum + o.total, 0);

    return { totalOrders, pending, shipping, delivered, cancelled, returns, totalSpent };
  }, [orders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        // Tab filter
        if (filterTab === "PENDING" && order.status !== "PENDING") return false;
        if (filterTab === "SHIPPING" && order.status !== "CONFIRMED" && order.status !== "SHIPPED") return false;
        if (filterTab === "DELIVERED" && order.status !== "DELIVERED") return false;
        if (filterTab === "CANCELLED" && order.status !== "CANCELLED") return false;
        if (filterTab === "RETURNS" && (!order.returns || order.returns.length === 0)) return false;

        // Search query
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchNumber = order.number.toLowerCase().includes(q);
          const matchCarrier = order.carrier?.toLowerCase().includes(q) || false;
          const matchTracking = order.trackingNumber?.toLowerCase().includes(q) || false;
          const matchItem = order.items.some(
            i => i.name.toLowerCase().includes(q) || i.color.toLowerCase().includes(q) || i.size.toLowerCase().includes(q)
          );
          if (!matchNumber && !matchCarrier && !matchTracking && !matchItem) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === "highest_total") return b.total - a.total;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [orders, filterTab, search, sortBy]);

  return (
    <div className="order-dashboard-wrapper">
      {/* Toast Notification */}
      {notice && (
        <div className="order-toast" role="status">
          <CheckCircle2 size={18} className="toast-icon" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Breadcrumb & Action Header */}
      <header className="order-dash-nav">
        <a href="/" className="order-back-btn">
          <ArrowLeft size={16} />
          <span>Quay lại cửa hàng FitCraft</span>
        </a>
        <div className="order-nav-right">
          <button
            onClick={() => {
              setLoading(true);
              reload().finally(() => setLoading(false));
            }}
            className="order-refresh-btn"
            title="Tải lại đơn hàng"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            <span>Cập nhật</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="order-dash-container">
        {/* Hero Section */}
        <section className="order-dash-hero">
          <div className="hero-content">
            <span className="hero-badge">
              <Package size={14} /> Trung tâm theo dõi đơn hàng
            </span>
            <h1>Đơn hàng của bạn</h1>
            <p>
              Theo dõi lộ trình giao hàng, chi tiết sản phẩm và quản lý yêu cầu đổi trả theo thời gian thực.
            </p>
          </div>
        </section>

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="commerce-error order-error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Đóng lỗi">
              <X size={16} />
            </button>
          </div>
        )}

        {/* KPI / Statistics Cards Grid */}
        <section className="order-kpi-grid">
          <div
            className={`order-kpi-card ${filterTab === "ALL" ? "active" : ""}`}
            onClick={() => setFilterTab("ALL")}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon-wrap neutral">
              <ShoppingBag size={20} />
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Tổng đơn hàng</span>
              <strong className="kpi-value">{stats.totalOrders}</strong>
            </div>
          </div>

          <div
            className={`order-kpi-card ${filterTab === "PENDING" ? "active" : ""}`}
            onClick={() => setFilterTab("PENDING")}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon-wrap warning">
              <Clock size={20} />
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Chờ xác nhận</span>
              <strong className="kpi-value">{stats.pending}</strong>
            </div>
          </div>

          <div
            className={`order-kpi-card ${filterTab === "SHIPPING" ? "active" : ""}`}
            onClick={() => setFilterTab("SHIPPING")}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon-wrap info">
              <Truck size={20} />
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Đang vận chuyển</span>
              <strong className="kpi-value">{stats.shipping}</strong>
            </div>
          </div>

          <div
            className={`order-kpi-card ${filterTab === "DELIVERED" ? "active" : ""}`}
            onClick={() => setFilterTab("DELIVERED")}
            role="button"
            tabIndex={0}
          >
            <div className="kpi-icon-wrap success">
              <PackageCheck size={20} />
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Đã nhận hàng</span>
              <strong className="kpi-value">{stats.delivered}</strong>
            </div>
          </div>

          <div className="order-kpi-card highlight-card">
            <div className="kpi-icon-wrap accent">
              <Calendar size={20} />
            </div>
            <div className="kpi-data">
              <span className="kpi-label">Tổng tích lũy mua sắm</span>
              <strong className="kpi-value highlight">{money(stats.totalSpent)}</strong>
            </div>
          </div>
        </section>

        {/* Filter Toolbar & Search */}
        <section className="order-filter-toolbar">
          {/* Status Tabs */}
          <div className="order-tabs-scroll">
            <div className="order-tabs">
              <button
                className={`tab-btn ${filterTab === "ALL" ? "active" : ""}`}
                onClick={() => setFilterTab("ALL")}
              >
                Tất cả <span className="badge">{stats.totalOrders}</span>
              </button>
              <button
                className={`tab-btn ${filterTab === "PENDING" ? "active" : ""}`}
                onClick={() => setFilterTab("PENDING")}
              >
                Chờ xác nhận <span className="badge">{stats.pending}</span>
              </button>
              <button
                className={`tab-btn ${filterTab === "SHIPPING" ? "active" : ""}`}
                onClick={() => setFilterTab("SHIPPING")}
              >
                Đang giao hàng <span className="badge">{stats.shipping}</span>
              </button>
              <button
                className={`tab-btn ${filterTab === "DELIVERED" ? "active" : ""}`}
                onClick={() => setFilterTab("DELIVERED")}
              >
                Hoàn thành <span className="badge">{stats.delivered}</span>
              </button>
              <button
                className={`tab-btn ${filterTab === "CANCELLED" ? "active" : ""}`}
                onClick={() => setFilterTab("CANCELLED")}
              >
                Đã hủy <span className="badge">{stats.cancelled}</span>
              </button>
              {stats.returns > 0 && (
                <button
                  className={`tab-btn ${filterTab === "RETURNS" ? "active" : ""}`}
                  onClick={() => setFilterTab("RETURNS")}
                >
                  Đổi / Trả <span className="badge warning">{stats.returns}</span>
                </button>
              )}
            </div>
          </div>

          {/* Search and Sort controls */}
          <div className="order-controls-row">
            <div className="order-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo mã đơn (FC-...), tên món đồ..."
              />
              {search && (
                <button className="clear-search-btn" onClick={() => setSearch("")} title="Xóa tìm kiếm">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="order-sort-box">
              <SlidersHorizontal size={14} className="sort-icon" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                aria-label="Sắp xếp danh sách"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="highest_total">Giá trị cao nhất</option>
              </select>
            </div>
          </div>
        </section>

        {/* Order Cards List or Empty States */}
        {loading ? (
          <div className="order-loading-state">
            <RefreshCw size={28} className="spin" />
            <p>Đang đồng bộ dữ liệu đơn hàng của bạn…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="order-empty-state">
            <div className="empty-icon-circle">
              <ShoppingBag size={48} />
            </div>
            <h2>Bạn chưa có đơn hàng nào</h2>
            <p>Khám phá ngay bộ sưu tập thời trang cao cấp FitCraft và trải nghiệm mua sắm thông minh.</p>
            <a href="/" className="cta-primary empty-action-btn">
              Khám phá sản phẩm ngay
            </a>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="order-empty-filter">
            <PackageX size={36} />
            <h3>Không tìm thấy đơn hàng phù hợp</h3>
            <p>Thử tìm kiếm với từ khóa khác hoặc chuyển sang tab trạng thái khác.</p>
            <button
              className="btn-secondary-reset"
              onClick={() => {
                setSearch("");
                setFilterTab("ALL");
              }}
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="order-cards-list">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                busy={busy === order.id}
                copiedId={copiedId}
                eventsOpen={!!openEvents[order.id]}
                onToggleEvents={() => toggleEvents(order.id)}
                onCopyCode={() => copyToClipboard(order.number, "mã đơn hàng")}
                onCopyTracking={tr => copyToClipboard(tr, "mã vận đơn")}
                onInitiateCancel={() => setCancelTarget(order)}
                onInitiateReturn={() => {
                  setReturnTarget(order);
                  setReturnItemId(order.items[0]?.id || "");
                  setReturnQuantity(1);
                  setReturnReason("");
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* MODAL: Hủy đơn hàng xác nhận */}
      {cancelTarget && (
        <div className="order-modal-backdrop" onClick={() => setCancelTarget(null)}>
          <div className="order-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-danger">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3>Xác nhận hủy đơn hàng</h3>
                <p className="modal-sub">Mã đơn: <strong>{cancelTarget.number}</strong></p>
              </div>
              <button className="modal-close" onClick={() => setCancelTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Bạn có chắc chắn muốn hủy đơn hàng này không? Sau khi hủy, hệ thống sẽ tự động hoàn lại số lượng tồn kho sản phẩm. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setCancelTarget(null)}
                disabled={!!busy}
              >
                Giữ đơn hàng
              </button>
              <button
                type="button"
                className="btn-modal-confirm-danger"
                onClick={handleCancelOrder}
                disabled={!!busy}
              >
                {busy === cancelTarget.id ? "Đang hủy đơn…" : "Xác nhận hủy đơn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Yêu cầu đổi / trả hàng */}
      {returnTarget && (
        <div className="order-modal-backdrop" onClick={() => setReturnTarget(null)}>
          <div className="order-modal-card return-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-return">
                <RotateCcw size={24} />
              </div>
              <div>
                <h3>Yêu cầu trả hàng / Hoàn tiền</h3>
                <p className="modal-sub">Đơn hàng: <strong>{returnTarget.number}</strong></p>
              </div>
              <button className="modal-close" onClick={() => setReturnTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="return-modal-form">
              <div className="modal-policy-badge">
                <HelpCircle size={15} />
                <span>Hỗ trợ đổi trả trong vòng 14 ngày kể từ khi nhận hàng theo chính sách của shop.</span>
              </div>

              <label className="return-form-field">
                <span className="field-label">Chọn sản phẩm cần trả</span>
                <select
                  value={returnItemId}
                  onChange={e => setReturnItemId(e.target.value)}
                  required
                >
                  {returnTarget.items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} · Size {item.size} · Màu {item.color} (Mua {item.quantity} món)
                    </option>
                  ))}
                </select>
              </label>

              <label className="return-form-field">
                <span className="field-label">Số lượng cần trả</span>
                <input
                  type="number"
                  min={1}
                  max={returnTarget.items.find(i => i.id === returnItemId)?.quantity || 1}
                  value={returnQuantity}
                  onChange={e => setReturnQuantity(Math.max(1, Number(e.target.value)))}
                  required
                />
              </label>

              <label className="return-form-field">
                <span className="field-label">Lý do trả hàng</span>
                <textarea
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  placeholder="Vui lòng mô tả chi tiết lý do (ví dụ: không vừa size, đổi ý, sản phẩm lỗi...)"
                  minLength={10}
                  maxLength={1000}
                  required
                  rows={3}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setReturnTarget(null)}
                  disabled={!!busy}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="cta-primary btn-submit-return"
                  disabled={!!busy || !returnReason.trim()}
                >
                  {busy === returnTarget.id ? "Đang gửi yêu cầu…" : "Gửi yêu cầu trả hàng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Order Card Component
function OrderCard({
  order,
  busy,
  copiedId,
  eventsOpen,
  onToggleEvents,
  onCopyCode,
  onCopyTracking,
  onInitiateCancel,
  onInitiateReturn
}: {
  order: OrderView;
  busy: boolean;
  copiedId: string;
  eventsOpen: boolean;
  onToggleEvents: () => void;
  onCopyCode: () => void;
  onCopyTracking: (trackingNumber: string) => void;
  onInitiateCancel: () => void;
  onInitiateReturn: () => void;
}) {
  const statusConfig: Record<string, { label: string; class: string }> = {
    PENDING: { label: "Chờ xác nhận", class: "status-pending" },
    CONFIRMED: { label: "Đã xác nhận", class: "status-confirmed" },
    SHIPPED: { label: "Đang giao hàng", class: "status-shipped" },
    DELIVERED: { label: "Đã giao thành công", class: "status-delivered" },
    CANCELLED: { label: "Đã hủy", class: "status-cancelled" }
  };

  const currentStatus = statusConfig[order.status] || {
    label: orderStatuses[order.status] || order.status,
    class: "status-default"
  };

  // Stepper calculations
  const isCancelled = order.status === "CANCELLED";
  const stepIndex =
    order.status === "PENDING"
      ? 1
      : order.status === "CONFIRMED"
      ? 2
      : order.status === "SHIPPED"
      ? 3
      : order.status === "DELIVERED"
      ? 4
      : 0;

  const returnStatusLabels: Record<string, { label: string; class: string }> = {
    REQUESTED: { label: "Chờ duyệt trả hàng", class: "return-requested" },
    APPROVED: { label: "Đã duyệt trả hàng", class: "return-approved" },
    REJECTED: { label: "Từ chối trả hàng", class: "return-rejected" },
    RECEIVED: { label: "Đã nhận hàng, chờ hoàn tiền", class: "return-received" }
  };

  return (
    <article className={`order-card-container ${isCancelled ? "cancelled-border" : ""}`}>
      {/* Top Bar: Order Code, Status, Date */}
      <div className="order-card-header">
        <div className="order-id-group">
          <span className="order-label">MÃ ĐƠN HÀNG</span>
          <div className="order-code-badge">
            <h3 className="order-code">{order.number}</h3>
            <button
              onClick={onCopyCode}
              className="copy-btn"
              title="Sao chép mã đơn hàng"
              aria-label="Sao chép mã đơn"
            >
              {copiedId === order.number ? <Check size={14} className="copied" /> : <Copy size={14} />}
            </button>
          </div>
          <span className="order-date">
            <Calendar size={13} />
            {new Date(order.createdAt).toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            })}
          </span>
        </div>

        <div className="order-status-group">
          <span className={`order-status-pill ${currentStatus.class}`}>
            {currentStatus.label}
          </span>
          <span className="order-payment-badge">
            COD · {order.paymentStatus === "PAID" ? "Đã thanh toán" : "Thanh toán khi nhận"}
          </span>
        </div>
      </div>

      {/* Delivery Stepper Tracker */}
      {!isCancelled ? (
        <div className="order-stepper-wrap">
          <div className="order-stepper">
            <div className={`step-node ${stepIndex >= 1 ? "completed" : ""}`}>
              <div className="step-circle">
                {stepIndex > 1 ? <Check size={14} /> : <span className="step-number">1</span>}
              </div>
              <span className="step-name">Đặt hàng</span>
            </div>
            <div className={`step-line ${stepIndex >= 2 ? "active" : ""}`} />

            <div className={`step-node ${stepIndex >= 2 ? "completed" : stepIndex === 1 ? "current" : ""}`}>
              <div className="step-circle">
                {stepIndex > 2 ? <Check size={14} /> : <span className="step-number">2</span>}
              </div>
              <span className="step-name">Xác nhận</span>
            </div>
            <div className={`step-line ${stepIndex >= 3 ? "active" : ""}`} />

            <div className={`step-node ${stepIndex >= 3 ? "completed" : stepIndex === 2 ? "current" : ""}`}>
              <div className="step-circle">
                {stepIndex > 3 ? <Check size={14} /> : <Truck size={14} />}
              </div>
              <span className="step-name">Đang giao</span>
            </div>
            <div className={`step-line ${stepIndex >= 4 ? "active" : ""}`} />

            <div className={`step-node ${stepIndex === 4 ? "completed finish" : ""}`}>
              <div className="step-circle">
                <PackageCheck size={14} />
              </div>
              <span className="step-name">Đã nhận</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="order-cancelled-banner">
          <AlertCircle size={17} />
          <span>Đơn hàng đã được hủy. Mọi sản phẩm trong đơn đã được tự động hoàn lại kho.</span>
        </div>
      )}

      {/* Tracking info if available */}
      {order.trackingNumber && (
        <div className="order-tracking-strip">
          <div className="tracking-info">
            <Truck size={17} className="tracking-icon" />
            <span>Đơn vị giao vận: <strong>{order.carrier || "Chuyển phát nhanh"}</strong></span>
            <span className="divider">·</span>
            <span>Mã vận đơn: <strong className="tracking-code">{order.trackingNumber}</strong></span>
          </div>
          <button
            onClick={() => onCopyTracking(order.trackingNumber!)}
            className="btn-tracking-copy"
            title="Sao chép mã vận đơn"
          >
            {copiedId === order.trackingNumber ? <Check size={14} /> : <Copy size={14} />}
            <span>Sao chép</span>
          </button>
        </div>
      )}

      {/* Product Items List */}
      <div className="order-items-table">
        {order.items.map(item => (
          <div key={item.id} className="order-item-row">
            <div className="item-thumbnail-wrap">
              {item.image ? (
                <img src={item.image} alt={item.name} className="item-img" />
              ) : (
                <div className="item-img-placeholder">
                  <Package size={20} />
                </div>
              )}
            </div>
            <div className="item-info">
              <h4 className="item-name">{item.name}</h4>
              <div className="item-specs">
                <span className="spec-badge">Size: {item.size}</span>
                <span className="spec-badge">Màu: {item.color}</span>
                {item.sku && <span className="spec-sku">{item.sku}</span>}
              </div>
            </div>
            <div className="item-pricing">
              <span className="item-calc">
                {money(item.unitPrice)} × {item.quantity}
              </span>
              <strong className="item-subtotal">
                {money(item.unitPrice * item.quantity)}
              </strong>
            </div>
          </div>
        ))}
      </div>

      {/* Return Requests list if any */}
      {order.returns && order.returns.length > 0 && (
        <div className="order-returns-box">
          <h5 className="returns-box-title">
            <RotateCcw size={15} /> Yêu cầu đổi trả đã tạo:
          </h5>
          <div className="returns-list">
            {order.returns.map(r => {
              const item = order.items.find(i => i.id === r.orderItemId);
              const rConfig = returnStatusLabels[r.status] || { label: r.status, class: "return-default" };
              return (
                <div key={r.id} className="return-item-row">
                  <div className="return-meta">
                    <strong>{item?.name || "Sản phẩm"}</strong>
                    <span>(Số lượng: {r.quantity})</span>
                    <span className={`return-status-tag ${rConfig.class}`}>{rConfig.label}</span>
                  </div>
                  <p className="return-reason-text">Lý do: &ldquo;{r.reason}&rdquo;</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Breakdown Footer */}
      <div className="order-financial-breakdown">
        <div className="financial-lines">
          <div className="fin-row">
            <span>Tạm tính hàng hóa:</span>
            <span>{money(order.subtotal || order.total - order.shippingFee)}</span>
          </div>
          <div className="fin-row">
            <span>Phí vận chuyển:</span>
            <span>{order.shippingFee === 0 ? "Miễn phí" : money(order.shippingFee)}</span>
          </div>
          <div className="fin-row total-fin-row">
            <span>Tổng số tiền thanh toán:</span>
            <span className="grand-total">{money(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Event Accordion */}
      <div className="order-card-footer">
        <button
          className="btn-toggle-events"
          onClick={onToggleEvents}
          aria-expanded={eventsOpen}
        >
          {eventsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{eventsOpen ? "Thu gọn lịch sử xử lý" : `Lịch sử xử lý đơn (${order.events.length})`}</span>
        </button>

        <div className="order-card-actions">
          {order.status === "PENDING" && (
            <button
              className="btn-action-cancel"
              onClick={onInitiateCancel}
              disabled={busy}
            >
              Hủy đơn hàng
            </button>
          )}

          {order.status === "DELIVERED" && (
            <button
              className="btn-action-return"
              onClick={onInitiateReturn}
              disabled={busy}
            >
              <RotateCcw size={15} />
              <span>Yêu cầu đổi / trả</span>
            </button>
          )}

          <a
            href="tel:19008888"
            className="btn-action-support"
            title="Liên hệ hotline chăm sóc khách hàng"
          >
            <HelpCircle size={15} />
            <span>Hỗ trợ</span>
          </a>
        </div>
      </div>

      {/* Collapsible Audit Events History */}
      {eventsOpen && (
        <div className="order-events-accordion">
          <div className="events-timeline">
            {order.events.map((event, idx) => (
              <div key={event.id} className="timeline-node">
                <div className="node-marker">
                  <div className="node-dot" />
                  {idx < order.events.length - 1 && <div className="node-connector" />}
                </div>
                <div className="node-content">
                  <span className="node-time">
                    {new Date(event.createdAt).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    })}
                  </span>
                  <p className="node-note">{event.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
