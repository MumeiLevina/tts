import { AIProvider, AIProviderError, type AIProviderResult } from "../ai/provider";
import { createAIProvider } from "../ai/provider-factory";
import { OUTFIT_STYLIST_SYSTEM_PROMPT } from "../ai/prompts/outfit-stylist-prompt";
import { buildOutfitStylistJsonSchema } from "../ai/schemas/outfit-stylist-schema";
import { normalizeSearch } from "../wardrobe";
import { AIOutputValidationError, validateAIStylistOutput } from "./ai-output-validator";
import { findOutfitCandidates } from "./candidate-filter";
import { ProductResolutionError, resolveSelectedOutfits } from "./product-resolver";
import type { RecommendOutfitInput } from "./recommendation-input";
import type { AIOutfitSelection, AIStylistInput, OutfitRequestSummary, ProductStylingMetadata, RecommendOutfitResponse } from "./types";

export type RecommendationErrorCode = "NO_PRODUCTS" | "INSUFFICIENT_PRODUCTS" | "AI_NOT_CONFIGURED" | "AI_UNAVAILABLE" | "INVALID_AI_OUTPUT" | "CATALOG_CHANGED";
export class RecommendationError extends Error {
  constructor(public code: RecommendationErrorCode, message: string, public status: number) { super(message); this.name = "RecommendationError"; }
}

function summary(input: RecommendOutfitInput): OutfitRequestSummary {
  const text = normalizeSearch(input.request);
  const styles = ["minimal", "casual", "formal", "streetwear", "sporty", "vintage", "korean"].filter(style => text.includes(style));
  const vibes = [["trẻ trung", /tre trung/], ["thanh lịch", /thanh lich/], ["thoải mái", /thoai mai/], ["cá tính", /ca tinh/], ["năng động", /nang dong/]] as const;
  const inferred = input.context.occasion || (/ca phe|cafe/.test(text) ? "cafe" : /di lam|cong so/.test(text) ? "work" : /hen ho/.test(text) ? "date" : /dam cuoi|cuoi/.test(text) ? "wedding" : /tiec/.test(text) ? "party" : /bien/.test(text) ? "beach" : null);
  return { occasion: inferred, style: styles, vibe: vibes.filter(([, pattern]) => pattern.test(text)).map(([name]) => name), season: input.context.season };
}

function hasCompleteCore(candidates: ProductStylingMetadata[], budget: number | null) {
  const has = (category: ProductStylingMetadata["category"]) => candidates.some(candidate => candidate.category === category);
  if (!has("shoes") || !((has("top") && has("bottom")) || has("dress") || has("jumpsuit"))) return false;
  if (budget === null) return true;
  const cheapest = (category: ProductStylingMetadata["category"]) => Math.min(...candidates.filter(candidate => candidate.category === category).map(candidate => candidate.price));
  const shoes = cheapest("shoes");
  return cheapest("top") + cheapest("bottom") + shoes <= budget || cheapest("dress") + shoes <= budget || cheapest("jumpsuit") + shoes <= budget;
}

type Dependencies = { provider?: AIProvider; findCandidates?: typeof findOutfitCandidates; resolve?: typeof resolveSelectedOutfits };

export async function recommendOutfits(input: RecommendOutfitInput, dependencies: Dependencies = {}): Promise<RecommendOutfitResponse> {
  const normalized: AIStylistInput = input;
  const candidateResult = await (dependencies.findCandidates || findOutfitCandidates)(normalized, 40);
  if (!candidateResult.candidates.length) throw new RecommendationError("NO_PRODUCTS", "Không có sản phẩm còn hàng phù hợp yêu cầu này.", 422);
  if (!hasCompleteCore(candidateResult.candidates, input.context.budget)) throw new RecommendationError("INSUFFICIENT_PRODUCTS", "Danh mục chưa đủ món còn hàng để tạo một outfit hoàn chỉnh trong ngân sách.", 422);
  const provider = dependencies.provider || createAIProvider();
  const request = { input: normalized, candidates: candidateResult.candidates, instructions: OUTFIT_STYLIST_SYSTEM_PROMPT, schemaName: "fitcraft_outfit_recommendations", responseSchema: buildOutfitStylistJsonSchema(candidateResult.candidates.map(candidate => candidate.id), input.numberOfOutfits) };
  let selections: AIOutfitSelection[] | undefined, providerResult: AIProviderResult | undefined, attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      providerResult = await provider.generate(request);
      selections = validateAIStylistOutput(providerResult.data, candidateResult.candidates, input.numberOfOutfits, { budget: input.context.budget });
      break;
    } catch (error) {
      const retryable = error instanceof AIOutputValidationError || error instanceof AIProviderError && error.code === "INVALID_RESPONSE";
      if (retryable && attempts < 2) continue;
      if (retryable) throw new RecommendationError("INVALID_AI_OUTPUT", "AI Stylist chưa tạo được bộ phối hợp lệ. Vui lòng thử lại.", 502);
      if (error instanceof AIProviderError && error.code === "NOT_CONFIGURED") throw new RecommendationError("AI_NOT_CONFIGURED", "AI Stylist chưa được cấu hình trên máy chủ.", 503);
      if (error instanceof AIProviderError) throw new RecommendationError("AI_UNAVAILABLE", error.message, 502);
      throw error;
    }
  }
  if (!selections || !providerResult) throw new RecommendationError("INVALID_AI_OUTPUT", "AI Stylist chưa tạo được bộ phối hợp lệ.", 502);
  let outfits;
  try { outfits = await (dependencies.resolve || resolveSelectedOutfits)(selections); }
  catch (error) {
    if (error instanceof ProductResolutionError) throw new RecommendationError("CATALOG_CHANGED", "Sản phẩm vừa thay đổi trạng thái. Hãy tạo lại gợi ý.", 409);
    throw error;
  }
  return { status: "success", requestSummary: summary(input), outfits, engine: { provider: providerResult.provider, model: providerResult.model }, meta: { candidateCount: candidateResult.candidates.length, eligibleCount: candidateResult.eligibleCount, scannedCount: candidateResult.scannedCount, attempts } };
}
