import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const rows = [
  ["top-1", "Áo sơ mi lụa Sage", "TOP", 690000, "1596755389378-c31d21fd1273", "office party", "Sage", "#9BAE9A", "Lụa pha", "S,M,L,XL"],
  ["top-2", "Áo dệt kim cổ thuyền", "TOP", 520000, "1583743814966-8936f5b7be1a", "casual office", "Kem", "#E8DFCF", "Cotton dệt kim", "S,M,L"],
  ["top-3", "Áo phông cotton Organic trắng", "TOP", 350000, "1521572267360-ee0c2909d518", "casual beach", "Trắng", "#FFFFFF", "Cotton", "S,M,L,XL"],
  ["bottom-1", "Quần wide-leg kem", "BOTTOM", 820000, "1594633312681-425c7b97ccd1", "office beach", "Kem", "#E8DFCF", "Linen pha", "S,M,L"],
  ["bottom-2", "Chân váy midi xếp ly", "BOTTOM", 750000, "1583496661160-fb5886a0aaaa", "party casual", "Đen", "#222222", "Polyester", "S,M,L"],
  ["bottom-3", "Quần âu suông olive", "BOTTOM", 790000, "1594633312681-425c7b97ccd1", "office casual", "Olive", "#747C51", "Cotton pha", "S,M,L,XL"],
  ["out-1", "Áo blazer linen kem", "OUTERWEAR", 890000, "1591047139829-d91aecb6caea", "office beach", "Kem", "#E8DFCF", "Linen", "S,M,L"],
  ["out-2", "Áo khoác Tweed cổ điển", "OUTERWEAR", 1250000, "1539533018447-63fcce2678e3", "office party", "Đen", "#222222", "Tweed", "S,M"],
  ["acc-1", "Túi shoulder mini", "ACCESSORY", 380000, "1584917865442-de89df76afd3", "office party", "Nâu", "#7B5946", "Da tổng hợp", "F"],
  ["acc-2", "Túi tote da mềm", "ACCESSORY", 490000, "1590874103328-eac38a683ce7", "casual beach", "Nâu", "#7B5946", "Da tổng hợp", "F"],
  ["shoe-1", "Giày Loafer Mocha", "FOOTWEAR", 890000, "1533867617858-e7b97e060509", "office casual", "Mocha", "#5A3E32", "Da tổng hợp", "36,37,38,39"]
] as const;

async function main() {
  for (const [id, name, category, price, photo, style, color, colorHex, material, sizes] of rows) {
    await db.product.upsert({ where: { id }, update: {}, create: {
      id, slug: id, name, category, price, style, brand: "FitCraft Studio", material,
      description: "Sản phẩm mẫu để trải nghiệm FitCraft. Thông tin chất liệu và bảng size cần được thay bằng dữ liệu của shop trước khi bán.",
      care: "Tham khảo nhãn chăm sóc thực tế trước khi giặt. Đây là dữ liệu minh họa.",
      image: `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=600&q=80`, tagBadge: "Bộ sưu tập mẫu",
      variants: { create: sizes.split(",").map(size => ({ id: `${id}-${size}`, sku: `FC-${id}-${size}`, size, color, colorHex, stock: 12 })) },
      sizeGuide: { create: sizes.split(",").filter(s => ["S", "M", "L", "XL"].includes(s)).map((size, i) => ({ size, chestMin: 80 + i * 6, chestMax: 85 + i * 6, waistMin: 62 + i * 6, waistMax: 67 + i * 6, hipMin: 86 + i * 6, hipMax: 91 + i * 6 })) }
    } });
  }
  console.log(`Seed complete: ${rows.length} sample products. Existing records were preserved.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
