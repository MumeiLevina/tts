import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";
import { category } from "./validation";
import { normalizeColor, normalizeSearch } from "../wardrobe";
import { productStyles, SavedProduct } from "../product-wardrobe";
import { mixWardrobe } from "./wardrobe-engine";

export const toggleInput = z.object({
  productId: z.string().trim().min(1).max(100),
  // Optional target state makes UI retries idempotent; omitted means true toggle.
  saved: z.boolean().optional()
}).strict();
const filters = z.object({
  q: z.string().trim().max(150).default(""), category: category.optional(),
  color: z.string().max(40).transform(normalizeColor).pipe(z.string().regex(/^#[0-9a-f]{6}$/)).optional(),
  sort: z.enum(["newest", "oldest", "name", "price_asc", "price_desc"]).default("newest")
}).strict();
const recommendationQuery = z.object({
  seed: z.string().min(1).max(100).default("default"),
  random: z.enum(["true", "false"]).default("false"),
  limit: z.coerce.number().int().min(1).max(6).default(4),
  exclude: z.string().max(6500).optional()
}).strict();
const include = { product: { include: { variants: { orderBy: { id: "asc" as const } } } } };
type Row = Prisma.UserWardrobeGetPayload<{ include: typeof include }>;

function present(row: Row, isCombo: boolean): SavedProduct {
  const p = row.product;
  const colors = Array.from(new Map(p.variants.map(v => [v.colorHex.toLowerCase(), { name: v.color, hex: v.colorHex.toLowerCase() }])).values());
  return { productId: p.id, createdAt: row.createdAt.toISOString(), product: {
    id: p.id, name: p.name, category: p.category, imageUrl: p.image, style: p.style,
    styles: productStyles(p.style), tags: Array.isArray(p.tags) ? p.tags.filter((v): v is string => typeof v === "string") : [],
    colors, price: p.price, active: p.active, inStock: p.variants.some(v => v.stock > 0), isCombo
  } };
}
async function savedItems(userId: string) {
  const rows = await db.userWardrobe.findMany({ where: { userId }, include, orderBy: [{ createdAt: "desc" }, { productId: "asc" }] });
  // Published shop combos are whole outfits, not individual tops for recombination.
  const drafts = await db.comboDraft.findMany({ where: { productId: { in: rows.map(r => r.productId) } }, select: { productId: true } });
  const combos = new Set(drafts.map(d => d.productId));
  return rows.map(row => present(row, combos.has(row.productId)));
}
export async function listSavedProducts(userId: string, params: URLSearchParams) {
  const f = filters.parse(Object.fromEntries(params));
  const all = await savedItems(userId);
  const items = all.filter(i => (!f.category || i.product.category === f.category) && (!f.color || i.product.colors.some(c => c.hex === f.color)) && normalizeSearch(i.product.name).includes(normalizeSearch(f.q)));
  if (f.sort === "oldest") items.reverse();
  if (f.sort === "name") items.sort((a, b) => a.product.name.localeCompare(b.product.name, "vi") || a.productId.localeCompare(b.productId));
  if (f.sort.startsWith("price_")) items.sort((a, b) => (a.product.price - b.product.price) * (f.sort === "price_asc" ? 1 : -1) || a.productId.localeCompare(b.productId));
  return { items, total: items.length, savedCount: all.length };
}
export async function toggleSavedProduct(userId: string, input: z.infer<typeof toggleInput>) {
  // Unique (userId,productId) plus transaction protects against duplicate saves.
  // Retry serialization conflicts without retrying arbitrary application errors.
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await db.$transaction(async tx => {
        const where = { userId_productId: { userId, productId: input.productId } };
        const existing = await tx.userWardrobe.findUnique({ where });
        const save = input.saved ?? !existing;
        if (!save) { await tx.userWardrobe.deleteMany({ where: { userId, productId: input.productId } }); return null; }
        if (existing) return tx.userWardrobe.findUniqueOrThrow({ where, include });
        const product = await tx.product.findUnique({ where: { id: input.productId } });
        if (!product?.active) throw new ApiError(404, "NOT_FOUND", "Sản phẩm không còn được bán.");
        if (await tx.userWardrobe.count({ where: { userId } }) >= 200) throw new ApiError(400, "LIMIT_REACHED", "Tủ đồ tối đa 200 sản phẩm.");
        return tx.userWardrobe.create({ data: { userId, productId: product.id }, include });
      });
      const combo = row ? await db.comboDraft.findUnique({ where: { productId: row.productId }, select: { id: true } }) : null;
      return { productId: input.productId, saved: !!row, item: row ? present(row, !!combo) : null };
    } catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) continue;
      throw error;
    }
  }
}
export async function removeSavedProduct(userId: string, productId: string) {
  z.string().min(1).max(100).parse(productId);
  // Idempotent removal is safe for stale tabs and never touches another account.
  await db.userWardrobe.deleteMany({ where: { userId, productId } });
  return { ok: true, productId, saved: false };
}
export async function wardrobeRecommendations(userId: string, params: URLSearchParams) {
  const query = recommendationQuery.parse(Object.fromEntries(params));
  const exclude = query.exclude ? z.array(z.string().min(1).max(1000)).max(6).parse(query.exclude.split(",")) : [];
  const items = await savedItems(userId);
  return { ...mixWardrobe(items.map(i => i.product), { seed: query.seed, limit: query.limit, random: query.random === "true", exclude }), engine: "wardrobe-rules-v1" as const, seed: query.seed };
}
