export const productGroups = [
  ["TOP", "Áo"], ["BOTTOM", "Quần"], ["SKIRT", "Chân váy"], ["DRESS", "Váy liền / Đầm"],
  ["OUTERWEAR", "Áo khoác"], ["SET", "Đồ bộ"], ["JUMPSUIT", "Đồ liền thân"],
  ["FOOTWEAR", "Giày / Dép"], ["BAG", "Túi"], ["ACCESSORY", "Phụ kiện"]
] as const;

export type ProductGroup = typeof productGroups[number][0];
export type TaxonomyKind = "SUBCATEGORY" | "FIT";
export const productGroupLabels = Object.fromEntries(productGroups) as Record<ProductGroup, string>;

export function normalizeTaxonomyName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim().replace(/\s+/g, " ");
}

export type TaxonomySeed = { groupCode: ProductGroup; kind: TaxonomyKind; name: string; aliases?: string[] };
const types: Record<ProductGroup, Array<string | [string, ...string[]]>> = {
  TOP: [["Áo thun", "áo phông", "tee", "t-shirt"], ["Áo sơ mi", "sơ mi"], "Áo polo", "Áo kiểu", "Áo blouse", "Áo hai dây", "Áo ba lỗ", "Áo croptop", "Áo len", "Áo sweatshirt", "Áo hoodie"],
  BOTTOM: [["Quần jeans", "quần bò", "jeans"], "Quần tây", "Quần kaki/chinos", "Quần short", "Quần jogger", "Quần cargo", "Quần legging", "Quần culottes"],
  SKIRT: ["Chân váy chữ A", "Chân váy bút chì", "Chân váy xếp ly", "Chân váy xòe", "Chân váy quấn", "Chân váy tầng", "Chân váy đuôi cá"],
  DRESS: [["Đầm suông", "váy suông"], ["Đầm chữ A", "váy chữ a"], ["Đầm ôm", "váy ôm"], ["Đầm xòe", "váy xòe"], ["Đầm sơ mi", "váy sơ mi"], ["Đầm hai dây", "váy hai dây"], ["Đầm quấn", "váy quấn"], ["Đầm trễ vai", "váy trễ vai"]],
  OUTERWEAR: ["Blazer", "Cardigan", "Áo bomber", "Áo khoác denim", "Áo khoác da", "Áo gió", "Áo phao", "Áo khoác dạ", "Áo trench coat"],
  SET: ["Bộ vest", "Bộ áo và quần", "Bộ áo và chân váy", "Bộ thể thao", "Bộ mặc nhà", "Bộ đồ ngủ"],
  JUMPSUIT: ["Jumpsuit", "Playsuit"],
  FOOTWEAR: [["Sneaker", "sneakers", "giày thể thao"], "Loafer", "Giày tây", "Boots", "Giày cao gót", "Giày búp bê", "Sandal", "Dép"],
  BAG: ["Túi đeo vai", "Túi đeo chéo", "Túi xách tay", "Túi tote", "Túi clutch", "Balo"],
  ACCESSORY: ["Thắt lưng", "Mũ", "Khăn", "Kính", "Tất", "Cà vạt", "Trang sức"]
};
const fits: Partial<Record<ProductGroup, string[]>> = {
  TOP: ["Ôm/slim fit", "Vừa người/regular fit", "Thoải mái/relaxed fit", "Oversize"],
  OUTERWEAR: ["Ôm/slim fit", "Vừa người/regular fit", "Thoải mái/relaxed fit", "Oversize"],
  BOTTOM: ["Skinny", "Slim", "Ống đứng", "Ống rộng", "Ống loe", "Ống côn"],
  SKIRT: ["Ôm", "Suông", "Chữ A", "Xòe", "Đuôi cá"],
  DRESS: ["Ôm", "Suông", "Chữ A", "Xòe", "Đuôi cá"]
};

export const defaultTaxonomy: TaxonomySeed[] = productGroups.flatMap(([groupCode]) => [
  ...types[groupCode].map(value => ({ groupCode, kind: "SUBCATEGORY" as const, name: Array.isArray(value) ? value[0] : value, aliases: Array.isArray(value) ? value.slice(1) : [] })),
  ...(fits[groupCode] || []).map(name => ({ groupCode, kind: "FIT" as const, name, aliases: [] }))
]);
