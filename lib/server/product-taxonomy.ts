import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { defaultTaxonomy, normalizeTaxonomyName, productGroups, type ProductGroup, type TaxonomyKind } from "../product-taxonomy";
import { ApiError } from "./http";
import { db } from "./db";

export const taxonomyQuery = z.object({
  group: z.enum(productGroups.map(([code]) => code) as [ProductGroup, ...ProductGroup[]]),
  kind: z.enum(["SUBCATEGORY", "FIT"])
});
export const taxonomyCreateInput = taxonomyQuery.extend({ name: z.string().trim().min(1).max(80).transform(value => value.replace(/\s+/g, " ")) }).strict();
export const scopeForAdmin = (userId: string | null) => userId ? `ADMIN:${userId}` : "ADMIN_API";

export async function seedDefaultTaxonomy(client: PrismaClient = db) {
  for (const item of defaultTaxonomy) {
    const normalizedName = normalizeTaxonomyName(item.name);
    await client.productTaxonomyOption.upsert({
      where: { scopeKey_kind_groupCode_normalizedName: { scopeKey: "GLOBAL", kind: item.kind, groupCode: item.groupCode, normalizedName } },
      update: { name: item.name, aliases: item.aliases || [], isDefault: true },
      create: { scopeKey: "GLOBAL", kind: item.kind, groupCode: item.groupCode, name: item.name, normalizedName, aliases: item.aliases || [], isDefault: true }
    });
  }
}

export async function listTaxonomy(scopeKey: string, groupCode: ProductGroup, kind: TaxonomyKind) {
  const options = await db.productTaxonomyOption.findMany({
    where: { scopeKey: { in: ["GLOBAL", scopeKey] }, groupCode, kind },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }]
  });
  return options.map(option => ({ ...option, aliases: Array.isArray(option.aliases) ? option.aliases.filter((value): value is string => typeof value === "string") : [] }));
}

export async function createTaxonomyOption(scopeKey: string, input: z.infer<typeof taxonomyCreateInput>) {
  const normalizedName = normalizeTaxonomyName(input.name);
  if (!normalizedName) throw new ApiError(400, "EMPTY_TAXONOMY", "Tên không được để trống.");
  const visible = await listTaxonomy(scopeKey, input.group, input.kind);
  const equivalent = visible.find(option => option.normalizedName === normalizedName || option.aliases.some(alias => normalizeTaxonomyName(alias) === normalizedName));
  if (equivalent) return { option: equivalent, created: false };
  try {
    const option = await db.productTaxonomyOption.create({ data: { scopeKey, groupCode: input.group, kind: input.kind, name: input.name, normalizedName, aliases: [], isDefault: false } });
    return { option: { ...option, aliases: [] as string[] }, created: true };
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const option = await db.productTaxonomyOption.findUniqueOrThrow({ where: { scopeKey_kind_groupCode_normalizedName: { scopeKey, groupCode: input.group, kind: input.kind, normalizedName } } });
    return { option: { ...option, aliases: Array.isArray(option.aliases) ? option.aliases as string[] : [] }, created: false };
  }
}

export async function assertTaxonomySelection(scopeKey: string, groupCode: ProductGroup, kind: TaxonomyKind, value?: string | null) {
  if (!value) return undefined;
  const normalized = normalizeTaxonomyName(value);
  const visible = await listTaxonomy(scopeKey, groupCode, kind);
  const option = visible.find(item => item.normalizedName === normalized || item.aliases.some(alias => normalizeTaxonomyName(alias) === normalized));
  if (!option) throw new ApiError(400, "INVALID_TAXONOMY", `${kind === "FIT" ? "Dáng/phom" : "Loại món"} không thuộc nhóm chính đã chọn.`);
  return option.name;
}
