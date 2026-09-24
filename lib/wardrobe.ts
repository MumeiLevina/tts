// Shared vocabulary keeps filters, API validation and future recommendations aligned.
export const wardrobeCategories = { TOP: "Áo", BOTTOM: "Quần", SKIRT: "Chân váy", DRESS: "Váy liền", FOOTWEAR: "Giày", ACCESSORY: "Phụ kiện", OUTERWEAR: "Áo khoác" } as const;
export const wardrobeColors = [
  { name: "Đen", hex: "#000000" }, { name: "Trắng", hex: "#ffffff" },
  { name: "Xám", hex: "#808080" }, { name: "Be", hex: "#f5f5dc" },
  { name: "Nâu", hex: "#8b4513" }, { name: "Đỏ", hex: "#ff0000" },
  { name: "Cam", hex: "#ffa500" }, { name: "Vàng", hex: "#ffff00" },
  { name: "Xanh lá", hex: "#008000" }, { name: "Xanh dương", hex: "#0000ff" },
  { name: "Xanh navy", hex: "#000080" }, { name: "Hồng", hex: "#ffc0cb" },
  { name: "Tím", hex: "#800080" }
] as const;
export const wardrobeTags = {
  season: { SPRING: "Xuân", SUMMER: "Hạ", AUTUMN: "Thu", WINTER: "Đông", ALL_SEASON: "Quanh năm" },
  style: { CASUAL: "Thường ngày", MINIMAL: "Tối giản", ELEGANT: "Thanh lịch", SPORTY: "Thể thao", STREETWEAR: "Đường phố", VINTAGE: "Cổ điển" },
  occasion: { EVERYDAY: "Hằng ngày", WORK: "Đi làm", PARTY: "Dự tiệc", DATE: "Hẹn hò", TRAVEL: "Du lịch", SPORT: "Vận động" }
} as const;
export type TagKind = keyof typeof wardrobeTags;
export type WardrobeItemView = {
  id: string; name: string; category: keyof typeof wardrobeCategories; color: string;
  imageUrl: string; season: string[]; style: string[]; occasion: string[];
  createdAt: string; updatedAt: string;
};
export function normalizeSearch(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}
export function normalizeColor(value: string): string {
  const input = value.trim().toLowerCase();
  const preset = wardrobeColors.find(c => normalizeSearch(c.name) === normalizeSearch(input));
  if (preset) return preset.hex;
  if (/^#[0-9a-f]{3}$/.test(input)) return "#" + input.slice(1).split("").map(c => c + c).join("");
  return input;
}
export function colorLabel(value: string) {
  return wardrobeColors.find(c => c.hex === normalizeColor(value))?.name || value;
}
