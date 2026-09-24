import type { Product, ProductVariant } from "@prisma/client";
import { db } from "../server/db";
import { productStyles } from "../product-wardrobe";
import { normalizeSearch } from "../wardrobe";
import { normalizeProductCategory } from "./category-normalizer";
import type { AIStylistInput, OutfitSlot, ProductStylingMetadata, StylingFit, StylingOccasion, StylingPattern, StylingSeason } from "./types";

export type CandidateSourceProduct = Pick<Product,
  "id" | "name" | "category" | "subcategory" | "material" | "style" | "tags" | "pattern" | "fit" |
  "season" | "occasion" | "formality" | "price" | "active"
> & { variants: Pick<ProductVariant, "color" | "colorHex" | "stock">[]; isCombo?: boolean };

export type CandidateFilterResult = {
  candidates: ProductStylingMetadata[];
  eligibleCount: number;
  scannedCount: number;
  limit: number;
};

const seasons = new Set<StylingSeason>(["spring", "summer", "autumn", "winter", "all-season"]);
const occasions = new Set<StylingOccasion>(["cafe", "work", "date", "party", "wedding", "beach", "travel", "casual", "formal"]);
const patterns = new Set<StylingPattern>(["solid", "striped", "checkered", "floral", "graphic", "textured", "other"]);
const fits = new Set<StylingFit>(["slim", "regular", "relaxed", "oversized", "tailored"]);

function stringArray<T extends string>(value: unknown, allowed?: Set<T>): T[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is T => typeof item === "string" && (!allowed || allowed.has(item as T)))));
}

function metadata(product: CandidateSourceProduct): ProductStylingMetadata | null {
  const category = normalizeProductCategory(product.category, product.subcategory);
  if (!category) return null;
  const colors = Array.from(new Map(product.variants.filter(variant => variant.stock > 0).map(variant => [variant.colorHex.toLowerCase(), { name: variant.color, hex: variant.colorHex.toLowerCase() }])).values());
  if (!colors.length) return null;
  return {
    id: product.id, name: product.name, category, sourceCategory: product.category,
    subcategory: product.subcategory, colors,
    pattern: product.pattern && patterns.has(product.pattern as StylingPattern) ? product.pattern as StylingPattern : null,
    styles: productStyles(product.style), fit: product.fit && fits.has(product.fit as StylingFit) ? product.fit as StylingFit : null,
    material: product.material, season: stringArray(product.season, seasons), occasion: stringArray(product.occasion, occasions),
    formality: product.formality, price: product.price
  };
}

function relevance(candidate: ProductStylingMetadata, request: string, preferred: Set<string>) {
  const tokens = normalizeSearch(request).split(/\s+/).filter(token => token.length >= 2);
  const haystack = normalizeSearch([candidate.name, candidate.subcategory || "", candidate.material, candidate.pattern || "", candidate.fit || "", ...candidate.styles, ...candidate.colors.flatMap(color => [color.name, color.hex])].join(" "));
  return (preferred.has(candidate.id) ? 1000 : 0) + tokens.reduce((score, token) => score + (haystack.includes(token) ? 3 : 0), 0);
}

/** Deterministic business filter. Missing optional metadata stays eligible, while an explicit mismatch is removed. */
export function filterAndRankCandidates(products: CandidateSourceProduct[], input: AIStylistInput, requestedLimit = 40): CandidateFilterResult {
  const limit = Math.min(50, Math.max(20, requestedLimit));
  const excluded = new Set(input.excludedProductIds || []), preferred = new Set(input.preferredProductIds || []);
  const candidates = products.flatMap(product => {
    if (!product.active || product.isCombo || excluded.has(product.id) || !product.variants.some(variant => variant.stock > 0)) return [];
    if (input.context.budget !== null && product.price > input.context.budget) return [];
    const value = metadata(product);
    if (!value) return [];
    if (input.context.season && value.season.length && !value.season.includes(input.context.season) && !value.season.includes("all-season")) return [];
    if (input.context.occasion && value.occasion.length && !value.occasion.includes(input.context.occasion)) return [];
    return [{ value, score: relevance(value, input.request, preferred) + (input.context.season && value.season.includes(input.context.season) ? 12 : 0) + (input.context.occasion && value.occasion.includes(input.context.occasion) ? 12 : 0) }];
  });
  candidates.sort((a, b) => b.score - a.score || a.value.price - b.value.price || a.value.id.localeCompare(b.value.id));

  // Round-robin slots prevents a large TOP catalog from crowding shoes/dresses out of the LLM context.
  const slotOrder: OutfitSlot[] = ["top", "bottom", "dress", "jumpsuit", "shoes", "outerwear", "accessory"];
  const groups = new Map(slotOrder.map(slot => [slot, candidates.filter(item => item.value.category === slot)]));
  const selected: ProductStylingMetadata[] = [];
  while (selected.length < limit && Array.from(groups.values()).some(group => group.length)) {
    for (const slot of slotOrder) {
      const next = groups.get(slot)?.shift();
      if (next) selected.push(next.value);
      if (selected.length === limit) break;
    }
  }
  return { candidates: selected, eligibleCount: candidates.length, scannedCount: products.length, limit };
}

export async function findOutfitCandidates(input: AIStylistInput, requestedLimit = 40) {
  const excluded = Array.from(new Set(input.excludedProductIds || []));
  const [products, comboRows] = await Promise.all([
    db.product.findMany({
      where: { active: true, ...(excluded.length ? { id: { notIn: excluded } } : {}), ...(input.context.budget !== null ? { price: { lte: input.context.budget } } : {}), variants: { some: { stock: { gt: 0 } } } },
      include: { variants: true }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 250
    }),
    db.comboDraft.findMany({ where: { productId: { not: null } }, select: { productId: true } })
  ]);
  const comboIds = new Set(comboRows.map(row => row.productId).filter((id): id is string => Boolean(id)));
  return filterAndRankCandidates(products.map(product => ({ ...product, isCombo: comboIds.has(product.id) })), input, requestedLimit);
}
