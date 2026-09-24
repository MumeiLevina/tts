let sessionReady: Promise<void> | undefined;
function ensureSession() {
  if (!sessionReady) sessionReady = fetch("/api/v1/cart", { credentials: "same-origin" }).then(async response => {
    if (!response.ok) throw new Error("Không thể khởi tạo phiên mua sắm.");
  }).catch(error => { sessionReady = undefined; throw error; });
  return sessionReady;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Serialize first-session creation so concurrent private requests share one cookie.
  if (/^(cart|orders|wishlist|wardrobe|outfits|items)(\/|\?|$)/.test(path)) await ensureSession();
  const response = await fetch("/api/v1/" + path, { ...init, credentials: "same-origin", headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Không thể kết nối với máy chủ.");
  return data as T;
}
export const money = (amount: number) => amount.toLocaleString("vi-VN") + "₫";
export type OrderView = { id: string; number: string; status: string; paymentStatus: string; subtotal?: number; total: number; shippingFee: number; createdAt: string; deliveredAt: string | null; trackingNumber: string | null; carrier: string | null; items: { id: string; name: string; size: string; color: string; quantity: number; unitPrice: number; image?: string; sku?: string }[]; events: { id: string; status: string; note: string; createdAt: string }[]; returns: { id: string; orderItemId: string; quantity: number; status: string; reason: string }[] };
export const orderStatuses: Record<string, string> = { PENDING: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", SHIPPED: "Đang giao hàng", DELIVERED: "Đã giao", CANCELLED: "Đã hủy" };
