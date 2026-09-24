import type { ResolvedProduct } from "./types";

export type OutfitCartLine = { variantId: string; quantity: 1 };

export class OutfitCartSelectionError extends Error {
  constructor(public code: "EMPTY_OUTFIT" | "MISSING_VARIANT" | "INVALID_VARIANT" | "OUT_OF_STOCK", message: string, public productId?: string) {
    super(message);
    this.name = "OutfitCartSelectionError";
  }
}

/** Build the existing cart API payload without guessing size, color or inventory. */
export function buildOutfitCartLines(products: ResolvedProduct[], selections: Record<string, string>): OutfitCartLine[] {
  if (!products.length) throw new OutfitCartSelectionError("EMPTY_OUTFIT", "Outfit chưa có sản phẩm để thêm vào giỏ.");
  const seen = new Set<string>();
  return products.map(product => {
    if (seen.has(product.id)) throw new OutfitCartSelectionError("INVALID_VARIANT", `Outfit chứa sản phẩm trùng lặp: ${product.name}.`, product.id);
    seen.add(product.id);
    const selectedId = selections[product.id];
    if (!selectedId) throw new OutfitCartSelectionError("MISSING_VARIANT", `Hãy chọn size hoặc phiên bản cho ${product.name}.`, product.id);
    const variant = product.variants.find(candidate => candidate.id === selectedId);
    if (!variant) throw new OutfitCartSelectionError("INVALID_VARIANT", `Phiên bản đã chọn của ${product.name} không còn hợp lệ.`, product.id);
    if (variant.stock < 1) throw new OutfitCartSelectionError("OUT_OF_STOCK", `${product.name}, size ${variant.size} vừa hết hàng.`, product.id);
    return { variantId: variant.id, quantity: 1 };
  });
}
