import { z } from "zod";
export const category = z.enum(["TOP", "BOTTOM", "SKIRT", "DRESS", "OUTERWEAR", "FOOTWEAR", "ACCESSORY"]);
export const imageUrl = z.string().max(2048).url().refine(v => new URL(v).protocol === "https:", "Ảnh phải dùng HTTPS.");
export const productSeason = z.enum(["spring", "summer", "autumn", "winter", "all-season"]);
export const productOccasion = z.enum(["cafe", "work", "date", "party", "wedding", "beach", "travel", "casual", "formal"]);
export const productPattern = z.enum(["solid", "striped", "checkered", "floral", "graphic", "textured", "other"]);
export const productFit = z.enum(["slim", "regular", "relaxed", "oversized", "tailored"]);
export const productInput = z.object({
  name: z.string().trim().min(2).max(150), brand: z.string().trim().min(1).max(80),
  category, price: z.number().int().min(1000).max(100000000), image: imageUrl,
  subcategory: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(3000).default(""), material: z.string().trim().max(300).default(""),
  care: z.string().trim().max(500).default(""), style: z.string().trim().max(150).default("casual"),
  pattern: productPattern.optional(), fit: productFit.optional(),
  season: z.array(productSeason).max(5).default([]).transform(values => Array.from(new Set(values))),
  occasion: z.array(productOccasion).max(12).default([]).transform(values => Array.from(new Set(values))),
  formality: z.number().int().min(0).max(5).optional(), transparentImageUrl: imageUrl.optional(),
  tagBadge: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  variants: z.array(z.object({ size: z.string().trim().min(1).max(12), color: z.string().trim().min(1).max(40), colorHex: z.string().regex(/^#[a-fA-F0-9]{6}$/), stock: z.number().int().min(0).max(100000) })).min(1).max(100)
}).strict().refine(p => new Set(p.variants.map(v => `${v.size}:${v.color}`)).size === p.variants.length, "Size và màu bị trùng.");
export const checkoutInput = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(?:0|\+84)[0-9]{9}$/, "Số điện thoại Việt Nam không hợp lệ."),
  address: z.string().trim().min(10).max(300), city: z.string().trim().min(2).max(80),
  note: z.string().trim().max(500).optional(), paymentMethod: z.literal("COD").default("COD")
}).strict();
