import { test, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "../app/api/v1/[...path]/route";
import { POST as stylist } from "../app/api/v1/stylist/chat/route";
import { POST as tryon } from "../app/api/v1/try-on/generate/route";
import { GET as health } from "../app/api/v1/health/route";
import { GET as authGet, POST as authPost } from "../app/api/v1/auth/[...path]/route";
import { db } from "../lib/server/db";
import sharp from "sharp";
import { generateCombos } from "../lib/server/combo-studio";
import { GET as studioImageGet } from "../app/api/studio/images/[id]/route";
import { GET as wardrobeGet, POST as wardrobePost, DELETE as wardrobeDelete } from "../app/api/wardrobe/[[...path]]/route";
import { mixWardrobe, colorHarmony, styleHarmony } from "../lib/server/wardrobe-engine";
import { productStyles, WardrobeProduct } from "../lib/product-wardrobe";
import { garment } from "./wardrobe-engine-cases";
import { categoryMatchesSlot, normalizeProductCategory } from "../lib/outfit/category-normalizer";
import { filterAndRankCandidates } from "../lib/outfit/candidate-filter";
import { candidate } from "./outfit-candidate-cases";
import type { AIStylistInput, ResolvedProduct } from "../lib/outfit/types";
import { MockAIProvider } from "../lib/ai/mock-provider";
import { OpenAIProvider } from "../lib/ai/openai-provider";
import { createAIProvider } from "../lib/ai/provider-factory";
import { AIProviderError, AIProviderRequest } from "../lib/ai/provider";
import { OUTFIT_STYLIST_SYSTEM_PROMPT } from "../lib/ai/prompts/outfit-stylist-prompt";
import { aiStylistOutputSchema, buildOutfitStylistJsonSchema } from "../lib/ai/schemas/outfit-stylist-schema";
import { AIOutputValidationError, validateAIStylistOutput } from "../lib/outfit/ai-output-validator";
import { ProductResolutionError, resolveSelectedOutfits } from "../lib/outfit/product-resolver";
import type { AIOutfitSelection } from "../lib/outfit/types";
import { RecommendationError, recommendOutfits } from "../lib/outfit/recommendation-service";
import { recommendOutfitInputSchema } from "../lib/outfit/recommendation-input";
import { POST as outfitRecommendPost } from "../app/api/outfits/recommend/route";
import { fitImageIntoSlot } from "../lib/canvas/fit-image-into-slot";
import { outfitLayoutConfigs } from "../lib/canvas/outfit-layouts";
import { buildOutfitCartLines, OutfitCartSelectionError } from "../lib/outfit/cart-selection";

const customer = { customerName: "Khách kiểm thử", phone: "0901234567", address: "123 Đường Kiểm Thử, Phường 1", city: "Hồ Chí Minh", paymentMethod: "COD" };
function client() {
  let cookie = "";
  return async (method: string, path: string, data?: unknown, headers: Record<string, string> = {}) => {
    const personal = /^personal-wardrobe(?:\/|\?|$)/.test(path);
    const url = personal ? "http://localhost:3000/api/wardrobe" + path.slice("personal-wardrobe".length) : "http://localhost:3000/api/v1/" + path;
    const req = new NextRequest(url, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
    const cleanPath = path.split("?")[0];
    const authPath = cleanPath.startsWith("auth/") ? cleanPath.slice(5).split("/") : null;
    const handler = personal ? { GET: wardrobeGet, POST: wardrobePost, DELETE: wardrobeDelete }[method as "GET"] : authPath ? { GET: authGet, POST: authPost }[method as "GET"] : { GET, POST, PATCH, DELETE }[method as "GET"];
    if (!handler) throw new Error("Unsupported test method: " + method);
    const res = await handler(req, { params: { path: personal ? cleanPath.split("/").slice(1) : authPath || cleanPath.split("/") } });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: res.status, data: await res.json(), headers: res.headers };
  };
}
const admin = { Authorization: "Bearer " + process.env.ADMIN_API_KEY };
after(() => db.$disconnect());

test("outfit category normalization maps catalog categories without changing stored values", () => {
  assert.equal(normalizeProductCategory("TOP"), "top");
  assert.equal(normalizeProductCategory("SKIRT"), "bottom");
  assert.equal(normalizeProductCategory("FOOTWEAR"), "shoes");
  assert.equal(normalizeProductCategory("ONE_PIECE", "jumpsuit"), "jumpsuit");
  assert.equal(normalizeProductCategory("unknown"), null);
  assert.equal(categoryMatchesSlot("OUTERWEAR", "outerwear"), true);
  assert.equal(categoryMatchesSlot("TOP", "shoes"), false);
});

test("candidate filter removes unavailable, excluded and explicit metadata mismatches while preserving category diversity", () => {
  const input: AIStylistInput = { request: "cafe minimal trắng", numberOfOutfits: 3, context: { occasion: "cafe", season: "summer", weather: null, temperature: null, budget: 500000 }, preferredProductIds: ["shoe"], excludedProductIds: ["excluded"] };
  const products = [
    ...Array.from({ length: 24 }, (_, index) => candidate(`top-${index}`, "TOP")),
    candidate("bottom", "BOTTOM"), candidate("shoe", "FOOTWEAR"), candidate("dress", "DRESS"),
    candidate("sold-out", "TOP", { variants: [{ color: "Đen", colorHex: "#000000", stock: 0 }] }),
    candidate("inactive", "TOP", { active: false }), candidate("excluded", "TOP"), candidate("combo", "OUTERWEAR", { isCombo: true }),
    candidate("expensive", "ACCESSORY", { price: 600000 }), candidate("winter-only", "TOP", { season: ["winter"] }),
    candidate("party-only", "TOP", { occasion: ["party"] }), candidate("unknown-category", "UNKNOWN")
  ];
  const result = filterAndRankCandidates(products, input, 20);
  const ids = new Set(result.candidates.map(item => item.id));
  assert.equal(result.candidates.length, 20);
  assert.equal(result.limit, 20);
  assert.ok(["top", "bottom", "dress", "shoes"].every(slot => result.candidates.some(item => item.category === slot)));
  assert.ok(ids.has("shoe"));
  for (const id of ["sold-out", "inactive", "excluded", "combo", "expensive", "winter-only", "party-only", "unknown-category"]) assert.equal(ids.has(id), false);
});

test("candidate filter keeps products with missing optional metadata and clamps context to fifty items", () => {
  const input: AIStylistInput = { request: "đi làm", numberOfOutfits: 1, context: { occasion: "work", season: "autumn", weather: null, temperature: null, budget: null } };
  const products = Array.from({ length: 70 }, (_, index) => candidate(`item-${index}`, index % 2 ? "TOP" : "BOTTOM", { season: [], occasion: [] }));
  const result = filterAndRankCandidates(products, input, 999);
  assert.equal(result.limit, 50);
  assert.equal(result.candidates.length, 50);
  assert.equal(result.eligibleCount, 70);
});

function providerRequest(): AIProviderRequest {
  const input: AIStylistInput = { request: "cafe minimal", numberOfOutfits: 2, context: { occasion: "cafe", season: null, weather: null, temperature: null, budget: 1500000 } };
  const source = [candidate("top", "TOP"), candidate("top-2", "TOP"), candidate("bottom", "BOTTOM"), candidate("shoe", "FOOTWEAR"), candidate("bag", "ACCESSORY")];
  return { input, candidates: filterAndRankCandidates(source, input).candidates, instructions: "Select only supplied IDs.", schemaName: "test_outfits", responseSchema: { type: "object", additionalProperties: false, properties: { status: { type: "string" } }, required: ["status"] } };
}

test("mock AI provider creates complete deterministic outfits using only candidate IDs", async () => {
  const request = providerRequest(), result = await new MockAIProvider().generate(request);
  const data = result.data as { outfits: { items: Record<string, string | string[] | null> }[] };
  assert.equal(result.provider, "mock");
  assert.equal(data.outfits.length, 2);
  const allowed = new Set(request.candidates.map(item => item.id));
  for (const outfit of data.outfits) {
    assert.ok(outfit.items.top_id && outfit.items.bottom_id && outfit.items.shoes_id);
    const ids = Object.values(outfit.items).flatMap(value => Array.isArray(value) ? value : value ? [value] : []);
    assert.ok(ids.every(id => allowed.has(id)));
  }
  assert.deepEqual(await new MockAIProvider().generate(request), result);
});

test("OpenAI provider sends metadata-only structured output requests and parses provider JSON", async () => {
  const expected = { status: "success", outfits: [] };
  let capturedUrl = "", captured: Record<string, unknown> = {}, authorization = "";
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url); captured = JSON.parse(String(init?.body)); authorization = new Headers(init?.headers).get("authorization") || "";
    return new Response(JSON.stringify({ id: "resp_test", status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(expected) }] }] }), { status: 200 });
  }) as typeof fetch;
  const result = await new OpenAIProvider({ apiKey: "server-test-key", model: "test-model", fetch: fakeFetch }).generate(providerRequest());
  assert.equal(capturedUrl, "https://api.openai.com/v1/responses");
  assert.equal(authorization, "Bearer server-test-key");
  assert.equal(captured.store, false);
  assert.equal((captured.text as { format: { type: string; strict: boolean } }).format.type, "json_schema");
  assert.equal((captured.text as { format: { strict: boolean } }).format.strict, true);
  assert.equal(JSON.stringify(captured).includes("server-test-key"), false);
  assert.equal(/image_url|base64|https:\/\//.test(JSON.stringify((captured.input as { content: { text: string }[] }[])[0].content[0].text)), false);
  assert.deepEqual(result.data, expected);
  assert.equal(result.requestId, "resp_test");
});

test("OpenAI provider maps timeouts, connection failures and malformed responses to controlled errors", async () => {
  const timeoutFetch = (async () => { throw new DOMException("Timed out", "TimeoutError"); }) as typeof fetch;
  await assert.rejects(() => new OpenAIProvider({ apiKey: "test", fetch: timeoutFetch }).generate(providerRequest()), (error: unknown) => error instanceof AIProviderError && error.code === "TIMEOUT");
  const connectionFetch = (async () => { throw new TypeError("Network unavailable"); }) as typeof fetch;
  await assert.rejects(() => new OpenAIProvider({ apiKey: "test", fetch: connectionFetch }).generate(providerRequest()), (error: unknown) => error instanceof AIProviderError && error.code === "CONNECTION");
  const malformedFetch = (async () => new Response("not-json", { status: 200 })) as typeof fetch;
  await assert.rejects(() => new OpenAIProvider({ apiKey: "test", fetch: malformedFetch }).generate(providerRequest()), (error: unknown) => error instanceof AIProviderError && error.code === "INVALID_RESPONSE");
});

test("AI provider factory supports explicit mock mode and rejects unknown providers", () => {
  assert.equal(createAIProvider({ AI_PROVIDER: "openai", AI_STYLIST_MOCK: "true" }).name, "mock");
  assert.equal(createAIProvider({ AI_PROVIDER: "openai", OPENAI_API_KEY: "test", OPENAI_STYLIST_MODEL: "model" }).name, "openai");
  assert.throws(() => createAIProvider({ AI_PROVIDER: "unknown" }), (error: unknown) => error instanceof AIProviderError && error.code === "NOT_CONFIGURED");
});

test("AI stylist Zod schema accepts complete separates and one-piece outfits but rejects incomplete or duplicate slots", () => {
  const base = { outfit_id: "outfit_01", outfit_name: "Cuối tuần tối giản", layout: "minimal_flatlay_01", stylist_advice: "Bảng màu nhẹ và phom thoải mái phù hợp đi cà phê.", confidence: 0.9 } as const;
  const separates = { status: "success", outfits: [{ ...base, items: { top_id: "top", bottom_id: "bottom", dress_id: null, jumpsuit_id: null, outerwear_id: null, shoes_id: "shoe", accessory_ids: [] } }] };
  assert.equal(aiStylistOutputSchema.safeParse(separates).success, true);
  const dress = { status: "success", outfits: [{ ...base, outfit_id: "dress_01", layout: "dress_flatlay_01", items: { top_id: null, bottom_id: null, dress_id: "dress", jumpsuit_id: null, outerwear_id: "coat", shoes_id: "shoe", accessory_ids: ["bag"] } }] };
  assert.equal(aiStylistOutputSchema.safeParse(dress).success, true);
  assert.equal(aiStylistOutputSchema.safeParse({ status: "success", outfits: [{ ...base, items: { ...separates.outfits[0].items, bottom_id: null } }] }).success, false);
  assert.equal(aiStylistOutputSchema.safeParse({ status: "success", outfits: [{ ...base, items: { ...separates.outfits[0].items, shoes_id: "top" } }] }).success, false);
  assert.equal(aiStylistOutputSchema.safeParse({ ...separates, extra: true }).success, false);
});

test("dynamic AI JSON Schema restricts every product slot to real candidate IDs", () => {
  type JsonSlot = { enum?: string[]; anyOf?: JsonSlot[]; items?: JsonSlot };
  type StylistJsonSchema = { properties: { outfits: { maxItems: number; items: { properties: { items: { properties: Record<string, JsonSlot> } } } } } };
  const schema = buildOutfitStylistJsonSchema(["top", "bottom", "shoe", "top"], 2) as StylistJsonSchema;
  assert.equal(schema.properties.outfits.maxItems, 2);
  const slots = schema.properties.outfits.items.properties.items.properties;
  assert.deepEqual(slots.shoes_id.enum, ["top", "bottom", "shoe"]);
  assert.deepEqual(slots.top_id.anyOf?.[0].enum, ["top", "bottom", "shoe"]);
  assert.deepEqual(slots.accessory_ids.items?.enum, ["top", "bottom", "shoe"]);
  assert.throws(() => buildOutfitStylistJsonSchema([]));
});

test("AI stylist system prompt treats user and catalog content as untrusted and forbids invented facts", () => {
  assert.match(OUTFIT_STYLIST_SYSTEM_PROMPT, /untrusted/i);
  assert.match(OUTFIT_STYLIST_SYSTEM_PROMPT, /exact product IDs/i);
  assert.match(OUTFIT_STYLIST_SYSTEM_PROMPT, /Never invent product names, prices, stock/i);
  assert.match(OUTFIT_STYLIST_SYSTEM_PROMPT, /chain-of-thought/i);
  assert.match(OUTFIT_STYLIST_SYSTEM_PROMPT, /top, one bottom, and one pair of shoes/i);
});

function validatorFixture() {
  const input: AIStylistInput = { request: "minimal", numberOfOutfits: 3, context: { occasion: null, season: null, weather: null, temperature: null, budget: null } };
  return filterAndRankCandidates([candidate("top", "TOP"), candidate("bottom", "BOTTOM"), candidate("shoe", "FOOTWEAR"), candidate("dress", "DRESS"), candidate("coat", "OUTERWEAR"), candidate("bag", "ACCESSORY")], input).candidates;
}

function rawOutfit(overrides: Record<string, unknown> = {}) {
  return { status: "success", outfits: [{ outfit_id: "outfit_01", outfit_name: "Bộ phối tối giản", layout: "minimal_flatlay_01", items: { top_id: "top", bottom_id: "bottom", dress_id: null, jumpsuit_id: null, outerwear_id: "coat", shoes_id: "shoe", accessory_ids: ["bag"] }, stylist_advice: "Phối màu trung tính cho một tổng thể dễ mặc.", confidence: 0.9, ...overrides }] };
}

test("AI output validator accepts real IDs, correct categories and normalizes application field names", () => {
  const result = validateAIStylistOutput(rawOutfit(), validatorFixture(), 1);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].items, { topId: "top", bottomId: "bottom", dressId: null, jumpsuitId: null, outerwearId: "coat", shoesId: "shoe", accessoryIds: ["bag"] });
  assert.equal(result[0].outfitName, "Bộ phối tối giản");
  assert.equal(result[0].confidence, 0.9);
});

test("AI output validator rejects fake IDs and category mismatches", () => {
  const candidates = validatorFixture();
  assert.throws(() => validateAIStylistOutput(rawOutfit({ items: { top_id: "fake", bottom_id: "bottom", dress_id: null, jumpsuit_id: null, outerwear_id: null, shoes_id: "shoe", accessory_ids: [] } }), candidates, 1), (error: unknown) => error instanceof AIOutputValidationError && error.code === "UNKNOWN_PRODUCT");
  assert.throws(() => validateAIStylistOutput(rawOutfit({ items: { top_id: "shoe", bottom_id: "bottom", dress_id: null, jumpsuit_id: null, outerwear_id: null, shoes_id: "top", accessory_ids: [] } }), candidates, 1), (error: unknown) => error instanceof AIOutputValidationError && error.code === "CATEGORY_MISMATCH");
});

test("AI output validator accepts dress outfits and an empty accessory array", () => {
  const output = rawOutfit({ layout: "dress_flatlay_01", items: { top_id: null, bottom_id: null, dress_id: "dress", jumpsuit_id: null, outerwear_id: "coat", shoes_id: "shoe", accessory_ids: [] } });
  const result = validateAIStylistOutput(output, validatorFixture(), 1);
  assert.equal(result[0].items.dressId, "dress");
  assert.deepEqual(result[0].items.accessoryIds, []);
});

test("AI output validator enforces requested count, unique candidates and distinct outfits", () => {
  const first = rawOutfit().outfits[0];
  assert.throws(() => validateAIStylistOutput({ status: "success", outfits: [first, { ...first, outfit_id: "outfit_02" }] }, validatorFixture(), 2), (error: unknown) => error instanceof AIOutputValidationError && error.code === "DUPLICATE_OUTFIT");
  assert.throws(() => validateAIStylistOutput({ status: "success", outfits: [first, { ...first, outfit_id: "outfit_02", items: { ...first.items, accessory_ids: [] } }] }, validatorFixture(), 1), (error: unknown) => error instanceof AIOutputValidationError && error.code === "OUTFIT_COUNT");
  const duplicateCandidates = [...validatorFixture(), validatorFixture()[0]];
  assert.throws(() => validateAIStylistOutput(rawOutfit(), duplicateCandidates, 1), (error: unknown) => error instanceof AIOutputValidationError && error.code === "INVALID_CANDIDATES");
  assert.throws(() => validateAIStylistOutput(rawOutfit(), validatorFixture(), 1, { budget: 100000 }), (error: unknown) => error instanceof AIOutputValidationError && error.code === "BUDGET_EXCEEDED");
});

test("recommendation input sanitizes defaults and rejects conflicting or oversized requests", () => {
  const parsed = recommendOutfitInputSchema.parse({ request: "  Đi cà phê tối giản  " });
  assert.equal(parsed.request, "Đi cà phê tối giản");
  assert.equal(parsed.numberOfOutfits, 3);
  assert.deepEqual(parsed.context, { occasion: null, season: null, weather: null, temperature: null, budget: null });
  assert.equal(recommendOutfitInputSchema.safeParse({ request: "x" }).success, false);
  assert.equal(recommendOutfitInputSchema.safeParse({ request: "a".repeat(1001) }).success, false);
  assert.equal(recommendOutfitInputSchema.safeParse({ request: "Đi làm", preferredProductIds: ["top-1"], excludedProductIds: ["top-1"] }).success, false);
});

test("recommendation service retries invalid AI output exactly once then resolves current catalog products", async () => {
  let calls = 0;
  const mock = new MockAIProvider();
  const provider: import("../lib/ai/provider").AIProvider = { name: "retry-test", async generate(request) {
    calls++;
    if (calls === 1) return { provider: "retry-test", model: "test", data: rawOutfit({ items: { top_id: "fake", bottom_id: "bottom-1", dress_id: null, jumpsuit_id: null, outerwear_id: null, shoes_id: "shoe-1", accessory_ids: [] } }) };
    const result = await mock.generate({ ...request, input: { ...request.input, numberOfOutfits: 1 } });
    return { ...result, provider: "retry-test" };
  } };
  const result = await recommendOutfits(recommendOutfitInputSchema.parse({ request: "Đi cà phê minimal", numberOfOutfits: 1 }), { provider });
  assert.equal(calls, 2);
  assert.equal(result.meta.attempts, 2);
  assert.equal(result.outfits.length, 1);
  assert.ok(result.outfits[0].totalPrice > 0);
  assert.equal(result.engine.provider, "retry-test");
});

test("POST /api/outfits/recommend validates input and returns resolved outfits in mock mode", async () => {
  const previousMock = process.env.AI_STYLIST_MOCK;
  process.env.AI_STYLIST_MOCK = "true";
  try {
    const invalid = await outfitRecommendPost(new NextRequest("http://localhost:3000/api/outfits/recommend", { method: "POST", body: JSON.stringify({ request: "" }) }));
    assert.equal(invalid.status, 400);
    const response = await outfitRecommendPost(new NextRequest("http://localhost:3000/api/outfits/recommend", { method: "POST", headers: { Origin: "http://localhost:3000", "x-forwarded-for": "api-test" }, body: JSON.stringify({ request: "Đi cà phê cuối tuần minimal", numberOfOutfits: 2 }) }));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.status, "success");
    assert.equal(data.engine.provider, "mock");
    assert.equal(data.outfits.length, 2);
    assert.ok(data.outfits.every((outfit: { totalPrice: number; items: { shoes: { id: string } } }) => outfit.totalPrice > 0 && outfit.items.shoes.id));
    assert.equal(data.requestSummary.occasion, "cafe");
  } finally { if (previousMock === undefined) delete process.env.AI_STYLIST_MOCK; else process.env.AI_STYLIST_MOCK = previousMock; }
});

test("mock recommendation is deterministic end-to-end and every resolved value comes from the current catalog", async () => {
  const input = recommendOutfitInputSchema.parse({ request: "Đi làm phong cách minimal", numberOfOutfits: 3 });
  const first = await recommendOutfits(input, { provider: new MockAIProvider() });
  const second = await recommendOutfits(input, { provider: new MockAIProvider() });
  assert.deepEqual(second, first);
  assert.equal(first.outfits.length, 3);
  for (const outfit of first.outfits) {
    const products = [outfit.items.top, outfit.items.bottom, outfit.items.dress, outfit.items.jumpsuit, outfit.items.outerwear, outfit.items.shoes, ...outfit.items.accessories].filter(Boolean) as { id: string; price: number; variants: { stock: number }[] }[];
    assert.equal(outfit.totalPrice, products.reduce((sum, product) => sum + product.price, 0));
    assert.ok(products.every(product => product.variants.length && product.variants.every(variant => variant.stock > 0)));
    assert.equal(new Set(products.map(product => product.id)).size, products.length);
  }
});

test("recommendation fails before provider calls when catalog has no products or lacks a complete affordable core", async () => {
  let providerCalls = 0;
  const provider: import("../lib/ai/provider").AIProvider = { name: "must-not-run", async generate() { providerCalls++; throw new Error("Provider should not run"); } };
  const input = recommendOutfitInputSchema.parse({ request: "Đi chơi", numberOfOutfits: 1 });
  const emptyFinder = async () => ({ candidates: [], eligibleCount: 0, scannedCount: 0, limit: 40 });
  await assert.rejects(() => recommendOutfits(input, { provider, findCandidates: emptyFinder }), (error: unknown) => error instanceof RecommendationError && error.code === "NO_PRODUCTS" && error.status === 422);
  const incompleteFinder = async () => ({ candidates: validatorFixture().filter(item => item.category !== "shoes"), eligibleCount: 5, scannedCount: 5, limit: 40 });
  await assert.rejects(() => recommendOutfits(input, { provider, findCandidates: incompleteFinder }), (error: unknown) => error instanceof RecommendationError && error.code === "INSUFFICIENT_PRODUCTS");
  const lowBudget = recommendOutfitInputSchema.parse({ request: "Đi chơi", numberOfOutfits: 1, context: { budget: 1000000 } });
  await assert.rejects(() => recommendOutfits(lowBudget, { provider }), (error: unknown) => error instanceof RecommendationError && error.code === "INSUFFICIENT_PRODUCTS");
  assert.equal(providerCalls, 0);
});

test("recommendation retries a provider that always returns fake IDs only once", async () => {
  let calls = 0;
  const provider: import("../lib/ai/provider").AIProvider = { name: "always-invalid", async generate() { calls++; return { provider: "always-invalid", model: "test", data: rawOutfit({ items: { top_id: "fake", bottom_id: "bottom-1", dress_id: null, jumpsuit_id: null, outerwear_id: null, shoes_id: "shoe-1", accessory_ids: [] } }) }; } };
  const input = recommendOutfitInputSchema.parse({ request: "Đi cà phê", numberOfOutfits: 1 });
  await assert.rejects(() => recommendOutfits(input, { provider }), (error: unknown) => error instanceof RecommendationError && error.code === "INVALID_AI_OUTPUT" && error.status === 502);
  assert.equal(calls, 2);
});

test("recommendation API maps insufficient budget and cross-origin requests to controlled HTTP errors", async () => {
  const budget = await outfitRecommendPost(new NextRequest("http://localhost:3000/api/outfits/recommend", { method: "POST", headers: { "x-forwarded-for": "budget-api-test" }, body: JSON.stringify({ request: "Đi chơi", numberOfOutfits: 1, context: { budget: 1000000 } }) }));
  assert.equal(budget.status, 422);
  assert.equal((await budget.json()).error.code, "INSUFFICIENT_PRODUCTS");
  const crossOrigin = await outfitRecommendPost(new NextRequest("http://localhost:3000/api/outfits/recommend", { method: "POST", headers: { Origin: "https://evil.example", "x-forwarded-for": "origin-api-test" }, body: JSON.stringify({ request: "Đi chơi" }) }));
  assert.equal(crossOrigin.status, 403);
  assert.equal((await crossOrigin.json()).error.code, "INVALID_ORIGIN");
});

test("canvas image fitting preserves aspect ratio and centers content inside relative slots", () => {
  const slot = { x: .1, y: .2, maxWidth: .5, maxHeight: .4, rotation: -3, zIndex: 1, anchor: "top-left" as const };
  const landscape = fitImageIntoSlot({ width: 400, height: 200 }, { width: 1000, height: 800 }, slot);
  assert.equal(landscape.width, 500); assert.equal(landscape.height, 250); assert.equal(landscape.x, 100); assert.equal(landscape.y, 195); assert.equal(landscape.width / landscape.height, 2);
  const portrait = fitImageIntoSlot({ width: 200, height: 400 }, { width: 1000, height: 800 }, slot);
  assert.equal(portrait.width, 160); assert.equal(portrait.height, 320); assert.equal(portrait.x, 270); assert.equal(portrait.y, 160); assert.equal(portrait.width / portrait.height, .5);
  const centered = fitImageIntoSlot({ width: 100, height: 100 }, { width: 1000, height: 800 }, { ...slot, x: .5, y: .5, anchor: "center" });
  assert.equal(centered.centerX, 500); assert.equal(centered.centerY, 400); assert.equal(centered.rotation, -3);
  assert.throws(() => fitImageIntoSlot({ width: 0, height: 10 }, { width: 100, height: 100 }, slot));
});

test("every canvas layout defines normalized slots, deterministic z-index and accessory capacity", () => {
  for (const layout of Object.values(outfitLayoutConfigs)) {
    assert.deepEqual(Object.keys(layout).sort(), ["accessory", "bottom", "dress", "jumpsuit", "outerwear", "shoes", "top"]);
    assert.ok(layout.accessory.length >= 2);
    for (const slots of Object.values(layout)) for (const slot of slots) {
      assert.ok(slot.x >= 0 && slot.x <= 1 && slot.y >= 0 && slot.y <= 1);
      assert.ok(slot.maxWidth > 0 && slot.maxWidth <= 1 && slot.maxHeight > 0 && slot.maxHeight <= 1);
      assert.ok(Number.isFinite(slot.rotation) && Number.isInteger(slot.zIndex));
    }
  }
});

function cartProduct(id: string, variants: ResolvedProduct["variants"]): ResolvedProduct {
  return { id, slug: id, name: `Sản phẩm ${id}`, brand: "Test", category: id.includes("shoe") ? "shoes" : "top", sourceCategory: id.includes("shoe") ? "FOOTWEAR" : "TOP", subcategory: null, price: 200000, imageUrl: "https://example.com/item.jpg", transparentImageUrl: null, renderImageUrl: "https://example.com/item.jpg", styles: [], tags: [], colors: [], variants };
}

test("outfit cart selection never guesses variants and only builds valid in-stock batch lines", () => {
  const top = cartProduct("cart-top", [{ id: "top-M", size: "M", color: "Trắng", colorHex: "#FFFFFF", stock: 2 }, { id: "top-L", size: "L", color: "Đen", colorHex: "#000000", stock: 0 }]);
  const shoes = cartProduct("cart-shoe", [{ id: "shoe-40", size: "40", color: "Đen", colorHex: "#000000", stock: 1 }]);
  assert.throws(() => buildOutfitCartLines([top, shoes], {}), (error: unknown) => error instanceof OutfitCartSelectionError && error.code === "MISSING_VARIANT" && error.productId === top.id);
  assert.throws(() => buildOutfitCartLines([top], { [top.id]: "shoe-40" }), (error: unknown) => error instanceof OutfitCartSelectionError && error.code === "INVALID_VARIANT");
  assert.throws(() => buildOutfitCartLines([top], { [top.id]: "top-L" }), (error: unknown) => error instanceof OutfitCartSelectionError && error.code === "OUT_OF_STOCK");
  assert.throws(() => buildOutfitCartLines([top, top], { [top.id]: "top-M" }), (error: unknown) => error instanceof OutfitCartSelectionError && error.code === "INVALID_VARIANT");
  assert.deepEqual(buildOutfitCartLines([top, shoes], { [top.id]: "top-M", [shoes.id]: "shoe-40" }), [{ variantId: "top-M", quantity: 1 }, { variantId: "shoe-40", quantity: 1 }]);
});

test("product resolver batch-resolves trusted DTOs, current prices, render images and in-stock variants", async () => {
  const prefix = "resolver-";
  const fixtures = [
    { id: prefix + "top", category: "TOP", price: 210000, transparentImageUrl: "https://example.com/top-transparent.png" },
    { id: prefix + "bottom", category: "BOTTOM", price: 320000, transparentImageUrl: null },
    { id: prefix + "shoe", category: "FOOTWEAR", price: 430000, transparentImageUrl: null }
  ];
  try {
    for (const item of fixtures) await db.product.create({ data: { ...item, slug: item.id, name: item.id, brand: "Resolver Test", description: "", material: "", care: "", style: "minimal", image: `https://example.com/${item.id}.jpg`, variants: { create: [{ sku: item.id + "-M", size: "M", color: "Trắng", colorHex: "#FFFFFF", stock: 2 }, { sku: item.id + "-L", size: "L", color: "Đen", colorHex: "#000000", stock: 0 }] } } });
    const selection: AIOutfitSelection = { outfitId: "resolver-outfit", outfitName: "Resolver outfit", layout: "minimal_flatlay_01", items: { topId: prefix + "top", bottomId: prefix + "bottom", dressId: null, jumpsuitId: null, outerwearId: null, shoesId: prefix + "shoe", accessoryIds: [] }, stylistAdvice: "Kiểm thử resolver.", confidence: .9 };
    const [resolved] = await resolveSelectedOutfits([selection]);
    assert.equal(resolved.totalPrice, 960000);
    assert.equal(resolved.items.top?.renderImageUrl, "https://example.com/top-transparent.png");
    assert.equal(resolved.items.bottom?.renderImageUrl, `https://example.com/${prefix}bottom.jpg`);
    assert.equal(resolved.items.shoes.category, "shoes");
    assert.equal(resolved.items.top?.variants.length, 1);
    assert.equal(resolved.items.top?.variants[0].stock, 2);
  } finally { await db.product.deleteMany({ where: { id: { startsWith: prefix } } }); }
});

test("product resolver rejects products that disappear, sell out or change category after AI selection", async () => {
  const base: AIOutfitSelection = { outfitId: "stale-outfit", outfitName: "Stale outfit", layout: "minimal_flatlay_01", items: { topId: "top-1", bottomId: "bottom-1", dressId: null, jumpsuitId: null, outerwearId: null, shoesId: "shoe-1", accessoryIds: [] }, stylistAdvice: "Kiểm thử thay đổi đồng thời.", confidence: .8 };
  const original = await db.product.findUniqueOrThrow({ where: { id: "top-1" }, include: { variants: true } });
  try {
    await db.product.update({ where: { id: "top-1" }, data: { active: false } });
    await assert.rejects(() => resolveSelectedOutfits([base]), (error: unknown) => error instanceof ProductResolutionError && error.code === "PRODUCT_UNAVAILABLE");
    await db.product.update({ where: { id: "top-1" }, data: { active: true, category: "FOOTWEAR" } });
    await assert.rejects(() => resolveSelectedOutfits([base]), (error: unknown) => error instanceof ProductResolutionError && error.code === "CATEGORY_CHANGED");
    await db.product.update({ where: { id: "top-1" }, data: { category: original.category } });
    await db.productVariant.updateMany({ where: { productId: "top-1" }, data: { stock: 0 } });
    await assert.rejects(() => resolveSelectedOutfits([base]), (error: unknown) => error instanceof ProductResolutionError && error.code === "PRODUCT_UNAVAILABLE");
    await assert.rejects(() => resolveSelectedOutfits([{ ...base, items: { ...base.items, topId: "missing-product" } }]), (error: unknown) => error instanceof ProductResolutionError && error.code === "MISSING_PRODUCT");
  } finally {
    await db.product.update({ where: { id: "top-1" }, data: { active: original.active, category: original.category } });
    for (const variant of original.variants) await db.productVariant.update({ where: { id: variant.id }, data: { stock: variant.stock } });
  }
});

async function studioUpload(name: string, itemCategory = "TOP", sizes = "S,M", stock = 3, override?: { bytes?: Uint8Array; mime?: string; headers?: Record<string, string> }) {
  const bytes = override?.bytes || new Uint8Array(await sharp({ create: { width: 120, height: 160, channels: 3, background: "#739782" } }).png().toBuffer());
  const form = new FormData();
  Object.entries({ name, category: itemCategory, sizes, stock: String(stock), price: "200000", color: "Xanh" }).forEach(([key, value]) => form.set(key, value));
  form.set("image", new Blob([new Uint8Array(bytes)], { type: override?.mime || "image/png" }), "garment.png");
  const req = new NextRequest("http://localhost:3000/api/v1/admin/combo-studio/items", { method: "POST", headers: override?.headers || admin, body: form });
  const res = await POST(req, { params: { path: ["admin", "combo-studio", "items"] } });
  return { status: res.status, data: await res.json() };
}

test("studio upload requires admin, validates image bytes, persists sanitized images and keeps garments off catalog", async () => {
  assert.equal((await studioUpload("Unauthorized", "TOP", "M", 1, { headers: {} })).status, 401);
  assert.equal((await studioUpload("Cross origin", "TOP", "M", 1, { headers: { ...admin, Origin: "https://other.example" } })).status, 403);
  assert.equal((await studioUpload("Fake image", "TOP", "M", 1, { bytes: new TextEncoder().encode("<svg onload='alert(1)'/>"), mime: "image/png" })).status, 400);
  assert.equal((await studioUpload("Bad size", "TOP", "invalid size", 1)).status, 400);
  const created = await studioUpload("Studio upload test");
  assert.equal(created.status, 200);
  assert.equal(created.data.item.active, false);
  assert.equal(created.data.item.variants.length, 2);
  assert.equal((await client()("GET", "products/" + created.data.item.id)).status, 404);
  const imageId = created.data.item.image.split("/").pop();
  const response = await studioImageGet(new Request("http://localhost:3000"), { params: { id: imageId } });
  assert.equal(response.headers.get("content-type"), "image/jpeg");
  assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format, "jpeg");
});

test("studio drafts reserve shared-size inventory atomically and publish idempotently into the real catalog", async () => {
  const request = client();
  const top = (await studioUpload("Áo studio", "TOP", "S,M", 3)).data.item;
  const bottom = (await studioUpload("Quần studio", "BOTTOM", "S,M", 3)).data.item;
  const bag = (await studioUpload("Túi studio", "ACCESSORY", "F", 2)).data.item;
  const generation = { itemIds: [top.id, bottom.id, bag.id], brief: "Dạo phố thanh lịch", budget: 1000000, mode: "manual" };
  assert.equal((await request("POST", "admin/combo-studio/generate", generation)).status, 401);
  const result = await request("POST", "admin/combo-studio/generate", generation, admin);
  assert.equal(result.status, 200);
  const draft = result.data.drafts[0];
  assert.equal(draft.price, 600000);
  assert.equal(draft.engine, "manual");
  assert.equal(draft.availability.length, 2);
  assert.equal((await request("PATCH", "admin/combo-studio/drafts/" + draft.id, { name: "Bộ phối studio kiểm thử", description: "Bộ áo, quần và túi.", price: 550000 }, admin)).status, 200);
  const url = "admin/combo-studio/drafts/" + draft.id + "/publish";
  // The F accessory is shared across sizes; requesting 4 sets with 2 bags must roll back every deduction.
  assert.equal((await request("POST", url, { stocks: [{ size: "S", stock: 2 }, { size: "M", stock: 2 }] }, admin)).status, 409);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: top.variants[0].id } })).stock, 3);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: bag.variants[0].id } })).stock, 2);
  const published = await request("POST", url, { stocks: [{ size: "S", stock: 1 }, { size: "M", stock: 1 }] }, admin);
  assert.equal(published.status, 200);
  const product = (await request("GET", "products/" + published.data.productId)).data.product;
  assert.equal(product.price, 550000);
  assert.equal(product.combo.items.length, 3);
  assert.equal(product.variants.length, 2);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: bag.variants[0].id } })).stock, 0);
  assert.equal((await request("POST", url, { stocks: [{ size: "S", stock: 1 }] }, admin)).data.productId, product.id);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: bag.variants[0].id } })).stock, 0);
  assert.equal((await request("PATCH", "admin/combo-studio/drafts/" + draft.id, { name: "Cannot edit", description: "Published combo", price: 100000 }, admin)).status, 409);
  const buyer = client();
  await buyer("POST", "cart/items", { items: [{ variantId: product.variants[0].id, quantity: 1 }] });
  const order = await buyer("POST", "orders", customer, { "Idempotency-Key": "studio-checkout-001" });
  assert.equal(order.status, 200);
  assert.equal(order.data.order.items[0].unitPrice, 550000);
  assert.equal((await buyer("POST", "orders/" + order.data.order.id + "/cancel")).status, 200);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: product.variants[0].id } })).stock, 1);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: bag.variants[0].id } })).stock, 0);
});

test("studio rejects invalid combinations and competing publications cannot reserve the same last garment", async () => {
  const request = client();
  const top = (await studioUpload("Last top", "TOP", "M", 1)).data.item;
  const bottom = (await studioUpload("Last bottom", "BOTTOM", "M", 1)).data.item;
  const invalid = (await studioUpload("Wrong size", "BOTTOM", "XL", 1)).data.item;
  const payload = { itemIds: [top.id, bottom.id], brief: "Phối tối giản", budget: 500000, mode: "manual" };
  assert.equal((await request("POST", "admin/combo-studio/generate", { ...payload, itemIds: [top.id, top.id] }, admin)).status, 400);
  assert.equal((await request("POST", "admin/combo-studio/generate", { ...payload, itemIds: [top.id, invalid.id] }, admin)).status, 409);
  assert.equal((await request("POST", "admin/combo-studio/generate", { ...payload, budget: 1000 }, admin)).status, 400);
  const a = (await request("POST", "admin/combo-studio/generate", payload, admin)).data.drafts[0];
  const b = (await request("POST", "admin/combo-studio/generate", payload, admin)).data.drafts[0];
  const results = await Promise.all([a, b].map(d => request("POST", "admin/combo-studio/drafts/" + d.id + "/publish", { stocks: [{ size: "M", stock: 1 }] }, admin)));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: top.variants[0].id } })).stock, 0);
});

test("studio AI sends real images, validates structured proposals, handles missing credentials and rejects unknown IDs", async () => {
  const request = client();
  const top = (await studioUpload("Vision top", "TOP", "M", 3)).data.item;
  const bottom = (await studioUpload("Vision bottom", "BOTTOM", "M", 3)).data.item;
  const input = { itemIds: [top.id, bottom.id], brief: "Thanh lịch khi đi làm", budget: 700000, mode: "ai" as const };
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal((await request("POST", "admin/combo-studio/generate", input, admin)).status, 503);
    process.env.OPENAI_API_KEY = "test-only-key";
    let calls = 0;
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload.store, false);
      assert.equal(payload.input[0].content.filter((c: { type: string }) => c.type === "input_image").length, 2);
      assert.match(payload.input[0].content.find((c: { type: string }) => c.type === "input_image").image_url, /^data:image\/jpeg;base64,/);
      calls++;
      return new Response(JSON.stringify({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ suggestions: [{ name: "Bộ công sở", description: "Áo và quần phối cùng nhau.", rationale: "Sắc xanh đồng điệu cho ngày đi làm.", itemIds: calls === 1 ? input.itemIds : [top.id, "invented-id"] }] }) }] }] }), { headers: { "Content-Type": "application/json" } });
    };
    const result = await generateCombos(input, "vision-test-good");
    assert.equal(result.drafts[0].engine, "openai-vision");
    assert.equal(result.drafts[0].items.length, 2);
    await assert.rejects(() => generateCombos(input, "vision-test-bad"), /ngoài danh sách/);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("catalog supports price, category, size, pagination and rejects invalid filters", async () => {
  const request = client();
  const result = await request("GET", "products?category=TOP&maxPrice=600000&size=M&limit=1");
  assert.equal(result.status, 200); assert.equal(result.data.products.length, 1);
  assert.equal(result.data.products[0].category, "TOP");
  assert.ok(result.data.products[0].price <= 600000); assert.ok(result.data.pagination.total >= 2);
  assert.equal((await request("GET", "products?minPrice=900000&maxPrice=1")).status, 400);
  assert.equal((await request("GET", "products?limit=1000")).status, 400);
});

test("cart is private, persistent and rejects overselling and duplicate quantity overflow", async () => {
  const a = client(), b = client();
  const first = await a("GET", "cart");
  assert.match(first.headers.get("set-cookie") || "", /HttpOnly/i);
  await a("POST", "cart/items", { items: [{ variantId: "top-1-M", quantity: 2 }] });
  assert.equal((await a("GET", "cart")).data.items[0].quantity, 2);
  assert.equal((await b("GET", "cart")).data.items.length, 0);
  assert.equal((await a("POST", "cart/items", { items: [{ variantId: "top-1-M", quantity: 20 }] })).status, 409);
  const id = (await a("GET", "cart")).data.items[0].id;
  assert.equal((await b("DELETE", "cart/items/" + id)).status, 404);
  assert.equal((await a("PATCH", "cart/items/" + id, { quantity: -1 })).status, 400);
  assert.equal((await a("DELETE", "cart/items/" + id)).data.items.length, 0);
});

test("checkout prices on server, is idempotent, and cancellation restocks exactly once", async () => {
  const request = client(), stranger = client();
  const before = await db.productVariant.findUniqueOrThrow({ where: { id: "top-2-M" } });
  await request("GET", "cart");
  await request("POST", "cart/items", { items: [{ variantId: before.id, quantity: 2 }] });
  const header = { "Idempotency-Key": "checkout-test-00001" };
  assert.equal((await request("POST", "orders", { ...customer, total: 1 }, header)).status, 400);
  const response = await request("POST", "orders", customer, header);
  assert.equal(response.status, 200);
  const order = response.data.order;
  assert.equal(order.total, 1040000); assert.equal(order.shippingFee, 0);
  assert.equal(order.sessionId, undefined);
  assert.equal((await request("POST", "orders", customer, header)).data.order.id, order.id);
  assert.equal((await request("POST", "orders", { ...customer, city: "Hà Nội" }, header)).status, 409);
  assert.equal((await stranger("GET", "orders/" + order.id)).status, 404);
  assert.equal((await request("GET", "cart")).data.items.length, 0);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: before.id } })).stock, before.stock - 2);
  assert.equal((await request("POST", "orders/" + order.id + "/cancel")).status, 200);
  assert.equal((await request("POST", "orders/" + order.id + "/cancel")).status, 409);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: before.id } })).stock, before.stock);
});

test("competing checkouts cannot buy the last unit twice", async () => {
  await db.productVariant.update({ where: { id: "out-2-S" }, data: { stock: 1 } });
  const a = client(), b = client();
  await a("GET", "cart"); await b("GET", "cart");
  const lines = { items: [{ variantId: "out-2-S", quantity: 1 }] };
  await a("POST", "cart/items", lines); await b("POST", "cart/items", lines);
  const result = await Promise.all([a("POST", "orders", customer, { "Idempotency-Key": "race-checkout-0001" }), b("POST", "orders", customer, { "Idempotency-Key": "race-checkout-0002" })]);
  assert.deepEqual(result.map(r => r.status).sort(), [200, 409]);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: "out-2-S" } })).stock, 0);
});

test("checkout rollback preserves other inventory when one SKU becomes unavailable", async () => {
  const request = client(); await request("GET", "cart");
  const before = await db.productVariant.findUniqueOrThrow({ where: { id: "top-3-L" } });
  await request("POST", "cart/items", { items: [{ variantId: "top-3-L", quantity: 1 }, { variantId: "bottom-3-L", quantity: 1 }] });
  await db.productVariant.update({ where: { id: "bottom-3-L" }, data: { stock: 0 } });
  const result = await request("POST", "orders", customer, { "Idempotency-Key": "rollback-checkout-01" });
  assert.equal(result.status, 409);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: before.id } })).stock, before.stock);
  assert.equal((await request("GET", "cart")).data.items.length, 2);
});

test("order transitions and returns enforce ownership, quantities and delivery window", async () => {
  const request = client(), stranger = client(); await request("GET", "cart");
  await request("POST", "cart/items", { items: [{ variantId: "acc-1-F", quantity: 2 }] });
  const order = (await request("POST", "orders", customer, { "Idempotency-Key": "return-checkout-001" })).data.order;
  const input = { orderItemId: order.items[0].id, quantity: 1, reason: "Kích thước không phù hợp." };
  assert.equal((await request("POST", "orders/" + order.id + "/returns", input)).status, 409);
  assert.equal((await request("PATCH", "admin/orders/" + order.id, { status: "DELIVERED" }, admin)).status, 409);
  assert.equal((await request("PATCH", "admin/orders/" + order.id, { status: "CONFIRMED" }, admin)).status, 200);
  assert.equal((await request("PATCH", "admin/orders/" + order.id, { status: "SHIPPED" }, admin)).status, 400);
  await request("PATCH", "admin/orders/" + order.id, { status: "SHIPPED", trackingNumber: "TEST-001", carrier: "Manual" }, admin);
  await request("PATCH", "admin/orders/" + order.id, { status: "DELIVERED" }, admin);
  assert.equal((await stranger("POST", "orders/" + order.id + "/returns", input)).status, 404);
  const returned = await request("POST", "orders/" + order.id + "/returns", { ...input, quantity: 2 });
  assert.equal(returned.status, 200);
  assert.equal((await request("POST", "orders/" + order.id + "/returns", input)).status, 400);
  const path = "admin/returns/" + returned.data.request.id;
  assert.equal((await request("PATCH", path, { status: "RECEIVED" }, admin)).status, 409);
  await request("PATCH", path, { status: "APPROVED" }, admin);
  assert.equal((await request("PATCH", path, { status: "RECEIVED" }, admin)).status, 200);
  assert.equal((await request("PATCH", path, { status: "RECEIVED" }, admin)).status, 409);
  await db.order.update({ where: { id: order.id }, data: { deliveredAt: new Date(Date.now() - 15 * 86400000) } });
  assert.equal((await request("POST", "orders/" + order.id + "/returns", input)).status, 409);
});

test("admin and cross-origin requests are protected", async () => {
  const request = client();
  assert.equal((await request("GET", "admin/orders")).status, 401);
  assert.equal((await request("GET", "admin/orders", undefined, { Authorization: "Bearer wrong" })).status, 401);
  assert.equal((await request("GET", "admin/orders", undefined, admin)).status, 200);
  assert.equal((await request("POST", "cart/items", { items: [] }, { Origin: "https://evil.example" })).status, 403);
  assert.equal((await request("POST", "cart/items", { items: [] }, { "Sec-Fetch-Site": "cross-site" })).status, 403);
  const req = new NextRequest("http://localhost:3000/api/v1/cart/items", { method: "POST", body: "{" });
  assert.equal((await POST(req, { params: { path: ["cart", "items"] } })).status, 400);
  const huge = new NextRequest("http://localhost:3000/api/v1/cart/items", { method: "POST", body: "x".repeat(66000) });
  assert.equal((await POST(huge, { params: { path: ["cart", "items"] } })).status, 413);
});

test("stylist uses in-stock catalog within budget and reports no affordable outfit", async () => {
  const call = async (payload: unknown) => (await stylist(new NextRequest("http://localhost:3000/api/v1/stylist/chat", { method: "POST", body: JSON.stringify(payload) }))).json();
  const result = await call({ message: "Đi làm dưới 1.5tr", size: "M" });
  assert.equal(result.engine, "catalog-rules"); assert.ok(result.total <= 1500000); assert.ok(result.outfit.length >= 2);
  for (const p of result.outfit) assert.ok(p.variants.some((v: { stock: number; size: string }) => v.stock > 0 && ["M", "F"].includes(v.size)));
  assert.equal((await call({ message: "đi làm", budget: 1000 })).outfit.length, 0);
});

test("size advice uses product-specific measurements and does not guess unsupported data", async () => {
  const request = client();
  const result = await request("POST", "size-advice", { productId: "top-1", chest: 90 });
  assert.equal(result.data.matches[0].size, "M");
  assert.equal((await request("POST", "size-advice", { productId: "shoe-1", chest: 90 })).data.matches.length, 0);
  assert.equal((await request("POST", "size-advice", { productId: "top-1" })).status, 400);
});

test("digital wardrobe validates input, normalizes colors, filters tags and protects ownership", async () => {
  const owner = client(), stranger = client();
  await owner("GET", "cart"); await stranger("GET", "cart");
  const input = { name: "  Áo sơ mi trắng  ", category: "TOP", color: "Trắng", imageUrl: "https://example.com/shirt.jpg", season: ["SUMMER", "SUMMER"], style: ["MINIMAL"], occasion: ["WORK"] };
  const created = await owner("POST", "items", input);
  assert.equal(created.status, 201);
  const item = created.data.item;
  assert.equal(item.name, "Áo sơ mi trắng");
  assert.equal(item.color, "#ffffff");
  assert.deepEqual(item.season, ["SUMMER"]);
  assert.equal(item.sessionId, undefined);
  assert.ok(item.updatedAt);
  const dress = await owner("POST", "wardrobe/items", { ...input, name: "Váy dự tiệc", category: "DRESS", color: "#F00", occasion: ["PARTY"] });
  assert.equal(dress.status, 201);
  assert.equal(dress.data.item.color, "#ff0000");
  assert.equal((await owner("GET", "items?q=ao%20so%20mi&color=%23FFFFFF&category=TOP&season=SUMMER&style=MINIMAL&occasion=WORK")).data.total, 1);
  assert.equal((await owner("GET", "items?occasion=PARTY&category=TOP")).data.total, 0);
  assert.equal((await owner("GET", "wardrobe")).data.items.length, 2);
  for (const invalid of [{ name: " " }, { category: "INVALID" }, { color: "not-a-color" }, { imageUrl: "javascript:alert(1)" }, { imageUrl: "http://example.com/image.jpg" }, { season: ["INVALID"] }, { style: "MINIMAL" }, { occasion: Array(9).fill("WORK") }, { sessionId: "someone-else" }]) {
    assert.equal((await owner("POST", "items", { ...input, ...invalid })).status, 400);
  }
  assert.equal((await owner("GET", "items?category=INVALID")).status, 400);
  assert.equal((await owner("GET", "items?color=bad")).status, 400);
  assert.equal((await owner("GET", "items?season=INVALID")).status, 400);
  assert.equal((await stranger("GET", "items")).data.items.length, 0);
  assert.equal((await stranger("DELETE", `items/${item.id}`)).status, 404);
  assert.equal((await owner("GET", "items")).data.items.length, 2);
  assert.equal((await owner("DELETE", `items/${item.id}`)).status, 200);
  assert.equal(await db.wardrobeTag.count({ where: { itemId: item.id } }), 0);
  assert.equal((await owner("DELETE", `items/${item.id}`)).status, 404);
  assert.equal((await owner("GET", "items")).data.items.length, 1);
});

test("wardrobe handles legacy names/colors and enforces the item quota", async () => {
  const request = client();
  const first = await request("POST", "items", { name: "Áo", category: "TOP", color: "Đen", imageUrl: "https://example.com/a.jpg" });
  const stored = await db.wardrobeItem.findUniqueOrThrow({ where: { id: first.data.item.id } });
  await db.wardrobeItem.update({ where: { id: stored.id }, data: { color: "Trắng", searchName: "" } });
  assert.equal((await request("GET", "items?q=ao&color=%23ffffff")).data.total, 1);
  await db.wardrobeItem.createMany({ data: Array.from({ length: 199 }, (_, i) => ({ sessionId: stored.sessionId, name: `Item ${i}`, category: "TOP", color: "#ffffff", imageUrl: "https://example.com/a.jpg" })) });
  assert.equal((await request("POST", "items", { name: "Overflow", category: "TOP", color: "#fff", imageUrl: "https://example.com/a.jpg" })).status, 400);
  assert.equal((await request("GET", "items")).data.items.length, 200);
});

test("shop wardrobe requires an account, toggles idempotently, filters live metadata and protects ownership", async () => {
  const owner = client(), other = client();
  assert.equal((await owner("GET", "personal-wardrobe")).status, 401);
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "top-1" })).status, 401);
  assert.equal((await owner("GET", "personal-wardrobe/recommendations")).status, 401);
  await owner("POST", "auth/register", { name: "Wardrobe Owner", email: "wardrobe-owner@example.com", password: "wardrobe-pass-123" });
  await other("POST", "auth/register", { name: "Wardrobe Other", email: "wardrobe-other@example.com", password: "wardrobe-pass-456" });
  const fixtures = [["wp-top", "TOP", 100000], ["wp-bottom", "BOTTOM", 200000], ["wp-shoe", "FOOTWEAR", 300000], ["wp-coat", "OUTERWEAR", 400000], ["wp-dress", "DRESS", 500000]] as const;
  for (const [id, category, price] of fixtures) await db.product.create({ data: { id, slug: id, name: id, category, price, style: "casual minimal", tags: ["linen", "summer"], image: "https://example.com/garment.jpg", brand: "Test", description: "", material: "", care: "", variants: { create: { sku: id, size: "M", color: "Trắng", colorHex: "#FFFFFF", stock: 2 } } } });
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "not-real" })).status, 404);
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "wp-top", userId: "other" })).status, 400);
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "wp-top", saved: "yes" })).status, 400);
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "wp-top" }, { Origin: "https://evil.example" })).status, 403);
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "wp-top" })).data.saved, true);
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "wp-top" })).data.saved, false);
  const competingCreates = await Promise.all([owner("POST", "personal-wardrobe/toggle", { productId: "wp-top", saved: true }), owner("POST", "personal-wardrobe/toggle", { productId: "wp-top", saved: true })]);
  assert.ok(competingCreates.every(r => r.status === 200));
  assert.equal((await owner("GET", "personal-wardrobe")).data.total, 1);
  for (const [productId] of fixtures) assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId, saved: true })).data.saved, true);
  const retries = await Promise.all([owner("POST", "personal-wardrobe/toggle", { productId: "wp-top", saved: true }), owner("POST", "personal-wardrobe/toggle", { productId: "wp-top", saved: true })]);
  assert.ok(retries.every(r => r.status === 200));
  assert.equal((await owner("GET", "personal-wardrobe")).data.items.length, 5);
  await db.product.update({ where: { id: "wp-top" }, data: { name: "Áo linen mới" } });
  const filtered = await owner("GET", "personal-wardrobe?category=TOP&color=%23ffffff&q=ao%20linen");
  assert.equal(filtered.data.items.length, 1);
  assert.equal(filtered.data.items[0].product.name, "Áo linen mới");
  assert.deepEqual(filtered.data.items[0].product.tags, ["linen", "summer"]);
  assert.equal(filtered.data.items[0].userId, undefined);
  assert.equal((await owner("GET", "personal-wardrobe?sort=price_desc")).data.items[0].productId, "wp-dress");
  assert.equal((await owner("GET", "personal-wardrobe?sort=price_asc")).data.items[0].productId, "wp-top");
  assert.equal((await owner("GET", "personal-wardrobe?category=UNKNOWN")).status, 400);
  assert.equal((await owner("GET", "personal-wardrobe?color=invalid")).status, 400);
  assert.equal((await owner("GET", "personal-wardrobe?sort=bad")).status, 400);
  assert.equal((await other("GET", "personal-wardrobe")).data.total, 0);
  assert.equal((await other("GET", "personal-wardrobe/recommendations")).data.outfits.length, 0);
  await other("DELETE", "personal-wardrobe/wp-top");
  assert.equal((await owner("GET", "personal-wardrobe")).data.total, 5);
  const suggested = await owner("GET", "personal-wardrobe/recommendations?seed=test&limit=6");
  assert.equal(suggested.status, 200);
  assert.ok(suggested.data.outfits.length >= 2);
  const ownedIds = new Set(fixtures.map(([id]) => id as string));
  for (const outfit of suggested.data.outfits) {
    assert.ok(outfit.pieces.every((p: { product: { id: string } }) => ownedIds.has(p.product.id)));
    assert.ok(outfit.pieces.some((p: { slot: string }) => p.slot === "footwear"));
    assert.ok(outfit.score >= 65 && outfit.score <= 100);
    assert.ok(outfit.reasons.length);
  }
  assert.equal((await owner("GET", "personal-wardrobe/recommendations?limit=100")).status, 400);
  // Removing footwear must immediately prevent incomplete recommendations.
  await owner("DELETE", "personal-wardrobe/wp-shoe");
  assert.equal((await owner("GET", "personal-wardrobe/recommendations")).data.outfits.length, 0);
  assert.equal((await owner("DELETE", "personal-wardrobe/wp-shoe")).status, 200);
  await db.product.update({ where: { id: "wp-shoe" }, data: { active: false } });
  assert.equal((await owner("POST", "personal-wardrobe/toggle", { productId: "wp-shoe" })).status, 404);
  await owner("POST", "auth/logout", {});
  assert.equal((await owner("GET", "personal-wardrobe")).status, 401);
  await owner("POST", "auth/login", { email: "wardrobe-owner@example.com", password: "wardrobe-pass-123" });
  assert.equal((await owner("GET", "personal-wardrobe")).data.total, 4);
});

test("mix engine enforces complete slots, compatible styles/colors, and deterministic diverse randomness", () => {
  const opts = { seed: "repeatable", limit: 4, random: true };
  assert.deepEqual(productStyles("office casual party"), ["formal", "casual"]);
  assert.equal(styleHarmony(["formal"], ["sporty"]), 0);
  assert.ok(colorHarmony("#ffffff", "#ff0000").score > .8);
  assert.ok(colorHarmony("#ff0000", "#00ffff").score > .8);
  assert.ok(colorHarmony("#ff0000", "#ff2200").score > .8);
  assert.ok(colorHarmony("#ff0000", "#00ff00").score < .65);
  assert.equal(mixWardrobe([garment("a", "TOP"), garment("b", "BOTTOM")], opts).outfits.length, 0);
  assert.equal(mixWardrobe([garment("a", "TOP", ["formal"]), garment("b", "BOTTOM", ["formal"]), garment("s", "FOOTWEAR", ["sporty"])], opts).outfits.length, 0);
  const dress = mixWardrobe([garment("d", "DRESS"), garment("s", "FOOTWEAR"), garment("c", "OUTERWEAR"), garment("x", "ACCESSORY")], opts);
  assert.deepEqual(dress.outfits[0].pieces.map(p => p.slot), ["dress", "footwear", "outerwear", "accessory"]);
  const options = [garment("a", "TOP"), garment("b", "BOTTOM"), garment("s", "FOOTWEAR"), garment("a2", "TOP"), garment("b2", "SKIRT"), garment("s2", "FOOTWEAR")];
  const first = mixWardrobe(options, opts);
  assert.deepEqual(first, mixWardrobe(options, opts));
  assert.equal(new Set(first.outfits.map(o => o.id)).size, first.outfits.length);
  const next = mixWardrobe(options, { ...opts, seed: "new-seed", exclude: first.outfits.map(o => o.id) });
  assert.ok(next.outfits.length);
  assert.ok(next.outfits.every(o => !first.outfits.some(previous => previous.id === o.id)));
  const unavailable = options.map(p => ({ ...p, active: p.category !== "FOOTWEAR" }));
  assert.equal(mixWardrobe(unavailable, opts).outfits.length, 0);
  assert.equal(mixWardrobe(options.map(p => ({ ...p, isCombo: p.category === "TOP" })), opts).outfits.length, 0);
  const multicolor = [garment("a", "TOP", ["casual"], "#ff0000"), garment("b", "BOTTOM", ["casual"], "#00ff00"), garment("s", "FOOTWEAR")];
  multicolor[1].colors.push({ name: "Cyan", hex: "#00ffff" });
  assert.equal(mixWardrobe(multicolor, opts).outfits[0].pieces.find(p => p.slot === "bottom")!.color.hex, "#00ffff");
  assert.equal(mixWardrobe([garment("d", "DRESS"), garment("s", "FOOTWEAR")], { ...opts, exclude: ["d|s"] }).outfits.length, 1);
});

test("wardrobe, wishlist and outfits are isolated to the owning session", async () => {
  const a = client(), b = client(); await a("GET", "cart"); await b("GET", "cart");
  const closet = await a("POST", "wardrobe", { name: "Áo cá nhân", category: "TOP", color: "Trắng", imageUrl: "https://example.com/shirt.jpg" });
  await b("DELETE", "wardrobe/" + closet.data.item.id);
  assert.equal((await a("GET", "wardrobe")).data.items.length, 1);
  assert.equal((await b("GET", "wardrobe")).data.items.length, 0);
  await a("POST", "wishlist", { productId: "top-1" }); await a("POST", "wishlist", { productId: "top-1" });
  assert.equal((await a("GET", "wishlist")).data.items.length, 1);
  assert.equal((await b("GET", "wishlist")).data.items.length, 0);
  const outfit = await a("POST", "outfits", { name: "Đi làm", productIds: ["top-1", "bottom-1"] });
  await b("DELETE", "outfits/" + outfit.data.outfit.id);
  assert.equal((await a("GET", "outfits")).data.outfits.length, 1);
  assert.equal((await b("GET", "outfits")).data.outfits.length, 0);
});

test("try-on reports unavailable when unconfigured and processes when provider is active", async () => {
  const previousKey = process.env.TRYON_API_KEY;
  const previousProvider = process.env.TRYON_PROVIDER;

  // 1. When unconfigured: returns 503 TRYON_NOT_CONFIGURED
  delete process.env.TRYON_API_KEY;
  const unconfigured = await tryon(new NextRequest("http://localhost:3000/api/v1/try-on/generate", { method: "POST" }));
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).error.code, "TRYON_NOT_CONFIGURED");

  // 2. When configured with mock provider: validates input and returns result
  process.env.TRYON_API_KEY = "mock_test_key_123456789";
  process.env.TRYON_PROVIDER = "mock";

  // Bad input missing garment
  const badInput = await tryon(new NextRequest("http://localhost:3000/api/v1/try-on/generate", {
    method: "POST",
    body: JSON.stringify({ modelImage: "https://example.com/user.jpg" })
  }));
  assert.equal(badInput.status, 400);

  // Valid input
  const valid = await tryon(new NextRequest("http://localhost:3000/api/v1/try-on/generate", {
    method: "POST",
    body: JSON.stringify({
      modelImage: "https://example.com/user.jpg",
      garmentImage: "https://example.com/shirt.jpg",
      category: "tops"
    })
  }));
  assert.equal(valid.status, 200);
  const result = await valid.json();
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.provider, "mock");
  assert.equal(result.category, "tops");

  // Restore env
  if (previousKey) process.env.TRYON_API_KEY = previousKey;
  else delete process.env.TRYON_API_KEY;
  if (previousProvider) process.env.TRYON_PROVIDER = previousProvider;
  else delete process.env.TRYON_PROVIDER;
});

test("health check API reports healthy database status and system uptime", async () => {
  const res = await health();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "HEALTHY");
  assert.equal(data.database.status, "CONNECTED");
  assert.ok(typeof data.uptime === "number");
  assert.equal(data.version, "0.1.0");
});

test("admin creates variants and uses optimistic inventory updates; inactive products cannot be purchased", async () => {
  const request = client();
  const product = { name: "Áo kiểm thử mới", brand: "Test", category: "TOP", subcategory: "shirt", price: 200000, image: "https://example.com/shirt.jpg", transparentImageUrl: "https://example.com/shirt-transparent.png", pattern: "solid", fit: "relaxed", season: ["summer", "all-season"], occasion: ["cafe", "work"], formality: 2, variants: [{ size: "M", color: "Trắng", colorHex: "#FFFFFF", stock: 3 }] };
  assert.equal((await request("POST", "admin/products", { ...product, variants: [...product.variants, ...product.variants] }, admin)).status, 400);
  const created = await request("POST", "admin/products", product, admin);
  assert.equal(created.status, 200);
  assert.equal(created.data.product.subcategory, "shirt");
  assert.equal(created.data.product.transparentImageUrl, product.transparentImageUrl);
  assert.deepEqual(created.data.product.season, ["summer", "all-season"]);
  assert.deepEqual(created.data.product.occasion, ["cafe", "work"]);
  assert.equal(created.data.product.formality, 2);
  const id = created.data.product.id, variantId = created.data.product.variants[0].id;
  assert.equal((await request("PATCH", "admin/variants/" + variantId, { stock: 5, expectedStock: 2 }, admin)).status, 409);
  assert.equal((await request("PATCH", "admin/variants/" + variantId, { stock: 5, expectedStock: 3 }, admin)).status, 200);
  await request("GET", "cart");
  await request("POST", "cart/items", { items: [{ variantId, quantity: 1 }] });
  await request("PATCH", "admin/products/" + id, { active: false }, admin);
  assert.equal((await request("GET", "products/" + id)).status, 404);
  assert.equal((await request("POST", "orders", customer, { "Idempotency-Key": "inactive-checkout-01" })).status, 409);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 5);
});

test("simultaneous retries with the same checkout key create one order", async () => {
  const request = client(); await request("GET", "cart");
  const before = await db.productVariant.findUniqueOrThrow({ where: { id: "out-1-M" } });
  await request("POST", "cart/items", { items: [{ variantId: before.id, quantity: 1 }] });
  const header = { "Idempotency-Key": "parallel-retry-0001" };
  const [a, b] = await Promise.all([request("POST", "orders", customer, header), request("POST", "orders", customer, header)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(a.data.order.id, b.data.order.id);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: before.id } })).stock, before.stock - 1);
});

test("account registration merges guest cart, persists across login, and logout isolates account data", async () => {
  const request = client();
  await request("GET", "cart");
  await request("POST", "cart/items", { items: [{ variantId: "top-1-S", quantity: 1 }] });
  await request("POST", "wishlist", { productId: "top-2" });
  assert.equal((await request("POST", "auth/register", { name: "An Test", email: "AN@example.com", password: "short" })).status, 400);
  const registered = await request("POST", "auth/register", { name: "An Test", email: "AN@example.com", password: "matkhau-moi-123" });
  assert.equal(registered.status, 201);
  assert.equal(registered.data.user.email, "an@example.com");
  assert.match(registered.headers.get("set-cookie") || "", /HttpOnly/i);
  assert.equal((await request("GET", "auth/me")).data.user.name, "An Test");
  assert.equal((await request("GET", "personal-wardrobe")).data.items[0].productId, "top-2");
  assert.equal((await request("GET", "cart")).data.items[0].variantId, "top-1-S");
  assert.equal((await request("POST", "auth/register", { name: "An Other", email: "an@example.com", password: "matkhau-moi-123" })).status, 409);
  assert.equal((await request("POST", "auth/logout", {})).status, 200);
  assert.equal((await request("GET", "auth/me")).data.user, null);
  assert.equal((await request("GET", "cart")).data.items.length, 0);
  assert.equal((await request("POST", "auth/login", { email: "an@example.com", password: "sai-mat-khau" })).status, 401);
  assert.equal((await request("POST", "auth/login", { email: "an@example.com", password: "matkhau-moi-123" })).status, 200);
  assert.equal((await request("GET", "cart")).data.items[0].variantId, "top-1-S");
  const secondDevice = client();
  await secondDevice("POST", "auth/login", { email: "an@example.com", password: "matkhau-moi-123" });
  assert.equal((await secondDevice("GET", "cart")).data.items[0].variantId, "top-1-S");
});

test("password reset token is single-use and invalidates existing login sessions", async () => {
  const request = client();
  const forgot = await request("POST", "auth/forgot-password", { email: "an@example.com" });
  assert.equal(forgot.status, 200);
  assert.match(forgot.data.developmentToken, /^[a-f0-9]{64}$/);
  const token = forgot.data.developmentToken;
  assert.equal((await request("POST", "auth/reset-password", { token: "bad", password: "matkhau-khac-456" })).status, 400);
  assert.equal((await request("POST", "auth/reset-password", { token, password: "matkhau-khac-456" })).status, 200);
  assert.equal((await request("GET", "auth/me")).data.user, null);
  assert.equal((await request("POST", "auth/reset-password", { token, password: "matkhau-lan-ba-789" })).status, 400);
  assert.equal((await request("POST", "auth/login", { email: "an@example.com", password: "matkhau-moi-123" })).status, 401);
  assert.equal((await request("POST", "auth/login", { email: "an@example.com", password: "matkhau-khac-456" })).status, 200);
  const unknown = await client()("POST", "auth/forgot-password", { email: "nobody@example.com" });
  assert.equal(unknown.status, 200);
  assert.match(unknown.data.developmentToken, /^[a-f0-9]{64}$/);
  assert.equal((await client()("POST", "auth/reset-password", { token: unknown.data.developmentToken, password: "khong-ton-tai-123" })).status, 400);
});

test("authentication mutations reject cross-origin requests", async () => {
  const request = client();
  assert.equal((await request("POST", "auth/login", { email: "an@example.com", password: "matkhau-khac-456" }, { Origin: "https://evil.example" })).status, 403);
});

test("admin dashboard requires ADMIN role and exposes management data without password hashes", async () => {
  const adminUser = client();
  const customerUser = client();
  const adminEmail = "owner@example.com";
  const customerEmail = "member@example.com";
  await adminUser("POST", "auth/register", { name: "Chủ shop", email: adminEmail, password: "admin-pass-123" });
  await customerUser("POST", "auth/register", { name: "Khách hàng", email: customerEmail, password: "member-pass-123" });
  assert.equal((await adminUser("GET", "admin/dashboard")).status, 403);
  assert.equal((await customerUser("GET", "admin/products")).status, 403);
  const promoted = await db.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
  assert.equal((await adminUser("GET", "auth/me")).data.user.role, "ADMIN");
  const dashboard = await adminUser("GET", "admin/dashboard");
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.data.stats.products >= 11);
  assert.ok(dashboard.data.stats.users >= 2);
  const products = await adminUser("GET", "admin/products");
  assert.equal(products.status, 200);
  assert.ok(products.data.products[0].variants.length > 0);
  const users = await adminUser("GET", "admin/users");
  assert.equal(users.status, 200);
  assert.equal(users.data.users.some((user: Record<string, unknown>) => "passwordHash" in user), false);
  assert.equal((await adminUser("PATCH", "admin/users/" + promoted.id, { role: "CUSTOMER" })).status, 409);
  const customer = await db.user.findUniqueOrThrow({ where: { email: customerEmail } });
  assert.equal((await adminUser("PATCH", "admin/users/" + customer.id, { role: "ADMIN" })).status, 200);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: customer.id } })).role, "ADMIN");
});
