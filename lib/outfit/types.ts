export const outfitSlots = ["top", "bottom", "dress", "jumpsuit", "outerwear", "shoes", "accessory"] as const;
export type OutfitSlot = typeof outfitSlots[number];

export const outfitLayouts = ["minimal_flatlay_01", "casual_flatlay_01", "casual_flatlay_02", "street_flatlay_01", "formal_flatlay_01", "dress_flatlay_01"] as const;
export type OutfitLayoutName = typeof outfitLayouts[number];

export type StylingSeason = "spring" | "summer" | "autumn" | "winter" | "all-season";
export type StylingOccasion = "cafe" | "work" | "date" | "party" | "wedding" | "beach" | "travel" | "casual" | "formal";
export type StylingPattern = "solid" | "striped" | "checkered" | "floral" | "graphic" | "textured" | "other";
export type StylingFit = "slim" | "regular" | "relaxed" | "oversized" | "tailored";

export type ProductStylingMetadata = {
  id: string;
  name: string;
  category: OutfitSlot;
  sourceCategory: string;
  subcategory: string | null;
  colors: { name: string; hex: string }[];
  pattern: StylingPattern | null;
  styles: string[];
  fit: StylingFit | null;
  material: string;
  season: StylingSeason[];
  occasion: StylingOccasion[];
  formality: number | null;
  price: number;
};

export type AIStylistInput = {
  request: string;
  numberOfOutfits: number;
  context: {
    occasion: StylingOccasion | null;
    season: StylingSeason | null;
    weather: string | null;
    temperature: number | null;
    budget: number | null;
  };
  preferredProductIds?: string[];
  excludedProductIds?: string[];
};

export type AIOutfitSelection = {
  outfitId: string;
  outfitName: string;
  layout: OutfitLayoutName;
  items: {
    topId: string | null;
    bottomId: string | null;
    dressId: string | null;
    jumpsuitId: string | null;
    outerwearId: string | null;
    shoesId: string | null;
    accessoryIds: string[];
  };
  stylistAdvice: string;
  confidence: number;
};

export type ResolvedProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: OutfitSlot;
  sourceCategory: string;
  subcategory: string | null;
  price: number;
  imageUrl: string;
  transparentImageUrl: string | null;
  renderImageUrl: string;
  styles: string[];
  tags: string[];
  colors: { name: string; hex: string }[];
  variants: { id: string; size: string; color: string; colorHex: string; stock: number }[];
};

export type ResolvedOutfit = {
  id: string;
  name: string;
  layout: OutfitLayoutName;
  items: {
    top: ResolvedProduct | null;
    bottom: ResolvedProduct | null;
    dress: ResolvedProduct | null;
    jumpsuit: ResolvedProduct | null;
    outerwear: ResolvedProduct | null;
    shoes: ResolvedProduct;
    accessories: ResolvedProduct[];
  };
  stylistAdvice: string;
  confidence: number;
  totalPrice: number;
};

export type OutfitRequestSummary = {
  occasion: StylingOccasion | null;
  style: string[];
  vibe: string[];
  season: StylingSeason | null;
};

export type RecommendOutfitResponse = {
  status: "success";
  requestSummary: OutfitRequestSummary;
  outfits: ResolvedOutfit[];
  engine: { provider: string; model: string };
  meta: { candidateCount: number; eligibleCount: number; scannedCount: number; attempts: number };
};

export type CanvasSlot = {
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
  rotation: number;
  zIndex: number;
  anchor: "center" | "top-left";
};

export type OutfitLayout = Record<OutfitSlot, CanvasSlot[]>;
