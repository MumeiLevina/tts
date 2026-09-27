import { OutfitPiece, RecommendedOutfit, WardrobeProduct } from "../product-wardrobe";

type Hsl = { h: number; s: number; l: number };
function hsl(hex: string): Hsl | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const l = (max + min) / 2;
  if (!delta) return { h: 0, s: 0, l };
  const hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: delta / (1 - Math.abs(2 * l - 1)), l };
}
function neutral(c: Hsl) {
  // Achromatic shades, near-black/white, and muted earth tones act as neutrals.
  return c.s <= .15 || c.l <= .18 || c.l >= .9 || (c.h >= 15 && c.h <= 65 && c.s <= .5);
}
export function colorHarmony(a: string, b: string) {
  const x = hsl(a), y = hsl(b);
  if (!x || !y) return { score: .4, reason: "Thiếu thông tin màu" };
  if (neutral(x) || neutral(y)) return { score: .95, reason: "Màu trung tính làm nền" };
  const distance = Math.min(Math.abs(x.h - y.h), 360 - Math.abs(x.h - y.h));
  if (distance <= 35) return { score: .9, reason: "Các màu tương đồng" };
  if (distance >= 150) return { score: .85, reason: "Màu bổ túc tạo tương phản" };
  return { score: .35, reason: "Màu sắc khó kết hợp" };
}
export function styleHarmony(a: string[], b: string[]) {
  if (!a.length || !b.length) return .5;
  if (a.some(s => b.includes(s))) return 1;
  const pairs = ["casual:streetwear", "casual:sporty", "casual:minimal", "formal:minimal", "casual:vintage", "formal:vintage", "sporty:streetwear"];
  return pairs.some(pair => { const [x, y] = pair.split(":"); return (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x)); }) ? .75 : 0;
}

// Seeded randomness makes the same request reproducible and tests deterministic.
function randomSource(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
type Scored = { score: number; reasons: string[] };
function evaluate(pieces: OutfitPiece[]): Scored | null {
  let colorSum = 0, styleSum = 0, pairs = 0;
  const reasons = new Set<string>();
  for (let i = 0; i < pieces.length; i++) for (let j = i + 1; j < pieces.length; j++) {
    const style = styleHarmony(pieces[i].product.styles, pieces[j].product.styles);
    // A hard style conflict cannot be rescued by a good average color score.
    if (style === 0) return null;
    const color = colorHarmony(pieces[i].color.hex, pieces[j].color.hex);
    colorSum += color.score; styleSum += style; pairs++;
    if (color.score >= .8) reasons.add(color.reason);
  }
  if (!pairs) return { score: 95, reasons: ["Váy liền có thể mặc độc lập"] };
  const colorScore = colorSum / pairs, styleScore = styleSum / pairs;
  if (colorScore < .65) return null;
  reasons.add(pieces.some(p => !p.product.styles.length) ? "Một số món chưa có phong cách; cần kiểm tra thêm" : styleScore >= .95 ? "Phong cách đồng nhất" : "Các phong cách có thể kết hợp");
  return { score: Math.round(100 * (.6 * colorScore + .4 * styleScore)), reasons: Array.from(reasons) };
}
function piece(product: WardrobeProduct, slot: OutfitPiece["slot"], color: WardrobeProduct["colors"][number]): OutfitPiece {
  return { product, slot, color };
}

/** Mix & match is bounded and uses ONLY its input wardrobe:
 * 1. Require TOP + BOTTOM/SKIRT, or DRESS; footwear is optional.
 * 2. Evaluate all color assignments, capped at 3 real shop colors per product.
 * 3. Reject style conflicts; rank the best compatible color assignment.
 * 4. Optionally attach a compatible coat/accessory, never a second core slot.
 * 5. Deduplicate product sets, then diversify results instead of blindly shuffling.
 * Each core category is capped at 12 candidates; max core triples = 12^3.
 */
export function mixWardrobe(products: WardrobeProduct[], options: { seed: string; limit: number; random: boolean; exclude?: string[] }) {
  const random = randomSource(options.seed);
  const eligible = Array.from(new Map(products.filter(p => p.active && !p.isCombo && p.colors.some(c => hsl(c.hex))).map(p => [p.id, p])).values()).sort((a, b) => a.id.localeCompare(b.id));
  const group = (...categories: string[]) => {
    const matches = eligible.filter(p => categories.includes(p.category));
    return (options.random ? shuffle(matches, random) : matches).slice(0, 12);
  };
  const tops = group("TOP"), bottoms = group("BOTTOM", "SKIRT"), dresses = group("DRESS"), shoes = group("FOOTWEAR");
  const coats = group("OUTERWEAR"), accessories = group("ACCESSORY");
  const missing: string[] = [];
  if (!dresses.length) { if (!tops.length) missing.push("Áo hoặc váy liền"); if (!bottoms.length) missing.push("Quần/chân váy hoặc váy liền"); }
  if (missing.length) return { outfits: [] as RecommendedOutfit[], missing, eligibleCount: eligible.length, candidateCount: 0, message: "Chưa đủ nhóm đồ. Hãy lưu thêm: " + missing.join(", ") + "." };

  const colors = (p: WardrobeProduct) => p.colors.filter(c => hsl(c.hex)).slice(0, 3);
  const candidates = new Map<string, RecommendedOutfit>();
  function addCore(core: { product: WardrobeProduct; slot: OutfitPiece["slot"] }[]) {
    let best: { pieces: OutfitPiece[]; quality: Scored } | null = null;
    // A bounded recursive product of actual color options; no fabricated colors.
    function assign(index: number, selected: OutfitPiece[]) {
      if (index === core.length) {
        const quality = evaluate(selected);
        if (quality && (!best || quality.score > best.quality.score)) best = { pieces: selected, quality };
        return;
      }
      for (const color of colors(core[index].product)) assign(index + 1, [...selected, piece(core[index].product, core[index].slot, color)]);
    }
    assign(0, []);
    if (!best) return;
    const found = best as { pieces: OutfitPiece[]; quality: Scored };
    let selected = found.pieces;
    // Add at most one layer and one accessory only when the full set stays coherent.
    for (const [extras, slot] of [[selected.some(p => p.slot === "footwear") ? [] : shoes, "footwear"], [coats, "outerwear"], [accessories, "accessory"]] as const) {
      let extension: { pieces: OutfitPiece[]; quality: Scored } | null = null;
      for (const product of extras) for (const color of colors(product)) {
        const next = [...selected, piece(product, slot, color)], quality = evaluate(next);
        if (quality && quality.score >= found.quality.score - 5 && (!extension || quality.score > extension.quality.score)) extension = { pieces: next, quality };
      }
      if (extension) selected = extension.pieces;
    }
    const quality = evaluate(selected)!;
    const id = selected.map(p => p.product.id).sort().join("|");
    candidates.set(id, { id, pieces: selected, ...quality, totalPrice: selected.reduce((sum, p) => sum + p.product.price, 0) });
  }
  for (const top of tops) for (const bottom of bottoms) for (const shoe of [...shoes, undefined]) addCore([{ product: top, slot: "top" }, { product: bottom, slot: "bottom" }, ...(shoe ? [{ product: shoe, slot: "footwear" as const }] : [])]);
  for (const dress of dresses) for (const shoe of [...shoes, undefined]) addCore([{ product: dress, slot: "dress" }, ...(shoe ? [{ product: shoe, slot: "footwear" as const }] : [])]);

  const all = Array.from(candidates.values());
  const excluded = new Set(options.exclude || []);
  const fresh = all.filter(o => !excluded.has(o.id));
  // Reuse existing options only if no new valid set is possible; explain it below.
  const pool = fresh.length ? fresh : all;
  const ranked = pool.map(outfit => ({ outfit, jitter: options.random ? random() * 12 : 0 }));
  const outfits: RecommendedOutfit[] = [];
  const used = new Map<string, number>();
  while (ranked.length && outfits.length < options.limit) {
    const rank = (o: typeof ranked[number]) => o.outfit.score + o.jitter - o.outfit.pieces.reduce((sum, p) => sum + (used.get(p.product.id) || 0) * 3, 0);
    ranked.sort((a, b) => rank(b) - rank(a) || a.outfit.id.localeCompare(b.outfit.id));
    const next = ranked.shift()!.outfit; outfits.push(next);
    next.pieces.forEach(p => used.set(p.product.id, (used.get(p.product.id) || 0) + 1));
  }
  return { outfits, missing: [], eligibleCount: eligible.length, candidateCount: all.length,
    message: !outfits.length ? "Đã đủ nhóm đồ nhưng chưa có bộ hợp màu và phong cách. Hãy lưu thêm món có màu trung tính hoặc cùng phong cách."
      : excluded.size && !fresh.length ? "Chưa có bộ khác phù hợp trong tủ đồ; đây là những lựa chọn hiện có."
      : "Gợi ý từ sản phẩm bạn đã lưu. Màu đề xuất nằm dưới từng món; ảnh shop có thể minh họa màu khác." };
}
