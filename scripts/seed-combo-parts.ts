import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const comboParts = [
  // Combo 1 parts
  {
    sku: "TOP-01",
    id: "part-top-01",
    name: "Sơ mi xanh sọc Oxford form rộng",
    category: "TOP",
    price: 116000,
    color: "Xanh sọc",
    colorHex: "#7A8F9E",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-1.jpg",
    description: "Sơ mi xanh sọc Oxford form rộng, thiết kế trẻ trung phong cách Hàn Quốc."
  },
  {
    sku: "PANT-01",
    id: "part-pant-01",
    name: "Quần rộng ống suông nâu",
    category: "BOTTOM",
    price: 539000,
    color: "Nâu tây",
    colorHex: "#5A3E32",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-1.jpg",
    description: "Quần rộng ống suông nâu tây, chất vải rủ mềm cạp cao tôn dáng."
  },
  {
    sku: "TOP-CAMI",
    id: "part-top-cami",
    name: "Áo camisole trắng lụa hai dây",
    category: "TOP",
    price: 95000,
    color: "Trắng",
    colorHex: "#FFFFFF",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-1.jpg",
    description: "Áo camisole trắng lụa hai dây mặc lót nhẹ nhàng tôn dáng bên trong."
  },
  {
    sku: "ACC-BAG01",
    id: "part-acc-bag01",
    name: "Túi xách tay da đen tối giản",
    category: "ACCESSORY",
    price: 250000,
    color: "Đen",
    colorHex: "#111111",
    sizes: ["F"],
    image: "/combos/combo-1.jpg",
    description: "Túi xách tay da đen phong cách tối giản, chất da PU lì cao cấp."
  },

  // Combo 2 parts
  {
    sku: "TOP-04",
    id: "part-top-04",
    name: "Áo Half-Zip Anorak Shirt xám",
    category: "TOP",
    price: 590000,
    color: "Xám tiêu",
    colorHex: "#A3A3A3",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-2.jpg",
    description: "Áo Half-Zip Anorak Shirt xám tiêu form rộng phong cách Smart Casual."
  },
  {
    sku: "PANT-03",
    id: "part-pant-03",
    name: "Quần rộng ống suông trắng",
    category: "BOTTOM",
    price: 456000,
    color: "Trắng kem",
    colorHex: "#E8DFCF",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-2.jpg",
    description: "Quần rộng ống suông trắng nhã nhặn, form suông rủ thanh lịch."
  },
  {
    sku: "ACC-BAG02",
    id: "part-acc-bag02",
    name: "Túi kẹp nách da đen dạo phố",
    category: "ACCESSORY",
    price: 250000,
    color: "Đen tuyền",
    colorHex: "#111111",
    sizes: ["F"],
    image: "/combos/combo-2.jpg",
    description: "Túi kẹp nách da đen dáng hiện đại cho outfit năng động."
  },
  {
    sku: "ACC-TECH",
    id: "part-acc-tech",
    name: "Tai nghe chụp tai over-ear thời trang",
    category: "ACCESSORY",
    price: 180000,
    color: "Trắng",
    colorHex: "#FFFFFF",
    sizes: ["F"],
    image: "/combos/combo-2.jpg",
    description: "Tai nghe chụp tai over-ear phụ kiện thời trang tạo điểm nhấn Y2K."
  },

  // Combo 3 parts
  {
    sku: "OUTER-01",
    id: "part-outer-01",
    name: "Áo Blazer Cropped xám",
    category: "OUTERWEAR",
    price: 650000,
    color: "Xám khói",
    colorHex: "#4A4A4A",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-3.jpg",
    description: "Áo Blazer Cropped xám khói dáng ngắn phá cách cá tính."
  },
  {
    sku: "TOP-NECK",
    id: "part-top-neck",
    name: "Áo thun cổ lọ trắng ôm basic",
    category: "TOP",
    price: 140000,
    color: "Trắng",
    colorHex: "#FFFFFF",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-3.jpg",
    description: "Áo thun dệt kim cổ lọ trắng co giãn nhẹ, giữ form ôm gọn gàng."
  },
  {
    sku: "ACC-BAG03",
    id: "part-acc-bag03",
    name: "Túi xách thể thao nâu viền xanh",
    category: "ACCESSORY",
    price: 280000,
    color: "Nâu viền xanh",
    colorHex: "#3B5349",
    sizes: ["F"],
    image: "/combos/combo-3.jpg",
    description: "Túi xách thể thao dáng retro Y2K phối màu cá tính."
  },
  {
    sku: "ACC-GLASS",
    id: "part-acc-glass",
    name: "Mắt kính râm thời trang cá tính",
    category: "ACCESSORY",
    price: 120000,
    color: "Đen",
    colorHex: "#111111",
    sizes: ["F"],
    image: "/combos/combo-3.jpg",
    description: "Mắt kính râm thời trang gọng kim loại hiện đại."
  },

  // Combo 4 parts
  {
    sku: "TOP-02",
    id: "part-top-02",
    name: "Sơ mi Crop Striped Poplin kem khoác ngoài",
    category: "TOP",
    price: 480000,
    color: "Kem sọc",
    colorHex: "#E8DFCF",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-4.jpg",
    description: "Sơ mi Crop Striped Poplin kem form lửng đứng dáng khoác ngoài."
  },
  {
    sku: "ACC-TIE",
    id: "part-acc-tie",
    name: "Cà vạt dệt đen phong cách retro",
    category: "ACCESSORY",
    price: 85000,
    color: "Đen",
    colorHex: "#111111",
    sizes: ["F"],
    image: "/combos/combo-4.jpg",
    description: "Cà vạt dệt đen bản retro tạo điểm nhấn preppy clean."
  },
  {
    sku: "PANT-04",
    id: "part-pant-04",
    name: "Quần rộng ống suông xếp ly kem",
    category: "BOTTOM",
    price: 527000,
    color: "Kem",
    colorHex: "#E8DFCF",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-4.jpg",
    description: "Quần rộng ống suông xếp ly kem chất vải âu cao cấp."
  },

  // Combo 5 parts
  {
    sku: "TOP-ORIENT",
    id: "part-top-orient",
    name: "Sơ mi xanh than cổ tàu thắt chéo vạt",
    category: "TOP",
    price: 390000,
    color: "Xanh than",
    colorHex: "#1B2838",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-5.jpg",
    description: "Sơ mi xanh than cổ tàu vạt chéo nghệ thuật đương đại Art-Garde."
  },
  {
    sku: "PANT-02",
    id: "part-pant-02",
    name: "Quần âu Wide Leg đen ống suông",
    category: "BOTTOM",
    price: 451000,
    color: "Đen tuyền",
    colorHex: "#111111",
    sizes: ["S", "M", "L", "XL"],
    image: "/combos/combo-5.jpg",
    description: "Quần âu Wide Leg đen ống suông rủ mềm mại tối giản."
  }
];

async function main() {
  console.log("Seeding combo component products into database...");
  for (const item of comboParts) {
    await db.product.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        image: item.image,
        active: true
      },
      create: {
        id: item.id,
        slug: item.id,
        name: item.name,
        brand: "FitCraft Studio",
        category: item.category,
        style: "casual",
        material: "Vải cao cấp chọn lọc",
        care: "Giặt nhẹ, tham khảo hướng dẫn trên nhãn",
        price: item.price,
        description: item.description,
        image: item.image,
        tagBadge: "Món lẻ combo",
        active: true
      }
    });

    for (const s of item.sizes) {
      const varId = `${item.id}-${s}`;
      const varSku = `FC-${item.sku}-${s}`;
      await db.productVariant.upsert({
        where: { id: varId },
        update: {
          stock: 30,
          color: item.color,
          colorHex: item.colorHex,
          sku: varSku
        },
        create: {
          id: varId,
          productId: item.id,
          sku: varSku,
          size: s,
          color: item.color,
          colorHex: item.colorHex,
          stock: 30
        }
      });
    }
    console.log(`✓ Seeded ${item.name} (${item.sizes.join(", ")})`);
  }
  console.log("All combo parts successfully seeded!");
}

if (require.main === module) {
  main().catch(console.error).finally(() => db.$disconnect());
}
