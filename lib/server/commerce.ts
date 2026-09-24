import { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";
import { presentProduct } from "./catalog";
import { checkoutInput } from "./validation";

export const policy = { currency: "VND", shippingFee: 30000, freeShippingThreshold: 1000000, returnWindowDays: 14, paymentMethods: ["COD"], note: "Chính sách mẫu của FitCraft; cần được chủ shop xác nhận trước khi mở bán." };
export const shippingFee = (subtotal: number) => subtotal === 0 || subtotal >= policy.freeShippingThreshold ? 0 : policy.shippingFee;

export async function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(fn, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 }); }
    catch (error) {
      const retry = error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P1008", "P2028", "P2002"].includes(error.code);
      if (!retry || attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
}

export async function getCart(sessionId: string) {
  const lines = await db.cartItem.findMany({ where: { sessionId }, include: { variant: { include: { product: { include: { variants: true } } } } }, orderBy: { id: "asc" } });
  const items = lines.map(line => ({ id: line.id, variantId: line.variantId, quantity: line.quantity, size: line.variant.size, color: line.variant.color, stock: line.variant.stock, available: line.variant.product.active && line.variant.stock >= line.quantity, product: presentProduct(line.variant.product), lineTotal: line.quantity * line.variant.product.price }));
  const subtotal = items.reduce((sum, line) => sum + line.lineTotal, 0);
  return { items, subtotal, shippingFee: shippingFee(subtotal), total: subtotal + shippingFee(subtotal), currency: "VND" };
}

export const cartInput = z.object({ items: z.array(z.object({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(20) }).strict()).min(1).max(20) }).strict();
export async function addCart(sessionId: string, input: z.infer<typeof cartInput>) {
  await transaction(async tx => {
    const amounts = new Map<string, number>();
    input.items.forEach(i => amounts.set(i.variantId, (amounts.get(i.variantId) || 0) + i.quantity));
    const existingCount = await tx.cartItem.count({ where: { sessionId } });
    if (existingCount + amounts.size > 100) throw new ApiError(400, "CART_LIMIT", "Giỏ hàng tối đa 100 dòng sản phẩm.");
    for (const [variantId, amount] of Array.from(amounts)) {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
      if (!variant?.product.active) throw new ApiError(404, "NOT_FOUND", "Sản phẩm không còn được bán.");
      const current = await tx.cartItem.findUnique({ where: { sessionId_variantId: { sessionId, variantId } } });
      const quantity = (current?.quantity || 0) + amount;
      if (quantity > 20 || quantity > variant.stock) throw new ApiError(409, "INSUFFICIENT_STOCK", `Không đủ tồn kho cho ${variant.product.name}, size ${variant.size}.`);
      await tx.cartItem.upsert({ where: { sessionId_variantId: { sessionId, variantId } }, create: { sessionId, variantId, quantity }, update: { quantity } });
    }
  });
  return getCart(sessionId);
}

export async function setCartQuantity(sessionId: string, id: string, quantity: number) {
  await transaction(async tx => {
    const line = await tx.cartItem.findFirst({ where: { id, sessionId }, include: { variant: { include: { product: true } } } });
    if (!line) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy món đồ trong giỏ.");
    if (!quantity) { await tx.cartItem.delete({ where: { id } }); return; }
    if (!line.variant.product.active || quantity > line.variant.stock) throw new ApiError(409, "INSUFFICIENT_STOCK", "Sản phẩm không đủ tồn kho.");
    await tx.cartItem.update({ where: { id }, data: { quantity } });
  });
  return getCart(sessionId);
}

export const orderInclude = { items: true, events: { orderBy: { createdAt: "asc" as const } }, returns: true };
export function publicOrder<T extends { sessionId: string; requestHash: string; idempotencyKey: string }>(order: T) {
  const { sessionId: _s, requestHash: _h, idempotencyKey: _k, ...result } = order;
  return result;
}

export async function checkout(sessionId: string, key: string, input: z.infer<typeof checkoutInput>) {
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return transaction(async tx => {
    const existing = await tx.order.findUnique({ where: { sessionId_idempotencyKey: { sessionId, idempotencyKey: key } }, include: orderInclude });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "Mã yêu cầu đã được sử dụng cho thông tin khác.");
      return publicOrder(existing);
    }
    const lines = await tx.cartItem.findMany({ where: { sessionId }, include: { variant: { include: { product: true } } } });
    if (!lines.length) throw new ApiError(400, "EMPTY_CART", "Giỏ hàng đang trống.");
    let subtotal = 0;
    for (const line of lines) {
      if (!line.variant.product.active) throw new ApiError(409, "PRODUCT_UNAVAILABLE", "Có sản phẩm đã ngừng bán.");
      const reserved = await tx.productVariant.updateMany({ where: { id: line.variantId, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
      if (!reserved.count) throw new ApiError(409, "INSUFFICIENT_STOCK", `Không đủ hàng: ${line.variant.product.name}, size ${line.variant.size}.`);
      subtotal += line.quantity * line.variant.product.price;
    }
    const fee = shippingFee(subtotal);
    if (subtotal + fee > 2000000000) throw new ApiError(400, "ORDER_LIMIT", "Giá trị đơn hàng vượt giới hạn. Vui lòng liên hệ shop.");
    const order = await tx.order.create({ data: {
      ...input, sessionId, idempotencyKey: key, requestHash,
      number: `FC-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`,
      subtotal, shippingFee: fee, total: subtotal + fee,
      items: { create: lines.map(({ variant: v, quantity }) => ({ productId: v.productId, variantId: v.id, name: v.product.name, sku: v.sku, size: v.size, color: v.color, image: v.product.image, unitPrice: v.product.price, quantity })) },
      events: { create: { status: "PENDING", note: "Đã nhận đơn hàng COD; chờ shop xác nhận." } }
    }, include: orderInclude });
    await tx.cartItem.deleteMany({ where: { sessionId } });
    return publicOrder(order);
  });
}

const transitions: Record<string, string[]> = { PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["SHIPPED", "CANCELLED"], SHIPPED: ["DELIVERED"], DELIVERED: [], CANCELLED: [] };
export async function changeOrder(id: string, status: string, sessionId?: string, tracking?: { trackingNumber?: string; carrier?: string }) {
  return transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id, ...(sessionId ? { sessionId } : {}) }, include: { items: true } });
    if (!order) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng.");
    if (sessionId && (status !== "CANCELLED" || order.status !== "PENDING")) throw new ApiError(409, "CANNOT_CANCEL", "Chỉ có thể tự hủy đơn đang chờ xác nhận.");
    if (!transitions[order.status]?.includes(status)) throw new ApiError(409, "INVALID_TRANSITION", "Không thể chuyển trạng thái đơn hàng như yêu cầu.");
    if (status === "SHIPPED" && (!tracking?.trackingNumber || !tracking?.carrier)) throw new ApiError(400, "TRACKING_REQUIRED", "Cần đơn vị vận chuyển và mã vận đơn.");
    const changed = await tx.order.updateMany({ where: { id, status: order.status }, data: { status, ...(status === "SHIPPED" ? tracking : {}), ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}) } });
    if (!changed.count) throw new ApiError(409, "ORDER_CHANGED", "Đơn hàng vừa được cập nhật. Hãy tải lại.");
    if (status === "CANCELLED") for (const item of order.items) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
    await tx.orderEvent.create({ data: { orderId: id, status, note: sessionId ? "Khách hàng hủy đơn." : "Shop cập nhật đơn hàng." } });
    return publicOrder(await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude }));
  });
}

export const returnInput = z.object({ orderItemId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(20), reason: z.string().trim().min(10).max(1000) }).strict();
export async function requestReturn(sessionId: string, id: string, input: z.infer<typeof returnInput>) {
  return transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id, sessionId }, include: { items: true, returns: true } });
    if (!order) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng.");
    if (order.status !== "DELIVERED" || !order.deliveredAt || Date.now() - order.deliveredAt.getTime() > policy.returnWindowDays * 86400000) throw new ApiError(409, "RETURN_NOT_ELIGIBLE", "Đơn hàng chưa được giao hoặc đã quá thời hạn trả hàng.");
    const item = order.items.find(i => i.id === input.orderItemId);
    const requested = order.returns.filter(r => r.orderItemId === input.orderItemId && r.status !== "REJECTED").reduce((n, r) => n + r.quantity, 0);
    if (!item || requested + input.quantity > item.quantity) throw new ApiError(400, "INVALID_RETURN_QUANTITY", "Số lượng trả vượt quá số lượng đã mua.");
    return tx.returnRequest.create({ data: { ...input, orderId: id } });
  });
}

export async function reviewReturn(id: string, status: "APPROVED" | "REJECTED" | "RECEIVED") {
  return transaction(async tx => {
    const item = await tx.returnRequest.findUnique({ where: { id }, include: { orderItem: true } });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy yêu cầu trả hàng.");
    if (!(item.status === "REQUESTED" && ["APPROVED", "REJECTED"].includes(status)) && !(item.status === "APPROVED" && status === "RECEIVED")) throw new ApiError(409, "INVALID_TRANSITION", "Trạng thái trả hàng không hợp lệ.");
    await tx.returnRequest.update({ where: { id }, data: { status } });
    // Returned goods require physical inspection before being restocked. No automatic refund.
    await tx.orderEvent.create({ data: { orderId: item.orderId, status: `RETURN_${status}`, note: status === "RECEIVED" ? "Đã nhận hàng trả; cần kiểm định và xử lý hoàn tiền thủ công." : "Shop cập nhật yêu cầu trả hàng." } });
    return tx.returnRequest.findUniqueOrThrow({ where: { id } });
  });
}
