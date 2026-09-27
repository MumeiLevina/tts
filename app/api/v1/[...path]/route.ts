import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/server/db";
import { ApiError, body, endpoint, RequestUser } from "../../../../lib/server/http";
import { createProduct, getProduct, listProducts, listPublishedCombos, presentProduct } from "../../../../lib/server/catalog";
import { addCart, cartInput, changeOrder, checkout, getCart, orderInclude, policy, publicOrder, requestReturn, returnInput, reviewReturn, setCartQuantity } from "../../../../lib/server/commerce";
import { measurementInput, recommendSize } from "../../../../lib/server/fashion";
import { checkoutInput, productInput } from "../../../../lib/server/validation";
import { studioState, uploadStudioItem, generateCombos, generateInput, editDraft, draftEditInput, publishDraft, publishInput } from "../../../../lib/server/combo-studio";
import { createWardrobe, deleteWardrobe, listWardrobe, wardrobeInput } from "../../../../lib/server/wardrobe";
import { createTaxonomyOption, listTaxonomy, scopeForAdmin, taxonomyCreateInput, taxonomyQuery, assertTaxonomySelection } from "../../../../lib/server/product-taxonomy";
import { category } from "../../../../lib/server/validation";
import type { ProductGroup } from "../../../../lib/product-taxonomy";
import { studioItemTag } from "../../../../lib/studio";
import { featureFlags, setAiStylistFeature } from "../../../../lib/server/features";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Route = { method: string; pattern: RegExp; session?: boolean; admin?: boolean; successStatus?: number; run: (req: NextRequest, sessionId: string, match: RegExpMatchArray, user: RequestUser | null) => Promise<unknown> };
const routes: Route[] = [
  { method: "GET", pattern: /^features$/, run: () => featureFlags() },
  { method: "GET", pattern: /^admin\/features$/, admin: true, run: () => featureFlags() },
  { method: "PATCH", pattern: /^admin\/features\/ai-stylist$/, admin: true, run: async req => {
    const { enabled } = await body(req, z.object({ enabled: z.boolean() }).strict());
    return setAiStylistFeature(enabled);
  } },
  { method: "GET", pattern: /^admin\/taxonomy$/, admin: true, run: async (req, _s, _m, user) => {
    const query = taxonomyQuery.parse(Object.fromEntries(req.nextUrl.searchParams));
    return { options: await listTaxonomy(scopeForAdmin(user?.id || null), query.group, query.kind) };
  } },
  { method: "POST", pattern: /^admin\/taxonomy$/, admin: true, run: async (req, _s, _m, user) => createTaxonomyOption(scopeForAdmin(user?.id || null), await body(req, taxonomyCreateInput)) },
  { method: "GET", pattern: /^admin\/combo-studio$/, admin: true, run: () => studioState() },
  { method: "POST", pattern: /^admin\/combo-studio\/items$/, admin: true, run: req => uploadStudioItem(req) },
  { method: "POST", pattern: /^admin\/combo-studio\/generate$/, admin: true, run: async (req, _s, _m, user) => generateCombos(await body(req, generateInput), user?.id || "admin-api") },
  { method: "PATCH", pattern: /^admin\/combo-studio\/drafts\/([^/]+)$/, admin: true, run: async (req, _s, m) => editDraft(m[1], await body(req, draftEditInput)) },
  { method: "POST", pattern: /^admin\/combo-studio\/drafts\/([^/]+)\/publish$/, admin: true, run: async (req, _s, m) => publishDraft(m[1], await body(req, publishInput)) },
  { method: "GET", pattern: /^products$/, run: req => listProducts(req.nextUrl.searchParams) },
  { method: "GET", pattern: /^combos$/, run: () => listPublishedCombos() },
  { method: "GET", pattern: /^products\/([^/]+)$/, run: async (_r, _s, m) => ({ product: await getProduct(m[1]) }) },
  { method: "GET", pattern: /^policies$/, run: async () => policy },
  { method: "POST", pattern: /^size-advice$/, run: async req => recommendSize(await body(req, measurementInput)) },
  { method: "GET", pattern: /^cart$/, session: true, run: (_r, s) => getCart(s) },
  { method: "POST", pattern: /^cart\/items$/, session: true, run: async (req, s) => addCart(s, await body(req, cartInput)) },
  { method: "PATCH", pattern: /^cart\/items\/([^/]+)$/, session: true, run: async (req, s, m) => setCartQuantity(s, m[1], (await body(req, z.object({ quantity: z.number().int().min(0).max(20) }).strict())).quantity) },
  { method: "DELETE", pattern: /^cart\/items\/([^/]+)$/, session: true, run: (_r, s, m) => setCartQuantity(s, m[1], 0) },
  { method: "GET", pattern: /^orders$/, session: true, run: async (_r, s) => ({ orders: (await db.order.findMany({ where: { sessionId: s }, include: orderInclude, orderBy: { createdAt: "desc" }, take: 50 })).map(publicOrder) }) },
  { method: "POST", pattern: /^orders$/, session: true, run: async (req, s) => {
    const key = z.string().min(16).max(100).regex(/^[a-zA-Z0-9_-]+$/).parse(req.headers.get("idempotency-key"));
    return { order: await checkout(s, key, await body(req, checkoutInput)) };
  } },
  { method: "GET", pattern: /^orders\/([^/]+)$/, session: true, run: async (_r, s, m) => {
    const order = await db.order.findFirst({ where: { id: m[1], sessionId: s }, include: orderInclude });
    if (!order) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng.");
    return { order: publicOrder(order) };
  } },
  { method: "POST", pattern: /^orders\/([^/]+)\/cancel$/, session: true, run: async (_r, s, m) => ({ order: await changeOrder(m[1], "CANCELLED", s) }) },
  { method: "POST", pattern: /^orders\/([^/]+)\/returns$/, session: true, run: async (req, s, m) => ({ request: await requestReturn(s, m[1], await body(req, returnInput)) }) },
  { method: "GET", pattern: /^wishlist$/, session: true, run: async (_r, s) => ({ items: (await db.wishlistItem.findMany({ where: { sessionId: s }, include: { product: { include: { variants: true } } } })).map(i => ({ id: i.id, product: presentProduct(i.product) })) }) },
  { method: "POST", pattern: /^wishlist$/, session: true, run: async (req, s) => {
    const { productId } = await body(req, z.object({ productId: z.string().min(1).max(100) }).strict());
    await getProduct(productId);
    if (await db.wishlistItem.count({ where: { sessionId: s } }) >= 200) throw new ApiError(400, "LIMIT_REACHED", "Danh sách yêu thích tối đa 200 sản phẩm.");
    return { item: await db.wishlistItem.upsert({ where: { sessionId_productId: { sessionId: s, productId } }, create: { sessionId: s, productId }, update: {} }) };
  } },
  { method: "DELETE", pattern: /^wishlist\/([^/]+)$/, session: true, run: async (_r, s, m) => { await db.wishlistItem.deleteMany({ where: { sessionId: s, productId: m[1] } }); return { ok: true }; } },
  // /items is the REST resource; preserve the existing /wardrobe API as an alias.
  { method: "GET", pattern: /^(?:items|wardrobe(?:\/items)?)$/, session: true, run: (req, s) => listWardrobe(s, req.nextUrl.searchParams) },
  { method: "POST", pattern: /^(?:items|wardrobe(?:\/items)?)$/, session: true, successStatus: 201, run: async (req, s) => createWardrobe(s, await body(req, wardrobeInput)) },
  { method: "DELETE", pattern: /^(?:items|wardrobe(?:\/items)?)\/([^/]+)$/, session: true, run: (_req, s, m) => deleteWardrobe(s, m[1]) },
  { method: "GET", pattern: /^outfits$/, session: true, run: async (_r, s) => ({ outfits: (await db.outfit.findMany({ where: { sessionId: s }, orderBy: { createdAt: "desc" }, take: 100 })).map(o => ({ id: o.id, name: o.name, productIds: JSON.parse(o.productIds), createdAt: o.createdAt })) }) },
  { method: "POST", pattern: /^outfits$/, session: true, run: async (req, s) => {
    const input = await body(req, z.object({ name: z.string().trim().min(1).max(100), productIds: z.array(z.string().min(1).max(100)).min(1).max(10) }).strict());
    const ids = Array.from(new Set(input.productIds));
    if (await db.product.count({ where: { id: { in: ids }, active: true } }) !== ids.length) throw new ApiError(400, "INVALID_PRODUCTS", "Bộ đồ có sản phẩm không còn được bán.");
    if (await db.outfit.count({ where: { sessionId: s } }) >= 100) throw new ApiError(400, "LIMIT_REACHED", "Tối đa 100 bộ đồ đã lưu.");
    const outfit = await db.outfit.create({ data: { sessionId: s, name: input.name, productIds: JSON.stringify(ids) } });
    return { outfit: { id: outfit.id, name: outfit.name, productIds: ids } };
  } },
  { method: "DELETE", pattern: /^outfits\/([^/]+)$/, session: true, run: async (_r, s, m) => { await db.outfit.deleteMany({ where: { id: m[1], sessionId: s } }); return { ok: true }; } },
  { method: "GET", pattern: /^admin\/dashboard$/, admin: true, run: async () => {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const [products, activeProducts, lowStock, users, orders, pendingOrders, returns, revenue, todayOrders, recentOrders] = await Promise.all([
      db.product.count(), db.product.count({ where: { active: true } }),
      db.productVariant.count({ where: { stock: { lte: 5 } } }), db.user.count(), db.order.count(),
      db.order.count({ where: { status: "PENDING" } }), db.returnRequest.count({ where: { status: "REQUESTED" } }),
      db.order.aggregate({ where: { status: "DELIVERED" }, _sum: { total: true } }),
      db.order.count({ where: { createdAt: { gte: startOfToday } } }),
      db.order.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 5 })
    ]);
    return { stats: { products, activeProducts, lowStock, users, orders, pendingOrders, pendingReturns: returns, deliveredRevenue: revenue._sum.total || 0, todayOrders }, recentOrders: recentOrders.map(publicOrder) };
  } },
  { method: "GET", pattern: /^admin\/products$/, admin: true, run: async req => {
    const page = z.coerce.number().int().min(1).max(10000).parse(req.nextUrl.searchParams.get("page") || 1);
    const q = z.string().trim().max(100).parse(req.nextUrl.searchParams.get("q") || "");
    const limit = 30;
    const comboProductIds = (await db.comboDraft.findMany({ where: { productId: { not: null } }, select: { productId: true } })).flatMap(combo => combo.productId ? [combo.productId] : []);
    const where = { id: { notIn: comboProductIds }, tagBadge: { not: studioItemTag }, ...(q ? { OR: [{ name: { contains: q } }, { brand: { contains: q } }, { slug: { contains: q } }] } : {}) };
    const [products, total] = await db.$transaction([
      db.product.findMany({ where, include: { variants: { orderBy: [{ size: "asc" }, { color: "asc" }] } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.product.count({ where })
    ]);
    return { products: products.map(presentProduct), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  } },
  { method: "POST", pattern: /^admin\/products$/, admin: true, run: async (req, _s, _m, user) => ({ product: await createProduct(await body(req, productInput), scopeForAdmin(user?.id || null)) }) },
  { method: "PATCH", pattern: /^admin\/products\/([^/]+)$/, admin: true, run: async (req, _s, m, user) => {
    const data = await body(req, z.object({ active: z.boolean().optional(), price: z.number().int().min(1000).max(100000000).optional(), category: category.optional(), subcategory: z.string().trim().min(1).max(80).nullable().optional(), fit: z.string().trim().min(1).max(80).nullable().optional() }).strict().refine(v => Object.keys(v).length > 0));
    const current = await db.product.findUnique({ where: { id: m[1] } });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");
    const nextCategory = (data.category || current.category) as ProductGroup;
    const scope = scopeForAdmin(user?.id || null);
    const next = { ...data, ...(data.subcategory !== undefined ? { subcategory: await assertTaxonomySelection(scope, nextCategory, "SUBCATEGORY", data.subcategory) || null } : {}), ...(data.fit !== undefined ? { fit: await assertTaxonomySelection(scope, nextCategory, "FIT", data.fit) || null } : {}) };
    if (data.category && data.category !== current.category) { next.subcategory = null; next.fit = null; }
    return { product: presentProduct(await db.product.update({ where: { id: m[1] }, data: next, include: { variants: true } })) };
  } },
  { method: "PATCH", pattern: /^admin\/variants\/([^/]+)$/, admin: true, run: async (req, _s, m) => {
    const data = await body(req, z.object({ stock: z.number().int().min(0).max(100000), expectedStock: z.number().int().min(0) }).strict());
    const updated = await db.productVariant.updateMany({ where: { id: m[1], stock: data.expectedStock }, data: { stock: data.stock } });
    if (!updated.count) throw new ApiError(409, "STOCK_CHANGED", "Tồn kho đã thay đổi hoặc SKU không tồn tại. Hãy tải lại trước khi cập nhật.");
    return { ok: true };
  } },
  { method: "GET", pattern: /^admin\/orders$/, admin: true, run: async req => {
    const page = z.coerce.number().int().min(1).max(10000).parse(req.nextUrl.searchParams.get("page") || 1);
    const status = z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]).optional().parse(req.nextUrl.searchParams.get("status") || undefined);
    const where = status ? { status } : {};
    const [orders, total] = await db.$transaction([db.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50 }), db.order.count({ where })]);
    return { orders: orders.map(publicOrder), pagination: { page, limit: 50, total, pages: Math.ceil(total / 50) } };
  } },
  { method: "PATCH", pattern: /^admin\/orders\/([^/]+)$/, admin: true, run: async (req, _s, m) => {
    const input = await body(req, z.object({ status: z.enum(["CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]), trackingNumber: z.string().trim().min(1).max(100).optional(), carrier: z.string().trim().min(1).max(80).optional() }).strict());
    return { order: await changeOrder(m[1], input.status, undefined, { trackingNumber: input.trackingNumber, carrier: input.carrier }) };
  } },
  { method: "GET", pattern: /^admin\/returns$/, admin: true, run: async req => {
    const status = z.enum(["REQUESTED", "APPROVED", "REJECTED", "RECEIVED"]).optional().parse(req.nextUrl.searchParams.get("status") || undefined);
    return { requests: await db.returnRequest.findMany({ where: status ? { status } : {}, include: { orderItem: true, order: { select: { number: true, customerName: true, phone: true } } }, orderBy: { createdAt: "desc" }, take: 100 }) };
  } },
  { method: "PATCH", pattern: /^admin\/returns\/([^/]+)$/, admin: true, run: async (req, _s, m) => ({ request: await reviewReturn(m[1], (await body(req, z.object({ status: z.enum(["APPROVED", "REJECTED", "RECEIVED"]) }).strict())).status) }) },
  { method: "GET", pattern: /^admin\/users$/, admin: true, run: async req => {
    const page = z.coerce.number().int().min(1).max(10000).parse(req.nextUrl.searchParams.get("page") || 1);
    const q = z.string().trim().max(100).parse(req.nextUrl.searchParams.get("q") || "");
    const limit = 50;
    const where = q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {};
    const [users, total] = await db.$transaction([
      db.user.findMany({ where, select: { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { authSessions: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      db.user.count({ where })
    ]);
    return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  } },
  { method: "PATCH", pattern: /^admin\/users\/([^/]+)$/, admin: true, run: async (req, _s, m) => {
    const { role } = await body(req, z.object({ role: z.enum(["CUSTOMER", "ADMIN"]) }).strict());
    const target = await db.user.findUnique({ where: { id: m[1] } });
    if (!target) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy người dùng.");
    if (target.role === "ADMIN" && role === "CUSTOMER" && await db.user.count({ where: { role: "ADMIN" } }) <= 1) throw new ApiError(409, "LAST_ADMIN", "Không thể hạ quyền quản trị viên cuối cùng.");
    const user = await db.user.update({ where: { id: target.id }, data: { role }, select: { id: true, email: true, name: true, role: true, createdAt: true } });
    if (role === "CUSTOMER") await db.authSession.deleteMany({ where: { userId: target.id } });
    return { user };
  } }
];

async function dispatch(req: NextRequest, context: { params: { path: string[] } }) {
  const path = context.params.path.join("/");
  const route = routes.find(r => r.method === req.method && r.pattern.test(path));
  if (!route) return endpoint(async () => { throw new ApiError(routes.some(r => r.pattern.test(path)) ? 405 : 404, "NOT_FOUND", "API hoặc phương thức không tồn tại."); })(req);
  return endpoint((request, ctx) => route.run(request, ctx.sessionId, path.match(route.pattern)!, ctx.user), route)(req);
}
export { dispatch as GET, dispatch as POST, dispatch as PATCH, dispatch as DELETE };
