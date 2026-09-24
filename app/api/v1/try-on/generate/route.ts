import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, body, endpoint } from "../../../../../lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const tryOnInput = z.object({
  modelImage: z.string().trim().min(5).max(4000),
  garmentImage: z.string().trim().min(5).max(4000),
  category: z.enum(["tops", "bottoms", "one-pieces", "all"]).default("tops"),
  mode: z.enum(["performance", "balanced", "quality"]).default("balanced")
}).strict();

type TryOnPayload = z.infer<typeof tryOnInput>;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(req: NextRequest, maxRequests = 10, windowMs = 15 * 60000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();

  if (rateLimitMap.size > 5000) {
    for (const [key, record] of Array.from(rateLimitMap)) {
      if (record.resetAt < now) rateLimitMap.delete(key);
    }
  }

  const record = rateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  record.count++;
  if (record.count > maxRequests) {
    throw new ApiError(429, "RATE_LIMIT_EXCEEDED", "Bạn đã thực hiện quá nhiều lượt thử đồ. Vui lòng chờ ít phút.");
  }
}

async function callFashnProvider(apiKey: string, input: TryOnPayload, apiUrl?: string) {
  const endpointUrl = apiUrl || "https://api.fashn.ai/v1/run";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model_image: input.modelImage,
        garment_image: input.garmentImage,
        category: input.category,
        mode: input.mode
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(502, "PROVIDER_ERROR", err.error?.message || `Fashn API lỗi (${res.status}).`);
    }

    const data = await res.json();
    return {
      status: "COMPLETED",
      id: data.id || `fashn_${Date.now()}`,
      imageUrl: data.output?.[0] || data.image_url || input.garmentImage,
      provider: "fashn",
      category: input.category
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "GATEWAY_TIMEOUT", "Thời gian kết nối tới AI Provider quá lâu. Vui lòng thử lại.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function callReplicateProvider(apiKey: string, input: TryOnPayload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
        input: {
          human_img: input.modelImage,
          garm_img: input.garmentImage,
          garment_des: input.category
        }
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(502, "PROVIDER_ERROR", err.detail || `Replicate API lỗi (${res.status}).`);
    }

    const data = await res.json();
    return {
      status: data.status === "succeeded" ? "COMPLETED" : "PROCESSING",
      id: data.id,
      imageUrl: data.output?.[0] || input.garmentImage,
      provider: "replicate",
      category: input.category
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "GATEWAY_TIMEOUT", "Replicate API không phản hồi kịp thời.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const POST = endpoint(async req => {
  const apiKey = process.env.TRYON_API_KEY?.trim();
  const apiUrl = process.env.TRYON_API_URL?.trim();
  const provider = (process.env.TRYON_PROVIDER || "").toLowerCase().trim();

  // If no provider key is configured on server, report 503 (contract preservation)
  if (!apiKey) {
    throw new ApiError(
      503,
      "TRYON_NOT_CONFIGURED",
      "Thử đồ AI chưa được kết nối. Hiện tại phòng thử chỉ hỗ trợ xem ảnh và chọn bộ đồ."
    );
  }

  // Rate limit protection
  checkRateLimit(req);

  // Validate input
  const input = await body(req, tryOnInput);

  // 1. Mock / Sandbox provider (useful for staging, tests, or demo without burning GPU credits)
  if (provider === "mock" || apiKey.startsWith("mock_")) {
    return {
      status: "COMPLETED",
      id: `tryon_mock_${Date.now()}`,
      imageUrl: input.garmentImage,
      modelImage: input.modelImage,
      category: input.category,
      mode: input.mode,
      provider: "mock",
      processingTimeMs: 120
    };
  }

  // 2. Replicate Provider (IDM-VTON)
  if (provider === "replicate" || apiKey.startsWith("r8_")) {
    return callReplicateProvider(apiKey, input);
  }

  // 3. Fashn.ai Provider (Default commercial fashion try-on)
  return callFashnProvider(apiKey, input, apiUrl);
});