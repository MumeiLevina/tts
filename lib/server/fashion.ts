import { z } from "zod";
import { db } from "./db";
import { presentProduct } from "./catalog";
import { ApiError } from "./http";

export const stylistInput = z.object({ message: z.string().trim().min(1).max(2000), budget: z.number().int().min(1000).max(100000000).optional(), size: z.string().max(12).optional(), occasion: z.enum(["office", "casual", "party", "beach"]).optional() }).strict();
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();

export async function recommendOutfit(input: z.infer<typeof stylistInput>) {
  const text = normalize(input.message);
  const amount = text.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan)/);
  const budget = input.budget ?? (amount ? Math.round(Number(amount[1].replace(",", ".")) * (/^tr/.test(amount[2]) ? 1000000 : 1000)) : 2000000);
  const occasion = input.occasion ?? (/lam|phong van|cong so|tailoring/.test(text) ? "office" : /bien|linen/.test(text) ? "beach" : /tiec|hen ho|glam/.test(text) ? "party" : "casual");
  const products = await db.product.findMany({ where: { active: true, price: { lte: budget }, variants: { some: { stock: { gt: 0 }, ...(input.size ? { OR: [{ size: input.size }, { size: "F" }] } : {}) } } }, include: { variants: true }, orderBy: { price: "asc" }, take: 200 });
  const rank = (p: typeof products[number]) => (p.style.includes(occasion) ? 4 : 0) + (p.variants.some(v => text.includes(normalize(v.color))) ? 2 : 0);
  const tops = products.filter(p => p.category === "TOP");
  const bottoms = products.filter(p => p.category === "BOTTOM");
  let best: typeof products = [];
  let score = -1;
  for (const top of tops) for (const bottom of bottoms) {
    if (top.price + bottom.price > budget) continue;
    const next = rank(top) + rank(bottom);
    if (next > score) { score = next; best = [top, bottom]; }
  }
  if (!best.length) return { engine: "catalog-rules", message: input.message, rationale: "Chưa có bộ áo và quần/váy đủ tồn kho trong ngân sách này. Bạn có thể tăng ngân sách hoặc đổi size.", outfit: [], alternatives: products.slice(0, 4).map(presentProduct), budget, total: 0, occasion };
  const remaining = budget - best.reduce((sum, p) => sum + p.price, 0);
  const accessory = products.filter(p => p.category === "ACCESSORY" && p.price <= remaining).sort((a, b) => rank(b) - rank(a))[0];
  if (accessory) best.push(accessory);
  const names: Record<string, string> = { office: "đi làm", casual: "dạo phố", beach: "đi biển", party: "dự tiệc" };
  return { engine: "catalog-rules", message: input.message, rationale: "Gợi ý " + names[occasion] + " từ sản phẩm còn hàng, trong ngân sách " + budget.toLocaleString("vi-VN") + "₫. Gợi ý dựa trên phong cách, màu và giá; hãy kiểm tra bảng size trước khi mua.", outfit: best.map(p => ({ ...presentProduct(p), ...(input.size ? { selectedSize: p.variants.find(v => v.stock > 0 && v.size === input.size)?.size || "F" } : {}) })), alternatives: products.filter(p => !best.some(b => b.id === p.id)).slice(0, 4).map(presentProduct), budget, total: best.reduce((sum, p) => sum + p.price, 0), occasion };
}

export const measurementInput = z.object({ productId: z.string().min(1).max(100), chest: z.number().min(40).max(200).optional(), waist: z.number().min(40).max(200).optional(), hip: z.number().min(40).max(200).optional() }).strict().refine(v => v.chest || v.waist || v.hip, "Cần ít nhất một số đo theo cm.");
export async function recommendSize(input: z.infer<typeof measurementInput>) {
  const p = await db.product.findFirst({ where: { id: input.productId, active: true }, include: { sizeGuide: true, variants: true } });
  if (!p) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");
  const measurements = ["chest", "waist", "hip"] as const;
  const matches = p.sizeGuide.filter(row => measurements.every(m => {
    if (input[m] === undefined) return true;
    const min = row[(m + "Min") as "chestMin" | "waistMin" | "hipMin"], max = row[(m + "Max") as "chestMax" | "waistMax" | "hipMax"];
    return min !== null && max !== null && input[m]! >= min && input[m]! <= max;
  }));
  return { unit: "cm", matches: matches.map(row => ({ size: row.size, inStock: p.variants.some(v => v.size === row.size && v.stock > 0) })), sizeGuide: p.sizeGuide, note: "Tham khảo theo bảng số đo của sản phẩm, không đảm bảo độ vừa vặn. Số đo gửi lên không được lưu." };
}

