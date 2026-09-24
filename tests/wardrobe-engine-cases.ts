// Pure fixtures shared by the backend test suite; no database or external AI.
import type { WardrobeProduct } from "../lib/product-wardrobe";
export function garment(id: string, category: string, styles = ["casual"], hex = "#ffffff"): WardrobeProduct {
  return { id, name: id, category, style: styles.join(" "), styles, colors: [{ name: hex, hex }], imageUrl: "https://example.com/garment.jpg", price: 100000, tags: [], active: true, inStock: true, isCombo: false };
}
