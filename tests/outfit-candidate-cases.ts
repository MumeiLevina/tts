import type { CandidateSourceProduct } from "../lib/outfit/candidate-filter";

export function candidate(id: string, category: string, options: Partial<CandidateSourceProduct> = {}): CandidateSourceProduct {
  return {
    id, name: id, category, subcategory: null, material: "cotton", style: "casual minimal", tags: [], pattern: "solid", fit: "regular",
    season: [], occasion: [], formality: 1, price: 200000, active: true,
    variants: [{ color: "Trắng", colorHex: "#ffffff", stock: 2 }], ...options
  };
}
