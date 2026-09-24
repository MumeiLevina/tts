// Optional browser smoke test. Use an isolated browser context; only its own
// test garments are created/deleted. Run against a local dev server.
// PLAYWRIGHT_MODULE can point to an externally installed playwright package.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const failures = [];
page.on("pageerror", error => failures.push(error.stack || error.message));
// External image availability should not decide whether CRUD works.
await page.route("https://**/*", route => route.request().resourceType() === "image" ? route.abort() : route.continue());
const base = process.env.WARDROBE_TEST_ORIGIN || "http://localhost:3000";
const createdIds = [];
page.on("response", async response => {
  if (response.request().method() === "POST" && response.url().endsWith("/wardrobe/items") && response.status() === 201) {
    createdIds.push((await response.json()).item.id);
  }
});
const closet = page.locator("#closet");
async function waitText(text) { await closet.getByText(text, { exact: true }).waitFor(); }
async function add(name, category, color) {
  await closet.getByRole("button", { name: "Thêm món đồ", exact: true }).click();
  await closet.getByLabel("Tên món đồ *", { exact: true }).fill(name);
  await closet.getByLabel("Danh mục *", { exact: true }).selectOption(category);
  await closet.getByLabel("Màu sắc *", { exact: true }).selectOption(color);
  await closet.getByLabel("Đường dẫn ảnh *", { exact: false }).fill("https://example.com/wardrobe-test.jpg");
  await closet.getByLabel("Hạ", { exact: true }).check();
  await closet.getByLabel("Tối giản", { exact: true }).check();
  await closet.getByLabel("Đi làm", { exact: true }).check();
  await closet.getByRole("button", { name: "Lưu vào tủ đồ", exact: true }).click();
  await closet.getByRole("heading", { name, exact: true }).waitFor();
}
try {
  await page.goto(base + "/wardrobe/manual#closet");
  await waitText("Một tủ đồ mới, bắt đầu từ bạn");
  await add("Áo kiểm thử trình duyệt", "TOP", "#ffffff");
  await add("Váy kiểm thử trình duyệt", "DRESS", "#ff0000");
  await waitText("2 / 2 món đồ");
  await closet.getByRole("searchbox", { name: "Tìm món đồ theo tên" }).fill("ao kiem thu");
  await waitText("1 / 2 món đồ");
  await closet.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await closet.getByLabel("Lọc theo danh mục").selectOption("DRESS");
  await closet.getByLabel("Lọc theo màu sắc").selectOption("#ffffff");
  await waitText("Chưa tìm thấy món phù hợp");
  await closet.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await page.reload();
  await waitText("2 / 2 món đồ");
  await closet.getByRole("button", { name: "Xóa Áo kiểm thử trình duyệt", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await waitText("2 / 2 món đồ");
  // A failed deletion keeps the garment and dialog; retry succeeds.
  await page.route("**/api/v1/wardrobe/items/*", async route => {
    if (route.request().method() === "DELETE") await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "Lỗi xóa kiểm thử" } }) });
    else await route.continue();
  });
  await closet.getByRole("button", { name: "Xóa Áo kiểm thử trình duyệt", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa món đồ", exact: true }).click();
  await page.getByRole("dialog").getByText("Lỗi xóa kiểm thử").waitFor();
  await page.unroute("**/api/v1/wardrobe/items/*");
  await page.getByRole("dialog").getByRole("button", { name: "Xóa món đồ", exact: true }).click();
  await waitText("1 / 1 món đồ");
  await page.setViewportSize({ width: 390, height: 844 });
  await closet.getByRole("button", { name: "Thêm món đồ", exact: true }).click();
  assert.equal(await closet.evaluate(el => el.scrollWidth <= el.clientWidth), true, "Wardrobe must not overflow on mobile");
  await closet.getByRole("button", { name: "Hủy", exact: true }).click();
  await closet.getByRole("button", { name: "Xóa Váy kiểm thử trình duyệt", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa món đồ", exact: true }).click();
  await waitText("Một tủ đồ mới, bắt đầu từ bạn");
  // Load failure exposes a retry action, and recovery reloads the real data.
  await page.route("**/api/v1/wardrobe/items", route => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "Lỗi tải kiểm thử" } }) }));
  await page.reload();
  await waitText("Lỗi tải kiểm thử");
  await page.unroute("**/api/v1/wardrobe/items");
  await closet.getByRole("button", { name: "Thử lại" }).click();
  await waitText("Một tủ đồ mới, bắt đầu từ bạn");
  assert.deepEqual(failures, [], "No browser runtime errors");
  console.log("PASS wardrobe browser: create, tags, search, filters, reload, cancel/delete, error/retry, mobile layout.");
} finally {
  // Clean up only IDs generated in this browser session, including on failure.
  for (const id of createdIds) await context.request.delete(`${base}/api/v1/items/${id}`);
  await browser.close();
}
