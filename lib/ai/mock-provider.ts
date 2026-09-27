import { AIProvider, AIProviderRequest, AIProviderResult } from "./provider";
import type { ProductStylingMetadata } from "../outfit/types";

/** Development provider: deterministic and restricted to IDs from the candidate list. */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  async generate(request: AIProviderRequest): Promise<AIProviderResult> {
    const group = (category: ProductStylingMetadata["category"]) => request.candidates.filter(item => item.category === category);
    const tops = group("top"), bottoms = group("bottom"), dresses = group("dress"), jumpsuits = group("jumpsuit"), shoes = group("shoes"), outerwear = group("outerwear"), accessories = group("accessory");
    type Core = { top?: ProductStylingMetadata; bottom?: ProductStylingMetadata; dress?: ProductStylingMetadata; jumpsuit?: ProductStylingMetadata; shoes?: ProductStylingMetadata };
    const cores: Core[] = [];
    for (const shoe of [...shoes, undefined]) {
      for (const top of tops) for (const bottom of bottoms) cores.push({ top, bottom, shoes: shoe });
      for (const dress of dresses) cores.push({ dress, shoes: shoe });
      for (const jumpsuit of jumpsuits) cores.push({ jumpsuit, shoes: shoe });
    }
    const budget = request.input.context.budget;
    const outfits = cores.filter(core => [core.top, core.bottom, core.dress, core.jumpsuit, core.shoes].filter((item): item is ProductStylingMetadata => Boolean(item)).reduce((sum, item) => sum + item.price, 0) <= (budget ?? Number.POSITIVE_INFINITY))
      .slice(0, request.input.numberOfOutfits).map((core, index) => {
      const basePrice = [core.top, core.bottom, core.dress, core.jumpsuit, core.shoes].filter((item): item is ProductStylingMetadata => Boolean(item)).reduce((sum, item) => sum + item.price, 0);
      const coat = outerwear.find(item => basePrice + item.price <= (budget ?? Number.POSITIVE_INFINITY));
      const bag = accessories.find(item => basePrice + (coat?.price || 0) + item.price <= (budget ?? Number.POSITIVE_INFINITY));
      return {
        outfit_id: `mock_outfit_${index + 1}`, outfit_name: `Bộ phối thử ${index + 1}`,
        layout: core.dress || core.jumpsuit ? "dress_flatlay_01" : "minimal_flatlay_01",
        items: { top_id: core.top?.id || null, bottom_id: core.bottom?.id || null, dress_id: core.dress?.id || null, jumpsuit_id: core.jumpsuit?.id || null, outerwear_id: coat?.id || null, shoes_id: core.shoes?.id || null, accessory_ids: bag ? [bag.id] : [] },
        stylist_advice: "Bản mock dùng sản phẩm thật trong candidate list để phát triển và kiểm thử giao diện.", confidence: 0.8
      };
    });
    return { provider: this.name, model: "deterministic-catalog-mock", data: { status: "success", outfits } };
  }
}
