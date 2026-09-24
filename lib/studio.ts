export const studioCategories: Record<string, string> = { TOP: "Áo", BOTTOM: "Quần / váy", OUTERWEAR: "Áo khoác", FOOTWEAR: "Giày", ACCESSORY: "Phụ kiện" };
export type StudioItem = { id: string; name: string; image: string; category: string; price: number; variants: { id: string; size: string; color: string; stock: number }[] };
export type StudioSnapshot = { id: string; name: string; image: string; category: string; price: number };
export type StudioDraft = { id: string; name: string; description: string; rationale: string; style: string; price: number; image: string; engine: string; productId: string | null; items: StudioSnapshot[]; availability: { size: string; stock: number }[] };
export type StudioState = { aiReady: boolean; items: StudioItem[]; drafts: StudioDraft[] };
