import { loadEnvConfig } from "@next/env";
import type { PrismaClient } from "@prisma/client";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

loadEnvConfig(process.cwd(), true);
let db: PrismaClient | undefined;

type Sample = {
  id: string; name: string; category: string; brand: string; price: number;
  style: string; color: string; colorHex: string; image: string;
  sourcePage: string; sizes: string[];
};

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  db = new PrismaClient();
  const client = db;
  const manifest = JSON.parse(await readFile("public/sample-products/sources.json", "utf8")) as { products: Sample[] };
  for (const row of manifest.products) await access(resolve("public", `.${row.image}`));
  await client.$transaction(manifest.products.map(row => client.product.upsert({
    where: { id: row.id }, update: {},
    create: {
      id: row.id, slug: row.id, name: `[Mẫu canvas] ${row.name}`, brand: row.brand,
      category: row.category, price: row.price, style: row.style, image: row.image,
      description: `Sản phẩm mẫu để test canvas. Giá, size và tồn kho là dữ liệu giả lập. Nguồn ảnh: ${row.sourcePage}. Thay ảnh trước khi lên production.`,
      material: "Dữ liệu test — xem thông tin tại trang nguồn",
      care: "Dữ liệu test, không dùng làm hướng dẫn chăm sóc sản phẩm.",
      tagBadge: "Mẫu canvas", tags: ["canvas-sample", "development-only"],
      variants: { create: row.sizes.map(size => ({
        id: `${row.id}-${size}`, sku: `TEST-${row.id}-${size}`, size,
        color: row.color, colorHex: row.colorHex, stock: 20
      })) }
    }
  })));
  const count = await client.product.count({ where: { id: { in: manifest.products.map(row => row.id) } } });
  console.log(`Ready: ${count} canvas sample products. Existing products preserved.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db?.$disconnect());
