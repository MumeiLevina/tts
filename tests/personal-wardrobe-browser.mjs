// Run with a local dev server. Creates one unique test account and removes it
// in finally; catalog products and existing accounts are never modified.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WARDROBE_TEST_ORIGIN || "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local test server");
process.loadEnvFile(".env");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.stack || error.message));
await page.route("https://**/*", route => route.request().resourceType() === "image" ? route.abort() : route.continue());
const email = `wardrobe-browser-${Date.now()}@example.com`;
let accountId;
const closet = page.locator("#closet");
try {
  await page.goto(base + "/wardrobe");
  await closet.getByRole("link", { name: "Đăng nhập", exact: true }).waitFor();
  const registration = await context.request.post(base + "/api/v1/auth/register", { data: { email, name: "Wardrobe Browser", password: "wardrobe-browser-test-123" } });
  assert.equal(registration.status(), 201);
  accountId = (await registration.json()).user.id;
  await page.goto(base + "/#products");
  const topName = "Áo phông cotton Organic trắng", bottomName = "Quần wide-leg kem", shoeName = "Giày Loafer Mocha";
  const save = name => page.locator("#products").getByRole("button", { name: `Thêm vào tủ đồ: ${name}`, exact: true });
  const unsave = name => page.locator("#products").getByRole("button", { name: `Bỏ khỏi tủ đồ: ${name}`, exact: true });
  await save(topName).waitFor();
  // Hold the response to prove the heart changes BEFORE network success.
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/api/wardrobe/toggle", async route => { await gate; await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "Lỗi lưu kiểm thử" } }) }); });
  await save(topName).click();
  await unsave(topName).waitFor();
  assert.equal(await unsave(topName).getAttribute("aria-pressed"), "true");
  assert.equal(await unsave(topName).isDisabled(), true);
  release();
  await page.getByText("Lỗi lưu kiểm thử", { exact: true }).waitFor();
  await save(topName).waitFor();
  await page.unroute("**/api/wardrobe/toggle");
  for (const name of [topName, bottomName, shoeName]) {
    const response = page.waitForResponse(r => r.url().endsWith("/api/wardrobe/toggle") && r.status() === 200);
    await save(name).click(); await response; await unsave(name).waitFor();
  }
  await closet.getByRole("tab", { name: "Đã lưu (3)", exact: true }).waitFor();
  await page.locator("#products").getByRole("button", { name: "Xem chi tiết " + topName, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bỏ khỏi tủ đồ: " + topName, exact: true }).waitFor();
  await page.getByRole("button", { name: "Đóng chi tiết", exact: true }).click();
  await page.goto(base + "/wardrobe");
  await closet.getByRole("tab", { name: "Đã lưu (3)", exact: true }).waitFor();
  await closet.getByLabel("Lọc danh mục tủ đồ").selectOption("FOOTWEAR");
  assert.equal(await closet.locator("article").count(), 1);
  await closet.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await closet.getByLabel("Lọc màu tủ đồ").selectOption("#ffffff");
  assert.equal(await closet.locator("article").count(), 1);
  await closet.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await closet.getByRole("tab", { name: "Gợi ý phối đồ", exact: true }).click();
  await closet.getByRole("heading", { name: "Bộ phối 1", exact: true }).waitFor();
  assert.equal(await closet.locator("article h4").count(), 3);
  await closet.getByRole("button", { name: "Tạo gợi ý mới", exact: true }).click();
  await closet.getByText("Chưa có bộ khác phù hợp trong tủ đồ; đây là những lựa chọn hiện có.", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await closet.evaluate(el => el.scrollWidth <= el.clientWidth), true, "Mobile wardrobe should not overflow");
  // A second tab observes saved-item changes via BroadcastChannel.
  const second = await context.newPage();
  await second.goto(base + "/#products");
  await second.locator("#products").getByRole("button", { name: `Bỏ khỏi tủ đồ: ${shoeName}`, exact: true }).waitFor();
  await closet.getByRole("tab", { name: "Đã lưu (3)", exact: true }).click();
  await closet.getByRole("button", { name: "Bỏ lưu " + shoeName, exact: true }).click();
  await closet.getByRole("tab", { name: "Đã lưu (2)", exact: true }).waitFor();
  await second.locator("#products").getByRole("button", { name: `Thêm vào tủ đồ: ${shoeName}`, exact: true }).waitFor();
  await second.close();
  await closet.getByRole("tab", { name: "Gợi ý phối đồ", exact: true }).click();
  await closet.getByText("Chưa đủ nhóm đồ. Hãy lưu thêm: Giày.", { exact: true }).waitFor();
  assert.equal(await closet.locator("article").count(), 0);
  await page.reload();
  await closet.getByRole("tab", { name: "Đã lưu (2)", exact: true }).waitFor();
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log("PASS account wardrobe: guest/login, optimistic save/rollback, catalog/detail sync, persistence, filters, outfits, random, cross-tab removal, mobile.");
} finally {
  await browser.close();
  if (accountId) {
    const created = await db.user.findUnique({ where: { id: accountId } });
    if (created?.email === email) await db.user.delete({ where: { id: accountId } });
  }
  await db.$disconnect();
}
