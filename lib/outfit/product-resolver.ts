import type { Product, ProductVariant } from "@prisma/client";
import { db } from "../server/db";
import { productStyles } from "../product-wardrobe";
import { normalizeProductCategory } from "./category-normalizer";
import type { AIOutfitSelection, OutfitSlot, ResolvedOutfit, ResolvedProduct } from "./types";

export type ProductResolutionCode = "MISSING_PRODUCT" | "PRODUCT_UNAVAILABLE" | "CATEGORY_CHANGED" | "COMBO_PRODUCT";
export class ProductResolutionError extends Error {
  constructor(public code: ProductResolutionCode, message: string, public productId?: string) {
    super(message);
    this.name = "ProductResolutionError";
  }
}

type ProductRow = Product & { variants: ProductVariant[] };

function publicProduct(product: ProductRow, expected: OutfitSlot): ResolvedProduct {
  if (!product.active) throw new ProductResolutionError("PRODUCT_UNAVAILABLE", "Sản phẩm đã ngừng bán.", product.id);
  const category = normalizeProductCategory(product.category, product.subcategory);
  if (category !== expected) throw new ProductResolutionError("CATEGORY_CHANGED", `Danh mục sản phẩm ${product.id} đã thay đổi.`, product.id);
  const variants = product.variants.filter(variant => variant.stock > 0).sort((a, b) => a.size.localeCompare(b.size, "vi", { numeric: true }) || a.color.localeCompare(b.color, "vi") || a.id.localeCompare(b.id));
  if (!variants.length) throw new ProductResolutionError("PRODUCT_UNAVAILABLE", "Sản phẩm đã hết hàng.", product.id);
  const colors = Array.from(new Map(variants.map(variant => [variant.colorHex.toLowerCase(), { name: variant.color, hex: variant.colorHex.toLowerCase() }])).values());
  return {
    id: product.id, slug: product.slug, name: product.name, brand: product.brand, category, sourceCategory: product.category,
    subcategory: product.subcategory, price: product.price, imageUrl: product.image, transparentImageUrl: product.transparentImageUrl,
    renderImageUrl: product.transparentImageUrl || product.image, styles: productStyles(product.style),
    tags: Array.isArray(product.tags) ? product.tags.filter((tag): tag is string => typeof tag === "string") : [], colors,
    variants: variants.map(({ id, size, color, colorHex, stock }) => ({ id, size, color, colorHex: colorHex.toLowerCase(), stock }))
  };
}

function selectionIds(outfit: AIOutfitSelection) {
  return [outfit.items.topId, outfit.items.bottomId, outfit.items.dressId, outfit.items.jumpsuitId, outfit.items.outerwearId, outfit.items.shoesId, ...outfit.items.accessoryIds].filter((id): id is string => Boolean(id));
}

/** Resolve all selected IDs in one Product query, then rebuild trusted DTOs from current database state. */
export async function resolveSelectedOutfits(selections: AIOutfitSelection[]): Promise<ResolvedOutfit[]> {
  const ids = Array.from(new Set(selections.flatMap(selectionIds)));
  if (!ids.length) return [];
  const [products, comboRows] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids } }, include: { variants: true } }),
    db.comboDraft.findMany({ where: { productId: { in: ids } }, select: { productId: true } })
  ]);
  const byId = new Map(products.map(product => [product.id, product]));
  const comboIds = new Set(comboRows.map(row => row.productId).filter((id): id is string => Boolean(id)));
  for (const id of ids) {
    if (!byId.has(id)) throw new ProductResolutionError("MISSING_PRODUCT", "Một sản phẩm được đề xuất không còn tồn tại.", id);
    if (comboIds.has(id)) throw new ProductResolutionError("COMBO_PRODUCT", "Bộ phối đã đóng gói không thể dùng như một món lẻ.", id);
  }
  const get = (id: string | null, slot: OutfitSlot) => id ? publicProduct(byId.get(id)!, slot) : null;
  return selections.map(selection => {
    const top = get(selection.items.topId, "top"), bottom = get(selection.items.bottomId, "bottom"), dress = get(selection.items.dressId, "dress"), jumpsuit = get(selection.items.jumpsuitId, "jumpsuit"), outerwear = get(selection.items.outerwearId, "outerwear");
    const shoes = get(selection.items.shoesId, "shoes");
    const accessories = selection.items.accessoryIds.map(id => get(id, "accessory")!);
    const items = [top, bottom, dress, jumpsuit, outerwear, shoes, ...accessories].filter((item): item is ResolvedProduct => Boolean(item));
    return { id: selection.outfitId, name: selection.outfitName, layout: selection.layout, items: { top, bottom, dress, jumpsuit, outerwear, shoes, accessories }, stylistAdvice: selection.stylistAdvice, confidence: selection.confidence, totalPrice: items.reduce((sum, item) => sum + item.price, 0) };
  });
}
