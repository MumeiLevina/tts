import { Prisma, Product, ProductVariant } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";
import { category, productInput } from "./validation";
import { studioCategories } from "../studio";

export function presentProduct(product: Product & { variants: ProductVariant[] }) {
  const available = product.variants.filter(v => v.stock > 0);
  return { ...product, priceFormatted: new Intl.NumberFormat("vi-VN").format(product.price) + "₫", availableSizes: Array.from(new Set(available.map(v => v.size))), selectedSize: available.find(v => v.size === "M")?.size || available[0]?.size || "", inStock: available.length > 0 };
}

const filters = z.object({
  q: z.string().trim().max(100).optional(), category: category.optional(),
  size: z.string().max(12).optional(), color: z.string().max(40).optional(),
  minPrice: z.coerce.number().int().min(0).optional(), maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: z.enum(["true", "false"]).optional(), sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(24)
}).refine(v => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, "Khoảng giá không hợp lệ.");

export async function listProducts(params: URLSearchParams) {
  const f = filters.parse(Object.fromEntries(params));
  const variant: Prisma.ProductVariantWhereInput = { size: f.size, color: f.color, ...(f.inStock === "true" ? { stock: { gt: 0 } } : {}) };
  const where: Prisma.ProductWhereInput = {
    active: true, category: f.category,
    ...(f.q ? { OR: [ { name: { contains: f.q } }, { brand: { contains: f.q } }, { style: { contains: f.q } } ] } : {}),
    price: { gte: f.minPrice, lte: f.maxPrice },
    ...(f.size || f.color || f.inStock === "true" ? { variants: { some: variant } } : {}),
    ...(f.inStock === "false" ? { NOT: { variants: { some: { stock: { gt: 0 } } } } } : {})
  };
  const [products, total] = await db.$transaction([
    db.product.findMany({ where, include: { variants: true }, orderBy: f.sort === "newest" ? [{ createdAt: "desc" }, { id: "asc" }] : [{ price: f.sort === "price_asc" ? "asc" : "desc" }, { id: "asc" }], skip: (f.page - 1) * f.limit, take: f.limit }),
    db.product.count({ where })
  ]);
  return { products: products.map(presentProduct), pagination: { page: f.page, limit: f.limit, total, pages: Math.ceil(total / f.limit) } };
}

export async function getProduct(id: string) {
  const p = await db.product.findFirst({ where: { active: true, OR: [{ id }, { slug: id }] }, include: { variants: true, sizeGuide: true } });
  if (!p) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");
  const draft = await db.comboDraft.findUnique({ where: { productId: p.id } });
  const items = draft ? JSON.parse(draft.itemsJson) as { id: string; name: string; category: string; price: number; image: string }[] : [];
  const componentProducts = items.length ? await db.product.findMany({ where: { id: { in: items.map(i => i.id) } }, include: { variants: true } }) : [];
  return { ...presentProduct(p), ...(draft ? { combo: { id: p.id, title: p.name, styleName: "Bộ phối của shop", estimatedPrice: new Intl.NumberFormat("vi-VN").format(p.price) + "₫", image: p.image, description: draft.description, items: items.map(i => ({ sku: i.id, id: i.id, name: i.name, type: studioCategories[i.category] || i.category, image: i.image, price: i.price, priceFormatted: new Intl.NumberFormat("vi-VN").format(i.price) + "₫", variants: componentProducts.find(p => p.id === i.id)?.variants || [] })) } } : {}) };
}

export async function createProduct(input: z.infer<typeof productInput>) {
  const { variants, ...data } = input;
  const code = randomUUID();
  return presentProduct(await db.product.create({ data: { ...data, slug: `${data.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${code.slice(0, 8)}`, variants: { create: variants.map((v, i) => ({ ...v, sku: `FC-${code}-${i}` })) } }, include: { variants: true } }));
}
