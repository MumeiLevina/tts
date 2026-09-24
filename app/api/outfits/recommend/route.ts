import { NextRequest } from "next/server";
import { body, endpoint, ApiError } from "../../../../lib/server/http";
import { recommendOutfitInputSchema } from "../../../../lib/outfit/recommendation-input";
import { recommendOutfits, RecommendationError } from "../../../../lib/outfit/recommendation-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimit(req: NextRequest) {
  const key = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  if (attempts.size > 5000) for (const [storedKey, value] of Array.from(attempts)) if (value.resetAt <= now) attempts.delete(storedKey);
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 10 * 60000 }); return; }
  current.count++;
  if (current.count > 20) throw new ApiError(429, "RATE_LIMIT", "Bạn đã gửi quá nhiều yêu cầu phối đồ. Vui lòng thử lại sau.");
}

export const POST = endpoint(async req => {
  rateLimit(req);
  try { return await recommendOutfits(await body(req, recommendOutfitInputSchema)); }
  catch (error) { if (error instanceof RecommendationError) throw new ApiError(error.status, error.code, error.message); throw error; }
});
