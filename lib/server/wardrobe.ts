import { z } from "zod";
import { db } from "./db";
import { ApiError } from "./http";
import { imageUrl } from "./validation";
import { normalizeColor, normalizeSearch, wardrobeCategories, wardrobeTags, TagKind } from "../wardrobe";

const category = z.enum(Object.keys(wardrobeCategories) as [keyof typeof wardrobeCategories, ...Array<keyof typeof wardrobeCategories>]);
const color = z.string().trim().max(40).transform(normalizeColor).pipe(z.string().regex(/^#[0-9a-f]{6}$/, "Chọn màu chuẩn hoặc nhập mã hex hợp lệ."));
const tags = (kind: TagKind) => z.array(z.string().refine(v => Object.hasOwn(wardrobeTags[kind], v), "Thuộc tính không hợp lệ.")).max(8).default([]).transform(v => Array.from(new Set(v)));
export const wardrobeInput = z.object({
  name: z.string().trim().min(1, "Nhập tên món đồ.").max(150), category, color, imageUrl,
  season: tags("season"), style: tags("style"), occasion: tags("occasion")
}).strict();
const queryInput = z.object({
  q: z.string().trim().max(150).default(""), category: category.optional(), color: color.optional(),
  season: z.enum(Object.keys(wardrobeTags.season) as [string, ...string[]]).optional(),
  style: z.enum(Object.keys(wardrobeTags.style) as [string, ...string[]]).optional(),
  occasion: z.enum(Object.keys(wardrobeTags.occasion) as [string, ...string[]]).optional()
}).strict();

type StoredItem = Awaited<ReturnType<typeof db.wardrobeItem.findMany>>[number] & { tags: { kind: string; value: string }[] };
function present(item: StoredItem) {
  // Never expose the owner/session key in the public representation.
  return { id: item.id, name: item.name, category: item.category, color: normalizeColor(item.color), imageUrl: item.imageUrl,
    createdAt: item.createdAt, updatedAt: item.updatedAt,
    ...Object.fromEntries((["season", "style", "occasion"] as const).map(kind => [kind, item.tags.filter(t => t.kind === kind).map(t => t.value)])) };
}
export async function listWardrobe(sessionId: string, params: URLSearchParams) {
  const query = queryInput.parse(Object.fromEntries(params));
  // The closet is bounded to 200 items. Normalize after loading so legacy names/colors
  // also support Vietnamese accent-insensitive search without a destructive backfill.
  const items = await db.wardrobeItem.findMany({
    where: { sessionId, ...(query.category ? { category: query.category } : {}),
      AND: (["season", "style", "occasion"] as const).filter(k => query[k]).map(kind => ({ tags: { some: { kind, value: query[kind]! } } })) },
    include: { tags: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 200
  });
  const filtered = items.filter(i => normalizeSearch(i.name).includes(normalizeSearch(query.q)) && (!query.color || normalizeColor(i.color) === query.color));
  return { items: filtered.map(present), total: filtered.length, limit: 200 };
}
export async function createWardrobe(sessionId: string, input: z.infer<typeof wardrobeInput>) {
  const { season, style, occasion, ...fields } = input;
  // Check the quota and insert the item + tags in one transaction.
  return db.$transaction(async tx => {
    if (await tx.wardrobeItem.count({ where: { sessionId } }) >= 200) throw new ApiError(400, "LIMIT_REACHED", "Tủ đồ tối đa 200 món.");
    const item = await tx.wardrobeItem.create({ data: { ...fields, searchName: normalizeSearch(fields.name), sessionId,
      tags: { create: Object.entries({ season, style, occasion }).flatMap(([kind, values]) => values.map(value => ({ kind, value }))) }
    }, include: { tags: true } });
    return { item: present(item) };
  });
}
export async function deleteWardrobe(sessionId: string, id: string) {
  // Ownership belongs in the delete predicate; never trust an owner from the client.
  const result = await db.wardrobeItem.deleteMany({ where: { id, sessionId } });
  if (!result.count) throw new ApiError(404, "NOT_FOUND", "Món đồ không tồn tại hoặc đã được xóa.");
  return { ok: true };
}
