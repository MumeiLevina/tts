# Tủ đồ số

Giao diện thủ công được giữ tại `/wardrobe/manual`: thêm món, lưới ảnh, tìm tên không dấu, lọc danh mục/màu và dialog xác nhận xóa. Luồng chính mới dùng sản phẩm shop tại `/wardrobe` và `/#closet`, xem [Tủ đồ cá nhân](personal-wardrobe.md). React + CSS Modules thống nhất với ứng dụng Next.js hiện có. Có placeholder ảnh lỗi, trạng thái tải/lưu/xóa, lỗi mạng và nút thử lại.

## Cấu trúc

- `lib/wardrobe.ts`: danh mục, bảng màu, mã tag, kiểu dữ liệu và chuẩn hóa dùng chung.
- `lib/server/wardrobe.ts`: Zod validation, quyền sở hữu, truy vấn và transaction.
- `app/api/v1/[...path]/route.ts`: REST routes, middleware phiên và kiểm tra origin.
- `app/components/DigitalWardrobe.tsx`: giao diện tủ thủ công, gắn vào `/wardrobe/manual`.
- `prisma/schema.prisma`: `WardrobeItem`, `WardrobeTag`.
- `tests/backend.test.ts`: validation, bộ lọc, cô lập phiên, tag cascade, quota.

Áp dụng database hiện có: `npx prisma generate`, `npx prisma migrate deploy`. Nếu Windows khóa DLL của Prisma, dừng dev server dự án, chạy lại hai lệnh rồi `npm run dev`. Migration thêm cột/bảng/chỉ mục và sao chép bảng để đặt mặc định thời gian đúng trên SQLite, giữ nguyên món cũ và ID. Database thực tế tiếp tục dùng SQLite để tương thích phần còn lại của ứng dụng.

Kiểm tra bằng `npm test`, `npm run build`. Browser smoke test: cài Playwright ở môi trường kiểm thử, khởi động dev server rồi chạy `node tests/wardrobe-browser.mjs`. Có thể trỏ package Playwright ngoài dự án bằng `PLAYWRIGHT_MODULE`, executable Chromium bằng `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, origin bằng `WARDROBE_TEST_ORIGIN`. Test tạo context trình duyệt riêng, kiểm tra CRUD/bộ lọc/lỗi/mobile, dọn đúng những món do nó tạo.

## Data schema

`WardrobeItem`: `id`, `sessionId`, `name`, `searchName`, `category`, `color`, `imageUrl`, `createdAt`, `updatedAt`. `sessionId` liên kết phiên hiện có; phiên tài khoản được tái sử dụng qua đăng nhập. Middleware lấy chủ sở hữu từ cookie HttpOnly, không nhận owner từ request body.

`WardrobeTag(itemId, kind, value)` lưu nhiều mùa/phong cách/dịp cho một món. Khóa chính ghép ngăn trùng tag; khóa ngoại cascade dọn tag khi xóa món; chỉ mục `(kind,value,itemId)` hỗ trợ lọc ứng viên gợi ý. Món đồ có chỉ mục `(sessionId,category,createdAt)` và `(sessionId,color,createdAt)`.

Màu chuẩn hóa hex 6 ký tự viết thường, chấp nhận tên tiếng Việt trong bảng màu và hex 3 ký tự. Tag dùng mã ổn định; nhãn tiếng Việt ở giao diện. Các enum được validation tại API vì schema SQLite dùng String.

Lược đồ PostgreSQL tương đương khi chuyển database (thiết kế, chưa chạy trên PostgreSQL):

```sql
CREATE TYPE wardrobe_category AS ENUM
  ('TOP', 'BOTTOM', 'SKIRT', 'DRESS', 'FOOTWEAR', 'ACCESSORY', 'OUTERWEAR');
CREATE TYPE wardrobe_tag_kind AS ENUM ('season', 'style', 'occasion');

-- Chuyển bảng "Session" hiện có sang PostgreSQL cùng ứng dụng.
CREATE TABLE wardrobe_items (
  id text PRIMARY KEY, -- cuid do ứng dụng sinh
  session_id text NOT NULL REFERENCES "Session"(id) ON DELETE CASCADE,
  name varchar(150) NOT NULL CHECK (length(trim(name)) > 0),
  search_name text NOT NULL,
  category wardrobe_category NOT NULL,
  color char(7) NOT NULL CHECK (color ~ '^#[0-9a-f]{6}$'),
  image_url varchar(2048) NOT NULL CHECK (image_url LIKE 'https://%'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE wardrobe_tags (
  item_id text NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE,
  kind wardrobe_tag_kind NOT NULL,
  value varchar(32) NOT NULL,
  PRIMARY KEY (item_id, kind, value)
);
CREATE INDEX wardrobe_category_idx ON wardrobe_items(session_id, category, created_at DESC);
CREATE INDEX wardrobe_color_idx ON wardrobe_items(session_id, color, created_at DESC);
CREATE INDEX wardrobe_tag_lookup_idx ON wardrobe_tags(kind, value, item_id);
```

Prisma cập nhật `updatedAt` khi ghi; SQL trực tiếp cần tự cập nhật hoặc thêm trigger. Với tủ lớn: thêm cursor `(createdAt,id)`, backfill `searchName` bằng `normalizeSearch`, dùng `pg_trgm`/GIN để tìm tên chứa chuỗi. Hiện tối đa 200 món: API lọc category/tag trong DB, lọc tên/màu trong bộ nhớ để hỗ trợ dữ liệu cũ chưa chuẩn hóa; UI lọc tức thì trên danh sách đã tải.

## REST API

Base URL `/api/v1`. `/wardrobe/items` và `/wardrobe` là alias của `/items`.

| Method | Path | Kết quả |
| --- | --- | --- |
| GET | `/items?q=ao&category=TOP&color=%23ffffff&season=SUMMER&style=MINIMAL&occasion=WORK` | 200 `{ items: [...], total, limit: 200 }` |
| POST | `/items` | 201 `{ item: {...} }` |
| DELETE | `/items/:id` | 200 `{ ok: true }`; 404 khi không tồn tại/không thuộc phiên |

Bộ lọc tùy chọn, kết hợp AND. `q` không phân biệt dấu/hoa thường. URL-encode dấu `#` trong màu. Không trả `sessionId`. Lỗi có dạng `{ error: { code, message, details? } }`: 400 validation/quota, 403 origin, 404 không tìm thấy, 413 body >64 KB, 500 lỗi nội bộ.

POST ví dụ:

```json
{
  "name": "Áo sơ mi linen trắng",
  "category": "TOP",
  "color": "#ffffff",
  "imageUrl": "https://example.com/linen-shirt.jpg",
  "season": ["SUMMER", "SPRING"],
  "style": ["MINIMAL", "ELEGANT"],
  "occasion": ["WORK", "DATE"]
}
```

Tên bắt buộc, trim, 1–150 ký tự; danh mục/màu bắt buộc; ảnh HTTPS tối đa 2048 ký tự. Mỗi mảng tag tối đa 8 phần tử, tự loại trùng, mặc định `[]`. Mã hợp lệ ở `lib/wardrobe.ts`. Từ chối trường lạ. Quota 200 món/phiên được kiểm tra trong cùng transaction tạo món/tag.

Triển khai chọn URL ảnh theo yêu cầu; chưa có upload file/nhận diện ảnh. Trình duyệt tải ảnh trực tiếp, server không fetch URL. Tủ khách phụ thuộc cookie 30 ngày; mất cookie sẽ không truy cập lại được tủ khách. Luồng đăng nhập hiện có chuyển tủ khách vào tài khoản.

## Kiến trúc gợi ý phối đồ giai đoạn sau

Tách service gợi ý khỏi CRUD. Input dự kiến `{ season, occasion, preferredStyle, limit }`; luôn lấy món thuộc phiên đã xác thực.

1. Lọc mùa (`ALL_SEASON` dùng quanh năm), dịp, phong cách. Tag rỗng là chưa biết: cho phép nhưng giảm độ tin cậy.
2. Ghép `TOP + (BOTTOM hoặc SKIRT) + FOOTWEAR`, hoặc `DRESS + FOOTWEAR`. Thêm áo khoác/phụ kiện nếu phù hợp. Thiếu nhóm bắt buộc thì trả lý do, không tạo món ảo.
3. Chấm màu qua HSL: trung tính (saturation <0.12), tương đồng (chênh hue <=35°), bổ túc (chênh hue >=150°, với khoảng cách vòng màu trong [0,180]). Đây là heuristic để thử nghiệm.
4. Điểm ví dụ `0.4*colorHarmony + 0.25*occasionMatch + 0.2*styleMatch + 0.15*seasonMatch`, từng thành phần [0,1]. Trả lý do kèm điểm.
5. Lấy top K, loại bộ trùng theo các ID sắp xếp, giới hạn bộ dùng cùng món để tăng đa dạng. Cắt ứng viên mỗi nhóm (ví dụ 20) trước khi ghép để tránh tổ hợp quá lớn.

```ts
type WardrobeRecommendation = {
  itemIds: string[];
  score: number;
  reasons: string[];
  engine: "rules-v1" | "ai-v1";
};
```

Khi lưu bộ phối, thêm `WardrobeOutfit` và bảng nối `WardrobeOutfitItem(outfitId,itemId,slot)` có khóa ngoại, cùng `sessionId` ở bộ phối. Kiểm tra mọi món cùng owner trong transaction. Khi xóa món, xóa liên kết và đánh dấu bộ phối thiếu món. Không dùng `Outfit.productIds` hiện có vì nó tham chiếu sản phẩm bán hàng.

AI chỉ chọn/xếp hạng ID trong tập ứng viên; server validation lại ID, owner và slot. Đây là thiết kế cho giai đoạn tiếp theo, chưa bật gợi ý trên giao diện.
