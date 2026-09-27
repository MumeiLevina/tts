import { db } from "./db";
import { ApiError } from "./http";

export const aiStylistFeatureKey = "ai_stylist";

export async function featureFlags() {
  const rows = await db.$queryRaw<Array<{ enabled: boolean }>>`SELECT "enabled" FROM "FeatureFlag" WHERE "key" = ${aiStylistFeatureKey} LIMIT 1`;
  return { aiStylist: rows[0]?.enabled === true };
}

export async function setAiStylistFeature(enabled: boolean) {
  await db.$executeRaw`INSERT INTO "FeatureFlag" ("key", "enabled", "updatedAt") VALUES (${aiStylistFeatureKey}, ${enabled}, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "enabled" = ${enabled}, "updatedAt" = CURRENT_TIMESTAMP`;
  return featureFlags();
}

export async function requireAiStylist() {
  if (!(await featureFlags()).aiStylist) {
    throw new ApiError(503, "FEATURE_DISABLED", "AI Stylist đang tạm ẩn để được hoàn thiện thêm.");
  }
}
