import { normalizeSearch } from "./wardrobe";

export type WardrobeProduct = {
  id: string; name: string; category: string; imageUrl: string; style: string;
  styles: string[]; tags: string[]; colors: { name: string; hex: string }[];
  price: number; active: boolean; inStock: boolean; isCombo: boolean;
};
export type SavedProduct = { productId: string; createdAt: string; product: WardrobeProduct };
export type OutfitPiece = { slot: "top" | "bottom" | "dress" | "footwear" | "outerwear" | "accessory"; product: WardrobeProduct; color: { name: string; hex: string } };
export type RecommendedOutfit = { id: string; pieces: OutfitPiece[]; score: number; reasons: string[]; totalPrice: number };
export type RecommendationResult = { outfits: RecommendedOutfit[]; engine: "wardrobe-rules-v1"; message: string; missing: string[]; eligibleCount: number; candidateCount: number; seed: string };

// Normalize the shop's existing multi-value styles ("office casual", etc.)
// without silently inventing styles for products that have no metadata.
const aliases: Record<string, string> = { office: "formal", elegant: "formal", party: "formal", beach: "casual", minimal: "minimal", sporty: "sporty", sport: "sporty", street: "streetwear" };
export function productStyles(style: string) {
  return Array.from(new Set(normalizeSearch(style).split(/[\s,;|/]+/).filter(Boolean).map(s => aliases[s] || s)));
}
export const styleNames: Record<string, string> = { casual: "Thường ngày", formal: "Thanh lịch", streetwear: "Đường phố", minimal: "Tối giản", sporty: "Thể thao", vintage: "Cổ điển" };
export const slotNames: Record<OutfitPiece["slot"], string> = { top: "Áo", bottom: "Quần / chân váy", dress: "Váy liền", footwear: "Giày", outerwear: "Áo khoác", accessory: "Phụ kiện" };
