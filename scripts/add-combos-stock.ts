import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const combos = [
  {
    id: "combo-1",
    slug: "combo-1-minimalism-dao-pho",
    name: "Combo 1 - Phong cách Minimalism Dạo phố (Tối giản & Sang chảnh)",
    category: "OUTERWEAR",
    price: 1000000,
    brand: "FitCraft Studio",
    material: "Sơ mi xanh sọc Oxford + Quần rộng Out Curves Wide Leg nâu + Áo camisole trắng + Túi da đen",
    care: "Giặt máy chế độ nhẹ hoặc giặt tay, ủi hơi nước ở nhiệt độ vừa.",
    style: "office casual",
    description: "Gồm các món: Sơ mi xanh sọc Oxford form rộng (116.000₫) + Quần rộng Out Curves Wide Leg nâu (539.000₫) + Áo camisole trắng lụa hai dây (95.000₫) + Túi xách tay da đen tối giản (250.000₫). Tổng: 1.000.000₫.",
    image: "/combos/combo-1.jpg",
    tagBadge: "Combo Hot",
    color: "Xanh kẻ / Nâu",
    colorHex: "#7A8F9E",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "combo-2",
    slug: "combo-2-smart-casual-tre-trung",
    name: "Combo 2 - Phong cách Smart Casual (Trẻ trung & Thanh lịch)",
    category: "TOP",
    price: 1476000,
    brand: "FitCraft Studio",
    material: "Áo Half-Zip Anorak xám + Quần rộng ống suông trắng + Phụ kiện túi đen & tai nghe",
    care: "Giặt tay bằng nước lạnh, phơi ngang để giữ phom dáng áo.",
    style: "casual office",
    description: "Gồm các món: Áo Half-Zip Anorak Shirt xám (590.000₫) + Quần rộng ống suông trắng (456.000₫) + Túi kẹp nách da đen (250.000₫) + Tai nghe chụp tai thời trang (180.000₫). Tổng: 1.476.000₫.",
    image: "/combos/combo-2.jpg",
    tagBadge: "Bán chạy",
    color: "Xám / Trắng",
    colorHex: "#A3A3A3",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "combo-3",
    slug: "combo-3-edgy-workwear-pha-cach",
    name: "Combo 3 - Phong cách Edgy Workwear (Phá cách & Cá tính)",
    category: "OUTERWEAR",
    price: 1729000,
    brand: "FitCraft Studio",
    material: "Blazer HOLO Crop xám + Quần rộng Out Curves Wide Leg nâu + Áo thun cổ lọ trắng + Phụ kiện",
    care: "Giặt khô hoặc giặt nhẹ, bảo quản móc áo giữ form blazer.",
    style: "party office",
    description: "Gồm các món: Blazer HOLO Crop xám (650.000₫) + Quần rộng Out Curves Wide Leg nâu (539.000₫) + Áo thun cổ lọ trắng (140.000₫) + Túi xách thể thao nâu viền xanh (280.000₫) + Mắt kính râm thời trang (120.000₫). Tổng: 1.729.000₫.",
    image: "/combos/combo-3.jpg",
    tagBadge: "Xu hướng",
    color: "Xám / Nâu",
    colorHex: "#4A4A4A",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "combo-4",
    slug: "combo-4-preppy-clean-co-dien",
    name: "Combo 4 - Phong cách Preppy Clean (Cổ điển & Gọn gàng)",
    category: "TOP",
    price: 1512000,
    brand: "FitCraft Studio",
    material: "Sơ mi Crop Striped Poplin kem + Áo cổ lọ trắng + Cà vạt đen + Túi thể thao xanh nâu + Quần rộng",
    care: "Giặt máy chế độ nhẹ, ủi nhẹ bề mặt sơ mi.",
    style: "casual office",
    description: "Gồm các món: Sơ mi Crop Striped Poplin kem khoác ngoài (480.000₫) + Áo thun cổ lọ trắng (140.000₫) + Cà vạt dệt đen retro (85.000₫) + Túi xách thể thao xanh phối nâu (280.000₫) + Quần rộng Classy Wide-leg Trousers (527.000₫). Tổng: 1.512.000₫.",
    image: "/combos/combo-4.jpg",
    tagBadge: "Mới về",
    color: "Kem / Trắng",
    colorHex: "#E8DFCF",
    sizes: ["S", "M", "L", "XL"]
  },
  {
    id: "combo-5",
    slug: "combo-5-art-garde-minimalist-doc-dao",
    name: "Combo 5 - Phong cách Art-Garde Minimalist (Tối giản & Độc đáo)",
    category: "OUTERWEAR",
    price: 1741000,
    brand: "FitCraft Studio",
    material: "Blazer HOLO Crop xám + Sơ mi xanh than cổ tàu vạt chéo + Quần âu Wide Leg đen + Túi da đen",
    care: "Giặt khô hoặc giặt nhẹ tay, treo phẳng phơi trong bóng râm.",
    style: "party casual",
    description: "Gồm các món: Blazer HOLO Crop xám khoác hờ (650.000₫) + Sơ mi xanh than cổ tàu thắt chéo vạt (390.000₫) + Quần âu Wide Leg đen ống suông (451.000₫) + Túi xách tay da đen sang trọng (250.000₫). Tối giản & Độc đáo, phong thái nghệ thuật đương đại.",
    image: "/combos/combo-5.jpg",
    tagBadge: "Cao cấp",
    color: "Xanh than / Xám",
    colorHex: "#1B2838",
    sizes: ["S", "M", "L", "XL"]
  }
];

async function main() {
  console.log("Adding 5 combos to stock...");

  for (const c of combos) {
    // 1. Upsert product
    const product = await db.product.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        price: c.price,
        category: c.category,
        brand: c.brand,
        material: c.material,
        care: c.care,
        style: c.style,
        description: c.description,
        image: c.image,
        tagBadge: c.tagBadge,
        active: true
      },
      create: {
        id: c.id,
        slug: c.slug,
        name: c.name,
        category: c.category,
        price: c.price,
        style: c.style,
        brand: c.brand,
        material: c.material,
        care: c.care,
        description: c.description,
        image: c.image,
        tagBadge: c.tagBadge,
        active: true
      }
    });

    // 2. Upsert variants
    for (const size of c.sizes) {
      const variantId = `${c.id}-${size}`;
      const sku = `FC-${c.id.toUpperCase()}-${size}`;
      await db.productVariant.upsert({
        where: { id: variantId },
        update: {
          stock: 25,
          color: c.color,
          colorHex: c.colorHex,
          sku
        },
        create: {
          id: variantId,
          productId: c.id,
          sku,
          size,
          color: c.color,
          colorHex: c.colorHex,
          stock: 25
        }
      });
    }

    // 3. Upsert size guides
    for (let i = 0; i < c.sizes.length; i++) {
      const size = c.sizes[i];
      await db.sizeGuideRow.upsert({
        where: { productId_size: { productId: c.id, size } },
        update: {
          chestMin: 82 + i * 6,
          chestMax: 88 + i * 6,
          waistMin: 64 + i * 6,
          waistMax: 70 + i * 6,
          hipMin: 88 + i * 6,
          hipMax: 94 + i * 6
        },
        create: {
          productId: c.id,
          size,
          chestMin: 82 + i * 6,
          chestMax: 88 + i * 6,
          waistMin: 64 + i * 6,
          waistMax: 70 + i * 6,
          hipMin: 88 + i * 6,
          hipMax: 94 + i * 6
        }
      });
    }

    console.log(`✓ Product '${c.name}' added with 4 variants (S, M, L, XL - stock: 25 each).`);
  }

  // Find all existing sessions
  const sessions = await db.session.findMany({
    include: { user: true, cart: true }
  });
  console.log(`Found ${sessions.length} sessions in database.`);

  // Insert all 5 combos (size M) into cart for each session
  for (const s of sessions) {
    for (const c of combos) {
      const variantId = `${c.id}-M`;
      await db.cartItem.upsert({
        where: { sessionId_variantId: { sessionId: s.id, variantId } },
        update: { quantity: 1 },
        create: { sessionId: s.id, variantId, quantity: 1 }
      });
    }
    console.log(`✓ Added 5 combo items to session cart: ${s.id} (user: ${s.user?.email || "anonymous"})`);
  }

  // Count total products and cart items
  const totalProducts = await db.product.count();
  const totalVariants = await db.productVariant.count();
  const totalCartItems = await db.cartItem.count();
  console.log(`\nSummary:\n- Total products in stock: ${totalProducts}\n- Total variants: ${totalVariants}\n- Total cart items: ${totalCartItems}`);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
