import { aiStylistOutputSchema } from "../ai/schemas/outfit-stylist-schema";
import type { AIOutfitSelection, OutfitSlot, ProductStylingMetadata } from "./types";

export type AIOutputValidationCode = "INVALID_STRUCTURE" | "OUTFIT_COUNT" | "UNKNOWN_PRODUCT" | "CATEGORY_MISMATCH" | "DUPLICATE_OUTFIT" | "INVALID_CANDIDATES" | "BUDGET_EXCEEDED";

export class AIOutputValidationError extends Error {
  constructor(public code: AIOutputValidationCode, message: string, public details?: unknown) {
    super(message);
    this.name = "AIOutputValidationError";
  }
}

const expectedCategory = {
  top_id: "top", bottom_id: "bottom", dress_id: "dress", jumpsuit_id: "jumpsuit",
  outerwear_id: "outerwear", shoes_id: "shoes"
} as const satisfies Record<string, OutfitSlot>;

/** Validate provider output against the exact candidate snapshot used for that provider call. */
export function validateAIStylistOutput(raw: unknown, candidates: ProductStylingMetadata[], requestedOutfits: number, options: { budget?: number | null } = {}): AIOutfitSelection[] {
  const parsed = aiStylistOutputSchema.safeParse(raw);
  if (!parsed.success) throw new AIOutputValidationError("INVALID_STRUCTURE", "AI Stylist trả cấu trúc không hợp lệ.", parsed.error.flatten());
  const requested = Math.min(3, Math.max(1, requestedOutfits));
  if (parsed.data.outfits.length > requested) throw new AIOutputValidationError("OUTFIT_COUNT", "AI Stylist trả nhiều outfit hơn yêu cầu.");
  const byId = new Map(candidates.map(candidate => [candidate.id, candidate]));
  if (byId.size !== candidates.length) throw new AIOutputValidationError("INVALID_CANDIDATES", "Candidate list chứa product ID trùng.");

  const product = (id: string, slot: OutfitSlot) => {
    const candidate = byId.get(id);
    if (!candidate) throw new AIOutputValidationError("UNKNOWN_PRODUCT", `AI Stylist chọn product ID không có trong candidate list: ${id}.`);
    if (candidate.category !== slot) throw new AIOutputValidationError("CATEGORY_MISMATCH", `Product ${id} thuộc ${candidate.category}, không thể dùng cho slot ${slot}.`);
    return candidate;
  };
  const signatures = new Set<string>();
  return parsed.data.outfits.map(outfit => {
    for (const [key, category] of Object.entries(expectedCategory) as [keyof typeof expectedCategory, OutfitSlot][]) {
      const id = outfit.items[key];
      if (id) product(id, category);
    }
    outfit.items.accessory_ids.forEach(id => product(id, "accessory"));
    const ids = [outfit.items.top_id, outfit.items.bottom_id, outfit.items.dress_id, outfit.items.jumpsuit_id, outfit.items.outerwear_id, outfit.items.shoes_id, ...outfit.items.accessory_ids].filter((id): id is string => Boolean(id)).sort();
    const signature = ids.join("|");
    if (signatures.has(signature)) throw new AIOutputValidationError("DUPLICATE_OUTFIT", "AI Stylist trả nhiều outfit có cùng bộ sản phẩm.");
    const total = ids.reduce((sum, id) => sum + byId.get(id)!.price, 0);
    if (options.budget !== null && options.budget !== undefined && total > options.budget) throw new AIOutputValidationError("BUDGET_EXCEEDED", "AI Stylist chọn outfit vượt ngân sách.");
    signatures.add(signature);
    return {
      outfitId: outfit.outfit_id, outfitName: outfit.outfit_name, layout: outfit.layout,
      items: { topId: outfit.items.top_id, bottomId: outfit.items.bottom_id, dressId: outfit.items.dress_id, jumpsuitId: outfit.items.jumpsuit_id, outerwearId: outfit.items.outerwear_id, shoesId: outfit.items.shoes_id, accessoryIds: outfit.items.accessory_ids },
      stylistAdvice: outfit.stylist_advice, confidence: outfit.confidence
    };
  });
}
