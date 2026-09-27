import type { OutfitSlot } from "./types";

const aliases: Record<string, OutfitSlot> = {
  TOP: "top", SHIRT: "top", TSHIRT: "top", TEE: "top", BLOUSE: "top", HOODIE: "top", SWEATER: "top",
  BOTTOM: "bottom", PANTS: "bottom", TROUSERS: "bottom", JEANS: "bottom", SHORTS: "bottom", SKIRT: "bottom",
  DRESS: "dress", JUMPSUIT: "jumpsuit", ROMPER: "jumpsuit", PLAYSUIT: "jumpsuit",
  OUTERWEAR: "outerwear", JACKET: "outerwear", COAT: "outerwear", CARDIGAN: "outerwear", BLAZER: "outerwear",
  FOOTWEAR: "shoes", SHOES: "shoes", SNEAKERS: "shoes", HEELS: "shoes", BOOTS: "shoes", SANDALS: "shoes",
  ACCESSORY: "accessory", ACCESSORIES: "accessory", BAG: "accessory", JEWELRY: "accessory", HAT: "accessory"
};

export function normalizeProductCategory(category: string, subcategory?: string | null): OutfitSlot | null {
  const normalize = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return aliases[normalize(subcategory || "")] || aliases[normalize(category)] || null;
}

export function categoryMatchesSlot(category: string, slot: OutfitSlot, subcategory?: string | null) {
  return normalizeProductCategory(category, subcategory) === slot;
}
