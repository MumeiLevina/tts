import { z } from "zod";
import { productOccasion, productSeason } from "../server/validation";

const uniqueIds = z.array(z.string().trim().min(1).max(100)).max(50).transform(ids => Array.from(new Set(ids)));
export const recommendOutfitInputSchema = z.object({
  request: z.string().trim().min(3).max(1000),
  numberOfOutfits: z.number().int().min(1).max(3).default(3),
  context: z.object({
    occasion: productOccasion.nullable().default(null), season: productSeason.nullable().default(null),
    weather: z.string().trim().min(1).max(100).nullable().default(null), temperature: z.number().min(-60).max(60).nullable().default(null),
    budget: z.number().int().min(1000).max(100000000).nullable().default(null)
  }).strict().default({ occasion: null, season: null, weather: null, temperature: null, budget: null }),
  preferredProductIds: uniqueIds.optional(), excludedProductIds: uniqueIds.optional()
}).strict().superRefine((input, context) => {
  const excluded = new Set(input.excludedProductIds || []);
  if ((input.preferredProductIds || []).some(id => excluded.has(id))) context.addIssue({ code: z.ZodIssueCode.custom, message: "Một sản phẩm không thể vừa được ưu tiên vừa bị loại." });
});

export type RecommendOutfitInput = z.infer<typeof recommendOutfitInputSchema>;
