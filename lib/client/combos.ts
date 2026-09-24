import { ComboClothingItem, ComboLookData, ComboOption } from "../../app/components/ComboDetailModal";

const rawCombos: Array<{
  id: string;
  title: string;
  styleName: string;
  image: string;
  description: string;
  sizes: string[];
  options: ComboOption[];
  items: ComboClothingItem[];
}> = [
  {
    id: "combo-1",
    title: "Combo 1: Minimalism Dạo Phố",
    styleName: "Tối giản & Sang chảnh",
    image: "/combos/combo-1.jpg",
    description: "Áo sơ mi xanh kẻ (thắt nút eo) + Quần nâu ống rộng + Áo camisole trắng + Túi đen xách tay.",
    sizes: [
      "S (xanh sọc)", "M (xanh sọc)", "L (xanh sọc)", "XL (xanh sọc)",
      "S (nâu tây)", "M (nâu tây)", "L (nâu tây)", "XL (nâu tây)",
      "S (trắng kem)", "M (trắng kem)", "L (trắng kem)", "XL (trắng kem)"
    ],
    options: [
      {
        id: "full-set",
        name: "Trọn bộ Full Set (4 món)",
        price: 1000000,
        priceFormatted: "1.000.000₫",
        includedSkus: ["TOP-01", "PANT-01", "TOP-CAMI", "ACC-BAG01"]
      },
      {
        id: "top-pant",
        name: "Áo sơ mi + Quần",
        price: 655000,
        priceFormatted: "655.000₫",
        includedSkus: ["TOP-01", "PANT-01"]
      },
      {
        id: "top-only",
        name: "Chỉ Áo sơ mi",
        price: 116000,
        priceFormatted: "116.000₫",
        includedSkus: ["TOP-01"]
      },
      {
        id: "pant-only",
        name: "Chỉ Quần ống rộng",
        price: 539000,
        priceFormatted: "539.000₫",
        includedSkus: ["PANT-01"]
      },
      {
        id: "cami-only",
        name: "Chỉ Áo camisole",
        price: 95000,
        priceFormatted: "95.000₫",
        includedSkus: ["TOP-CAMI"]
      },
      {
        id: "bag-only",
        name: "Chỉ Túi xách da",
        price: 250000,
        priceFormatted: "250.000₫",
        includedSkus: ["ACC-BAG01"]
      }
    ],
    items: [
      {
        sku: "TOP-01",
        type: "Sơ mi",
        name: "Sơ mi xanh sọc Oxford form rộng",
        price: 116000,
        priceFormatted: "116.000₫",
        note: "Bản tiêu chuẩn (Lựa chọn khác: Sơ mi Crop Striped Poplin xanh - 480.000₫)"
      },
      {
        sku: "PANT-01",
        type: "Quần rộng",
        name: "Quần rộng ống suông nâu",
        price: 539000,
        priceFormatted: "539.000₫",
        note: "Ống suông rủ mềm mại, cạp cao tôn dáng"
      },
      {
        sku: "TOP-CAMI",
        type: "Áo lót trong",
        name: "Áo camisole trắng lụa hai dây",
        price: 95000,
        priceFormatted: "95.000₫",
        note: "Mặc lót nhẹ nhàng tôn dáng bên trong sơ mi"
      },
      {
        sku: "ACC-BAG01",
        type: "Túi xách",
        name: "Túi xách tay da đen tối giản",
        price: 250000,
        priceFormatted: "250.000₫",
        note: "Da PU mềm cao cấp"
      }
    ]
  },
  {
    id: "combo-2",
    title: "Combo 2: Smart Casual",
    styleName: "Trẻ trung & Thanh lịch",
    image: "/combos/combo-2.jpg",
    description: "Áo len cổ zip xám + Quần trắng ống rộng + Tai nghe + Túi đen.",
    sizes: [
      "S (xám tiêu)", "M (xám tiêu)", "L (xám tiêu)", "XL (xám tiêu)",
      "S (trắng kem)", "M (trắng kem)", "L (trắng kem)", "XL (trắng kem)",
      "S (đen tuyền)", "M (đen tuyền)", "L (đen tuyền)", "XL (đen tuyền)"
    ],
    options: [
      {
        id: "full-set",
        name: "Trọn bộ Full Set (4 món)",
        price: 1476000,
        priceFormatted: "1.476.000₫",
        includedSkus: ["TOP-04", "PANT-03", "ACC-BAG02", "ACC-TECH"]
      },
      {
        id: "top-pant",
        name: "Áo Half-Zip + Quần",
        price: 1046000,
        priceFormatted: "1.046.000₫",
        includedSkus: ["TOP-04", "PANT-03"]
      },
      {
        id: "top-only",
        name: "Chỉ Áo Half-Zip",
        price: 590000,
        priceFormatted: "590.000₫",
        includedSkus: ["TOP-04"]
      },
      {
        id: "pant-only",
        name: "Chỉ Quần ống suông",
        price: 456000,
        priceFormatted: "456.000₫",
        includedSkus: ["PANT-03"]
      },
      {
        id: "bag-only",
        name: "Chỉ Túi kẹp nách da",
        price: 250000,
        priceFormatted: "250.000₫",
        includedSkus: ["ACC-BAG02"]
      },
      {
        id: "tech-only",
        name: "Chỉ Tai nghe chụp tai",
        price: 180000,
        priceFormatted: "180.000₫",
        includedSkus: ["ACC-TECH"]
      }
    ],
    items: [
      {
        sku: "TOP-04",
        type: "Half-Zip",
        name: "Áo Half-Zip Anorak Shirt xám",
        price: 590000,
        priceFormatted: "590.000₫",
        note: "Bản cao cấp (Lựa chọn giá thấp: Áo Half-Zip Sweater xám - 127.000₫)"
      },
      {
        sku: "PANT-03",
        type: "Quần rộng",
        name: "Quần rộng ống suông trắng",
        price: 456000,
        priceFormatted: "456.000₫",
        note: "Vải mềm thoáng khí, màu trắng nhã nhặn"
      },
      {
        sku: "ACC-BAG02",
        type: "Túi xách",
        name: "Túi kẹp nách da đen dạo phố",
        price: 250000,
        priceFormatted: "250.000₫",
        note: "Dáng túi kẹp nách hiện đại"
      },
      {
        sku: "ACC-TECH",
        type: "Phụ kiện",
        name: "Tai nghe chụp tai over-ear thời trang",
        price: 180000,
        priceFormatted: "180.000₫",
        note: "Điểm nhấn phong cách trẻ trung, năng động"
      }
    ]
  },
  {
    id: "combo-3",
    title: "Combo 3: Edgy Workwear",
    styleName: "Phá cách & Cá tính",
    image: "/combos/combo-3.jpg",
    description: "Blazer xám cropped + Áo cổ lọ trắng + Quần nâu rộng + Mắt kính + Túi nâu xanh.",
    sizes: [
      "S (xám khói)", "M (xám khói)", "L (xám khói)", "XL (xám khói)",
      "S (nâu tây)", "M (nâu tây)", "L (nâu tây)", "XL (nâu tây)",
      "S (đen nhám)", "M (đen nhám)", "L (đen nhám)", "XL (đen nhám)"
    ],
    options: [
      {
        id: "full-set",
        name: "Trọn bộ Full Set (5 món)",
        price: 1729000,
        priceFormatted: "1.729.000₫",
        includedSkus: ["OUTER-01", "PANT-01", "TOP-NECK", "ACC-BAG03", "ACC-GLASS"]
      },
      {
        id: "top-pant",
        name: "Áo Blazer + Quần",
        price: 1189000,
        priceFormatted: "1.189.000₫",
        includedSkus: ["OUTER-01", "PANT-01"]
      },
      {
        id: "blazer-only",
        name: "Chỉ Áo Blazer Cropped",
        price: 650000,
        priceFormatted: "650.000₫",
        includedSkus: ["OUTER-01"]
      },
      {
        id: "pant-only",
        name: "Chỉ Quần ống suông",
        price: 539000,
        priceFormatted: "539.000₫",
        includedSkus: ["PANT-01"]
      },
      {
        id: "neck-only",
        name: "Chỉ Áo cổ lọ trắng",
        price: 140000,
        priceFormatted: "140.000₫",
        includedSkus: ["TOP-NECK"]
      },
      {
        id: "accessories-only",
        name: "Phụ kiện (Túi + Kính)",
        price: 400000,
        priceFormatted: "400.000₫",
        includedSkus: ["ACC-BAG03", "ACC-GLASS"]
      }
    ],
    items: [
      {
        sku: "OUTER-01",
        type: "Blazer",
        name: "Áo Blazer Cropped xám",
        price: 650000,
        priceFormatted: "650.000₫",
        note: "Dáng cropped cá tính (Lựa chọn khác: Blazer dáng lửng tay dài - 459.000₫)"
      },
      {
        sku: "PANT-01",
        type: "Quần rộng",
        name: "Quần rộng ống suông nâu",
        price: 539000,
        priceFormatted: "539.000₫",
        note: "Tone nâu tôn dáng (Lựa chọn khác: Quần âu Wide Leg xám - 451.000₫)"
      },
      {
        sku: "TOP-NECK",
        type: "Áo cổ lọ",
        name: "Áo thun cổ lọ trắng ôm basic",
        price: 140000,
        priceFormatted: "140.000₫",
        note: "Chất thun dệt kim mềm, co giãn nhẹ"
      },
      {
        sku: "ACC-BAG03",
        type: "Túi xách",
        name: "Túi xách thể thao nâu viền xanh",
        price: 280000,
        priceFormatted: "280.000₫",
        note: "Thiết kế thể thao retro Y2K"
      },
      {
        sku: "ACC-GLASS",
        type: "Kính mắt",
        name: "Mắt kính râm thời trang cá tính",
        price: 120000,
        priceFormatted: "120.000₫",
        note: "Gọng kim loại sành điệu"
      }
    ]
  },
  {
    id: "combo-4",
    title: "Combo 4: Preppy Clean",
    styleName: "Cổ điển & Gọn gàng",
    image: "/combos/combo-4.jpg",
    description: "Áo sơ mi kem (khoác ngoài) + Áo cổ lọ trắng + Cà vạt đen (nới lỏng) + Túi xanh nâu.",
    sizes: [
      "S (kem sọc)", "M (kem sọc)", "L (kem sọc)", "XL (kem sọc)",
      "S (trắng ôm)", "M (trắng ôm)", "L (trắng ôm)", "XL (trắng ôm)",
      "S (xanh rêu)", "M (xanh rêu)", "L (xanh rêu)", "XL (xanh rêu)"
    ],
    options: [
      {
        id: "full-set",
        name: "Trọn bộ Full Set (5 món)",
        price: 1512000,
        priceFormatted: "1.512.000₫",
        includedSkus: ["TOP-02", "TOP-NECK", "ACC-TIE", "ACC-BAG03", "PANT-04"]
      },
      {
        id: "top-pant",
        name: "Áo Sơ mi + Quần",
        price: 1007000,
        priceFormatted: "1.007.000₫",
        includedSkus: ["TOP-02", "PANT-04"]
      },
      {
        id: "top-tie",
        name: "Áo Sơ mi + Cà vạt",
        price: 565000,
        priceFormatted: "565.000₫",
        includedSkus: ["TOP-02", "ACC-TIE"]
      },
      {
        id: "top-only",
        name: "Chỉ Áo Sơ mi Crop Poplin",
        price: 480000,
        priceFormatted: "480.000₫",
        includedSkus: ["TOP-02"]
      },
      {
        id: "pant-only",
        name: "Chỉ Quần ống suông kem",
        price: 527000,
        priceFormatted: "527.000₫",
        includedSkus: ["PANT-04"]
      },
      {
        id: "neck-only",
        name: "Chỉ Áo cổ lọ",
        price: 140000,
        priceFormatted: "140.000₫",
        includedSkus: ["TOP-NECK"]
      },
      {
        id: "tie-only",
        name: "Chỉ Cà vạt retro",
        price: 85000,
        priceFormatted: "85.000₫",
        includedSkus: ["ACC-TIE"]
      }
    ],
    items: [
      {
        sku: "TOP-02",
        type: "Sơ mi",
        name: "Sơ mi Crop Striped Poplin kem khoác ngoài",
        price: 480000,
        priceFormatted: "480.000₫",
        note: "Chất poplin cao cấp đứng form áo khoác"
      },
      {
        sku: "TOP-NECK",
        type: "Áo cổ lọ",
        name: "Áo thun cổ lọ trắng ôm gọn",
        price: 140000,
        priceFormatted: "140.000₫",
        note: "Mặc lót thanh lịch"
      },
      {
        sku: "ACC-TIE",
        type: "Cà vạt",
        name: "Cà vạt dệt đen phong cách retro (nới lỏng)",
        price: 85000,
        priceFormatted: "85.000₫",
        note: "Điểm nhấn preppy cổ điển học đường"
      },
      {
        sku: "ACC-BAG03",
        type: "Túi xách",
        name: "Túi xách thể thao xanh phối nâu",
        price: 280000,
        priceFormatted: "280.000₫",
        note: "Phối màu cá tính năng động"
      },
      {
        sku: "PANT-04",
        type: "Quần rộng",
        name: "Quần rộng ống suông xếp ly kem",
        price: 527000,
        priceFormatted: "527.000₫",
        note: "Form âu đứng tôn chiều cao"
      }
    ]
  },
  {
    id: "combo-5",
    title: "Combo 5: Art-Garde Minimalist",
    styleName: "Tối giản & Độc đáo",
    image: "/combos/combo-5.jpg",
    description: "Áo sơ mi xanh than cổ tàu (thắt chéo vạt) + Blazer xám khoác hờ + Quần đen ống rộng + Túi đen.",
    sizes: [
      "S (xanh than)", "M (xanh than)", "L (xanh than)", "XL (xanh than)",
      "S (xám sọc)", "M (xám sọc)", "L (xám sọc)", "XL (xám sọc)",
      "S (đen tuyền)", "M (đen tuyền)", "L (đen tuyền)", "XL (đen tuyền)"
    ],
    options: [
      {
        id: "full-set",
        name: "Trọn bộ Full Set (4 món)",
        price: 1741000,
        priceFormatted: "1.741.000₫",
        includedSkus: ["OUTER-01", "TOP-ORIENT", "PANT-02", "ACC-BAG01"]
      },
      {
        id: "top-pant",
        name: "Áo Sơ mi + Quần",
        price: 841000,
        priceFormatted: "841.000₫",
        includedSkus: ["TOP-ORIENT", "PANT-02"]
      },
      {
        id: "blazer-pant",
        name: "Áo Blazer + Quần",
        price: 1101000,
        priceFormatted: "1.101.000₫",
        includedSkus: ["OUTER-01", "PANT-02"]
      },
      {
        id: "blazer-top",
        name: "Áo Blazer + Áo Sơ mi",
        price: 1040000,
        priceFormatted: "1.040.000₫",
        includedSkus: ["OUTER-01", "TOP-ORIENT"]
      },
      {
        id: "top-only",
        name: "Chỉ Áo Sơ mi cổ tàu",
        price: 390000,
        priceFormatted: "390.000₫",
        includedSkus: ["TOP-ORIENT"]
      },
      {
        id: "blazer-only",
        name: "Chỉ Áo Blazer Cropped",
        price: 650000,
        priceFormatted: "650.000₫",
        includedSkus: ["OUTER-01"]
      },
      {
        id: "pant-only",
        name: "Chỉ Quần âu",
        price: 451000,
        priceFormatted: "451.000₫",
        includedSkus: ["PANT-02"]
      },
      {
        id: "bag-only",
        name: "Chỉ Túi xách da",
        price: 250000,
        priceFormatted: "250.000₫",
        includedSkus: ["ACC-BAG01"]
      }
    ],
    items: [
      {
        sku: "OUTER-01",
        type: "Blazer",
        name: "Áo Blazer Cropped xám khoác hờ",
        price: 650000,
        priceFormatted: "650.000₫",
        note: "Tone xám sọc nhẹ (Lựa chọn khác: Blazer form rộng Basic - 590.000₫)"
      },
      {
        sku: "TOP-ORIENT",
        type: "Sơ mi",
        name: "Sơ mi xanh than cổ tàu thắt chéo vạt",
        price: 390000,
        priceFormatted: "390.000₫",
        note: "Thiết kế vạt chéo nghệ thuật đương đại"
      },
      {
        sku: "PANT-02",
        type: "Quần âu",
        name: "Quần âu Wide Leg đen ống suông",
        price: 451000,
        priceFormatted: "451.000₫",
        note: "Vải rủ cao cấp (Lựa chọn khác: Quần rộng Hollis đen - 456.000₫)"
      },
      {
        sku: "ACC-BAG01",
        type: "Túi xách",
        name: "Túi xách tay da đen sang trọng",
        price: 250000,
        priceFormatted: "250.000₫",
        note: "Da PU lì mềm mại tối giản"
      }
    ]
  }
];

const accessorySkus = new Set(["ACC-BAG01", "ACC-BAG02", "ACC-TECH", "ACC-BAG03", "ACC-GLASS", "ACC-TIE"]);

// Calculate total by summing every single clothing component and enrich items with db variants
export const curatedCombos: ComboLookData[] = rawCombos.map(c => {
  const sum = c.items.reduce((acc, item) => acc + item.price, 0);
  const enrichedItems = c.items.map(item => {
    const sku = item.sku || "";
    const id = `part-${sku.toLowerCase()}`;
    const isAcc = accessorySkus.has(sku);
    const sizes = isAcc ? ["F"] : ["S", "M", "L", "XL"];
    const variants = sizes.map(s => ({
      id: `${id}-${s}`,
      size: s,
      color: isAcc ? "Tiêu chuẩn" : "Màu theo mẫu",
      stock: 30
    }));
    return {
      ...item,
      id,
      variants
    };
  });
  return {
    ...c,
    items: enrichedItems,
    totalPrice: sum,
    estimatedPrice: sum.toLocaleString("vi-VN") + "₫"
  };
});
