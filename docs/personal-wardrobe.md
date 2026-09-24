# Tủ đồ cá nhân từ sản phẩm của shop

## Luồng đã triển khai

Người dùng đăng nhập, bấm trái tim trên catalog hoặc hộp chi tiết sản phẩm. Trạng thái đổi ngay bằng optimistic update, khóa thao tác trùng trên cùng sản phẩm, hoàn lại khi request lỗi. Dữ liệu được lưu theo tài khoản; reload/đăng nhập trên thiết bị khác vẫn thấy tủ đồ. Các tab trình duyệt đồng bộ qua BroadcastChannel và tải lại khi lấy focus.

Trang `/wardrobe` (cũng có ở `/#closet`) gồm tab **Đã lưu** và **Gợi ý phối đồ**. Danh sách có ảnh, tên, danh mục, các màu, style/tags, giá, trạng thái bán hàng, tìm kiếm không dấu, lọc màu/danh mục, sắp xếp và bỏ lưu. Gợi ý ghép ảnh từng món thành bộ, hiển thị màu được chọn, điểm quy tắc, lý do và tổng giá tham khảo. Nút **Tạo gợi ý mới** ưu tiên bộ chưa xuất hiện; nếu không còn bộ khác, thông báo rõ thay vì tạo món không có trong tủ.

Tủ đồ này là danh sách sản phẩm yêu thích, không khẳng định người dùng đã mua/sở hữu chúng. Các món thủ công từ phiên bản trước vẫn ở `/wardrobe/manual`, dùng API cũ `/api/v1/items`; chúng không được trộn vào nguồn gợi ý sản phẩm shop.

## Schema thực tế

Dự án dùng Prisma 6 + SQLite nên giữ nguyên provider để các chức năng thương mại hiện có tiếp tục chạy. Migration `20260922200000_product_wardrobe` thêm:

- `Product.tags`: JSON array, mặc định `[]`. Các trường `name/category/image/style` đã tồn tại; màu nằm trong `ProductVariant(color,colorHex,size,stock)`, tránh nhân bản theo từng người lưu.
- `UserWardrobe(userId,productId,createdAt)`: khóa chính ghép `(userId,productId)`, hai FK cascade, index `(userId,createdAt)` và `productId`.
- Favorites cũ của tài khoản được sao chép từ WishlistItem. Favorites khách cũ được nhập vào UserWardrobe khi đăng nhập. WardrobeItem thủ công giữ nguyên.

UserWardrobe chỉ lưu liên kết và thời điểm, GET join Product/variants nên metadata luôn là thông tin shop hiện tại. Một sản phẩm nhiều size/màu chỉ có một liên kết. GET loại trùng màu theo hex. Không nhận `userId`, giá, ảnh hoặc style từ trình duyệt khi bấm lưu.

Lược đồ PostgreSQL tương đương (dành cho chuyển đổi sau này, chưa thay database đang chạy):

```sql
CREATE TYPE wardrobe_category AS ENUM
  ('TOP','BOTTOM','SKIRT','DRESS','FOOTWEAR','OUTERWEAR','ACCESSORY');

-- app_user đại diện bảng tài khoản đã tồn tại.
CREATE TABLE product (
  id text PRIMARY KEY,
  name varchar(150) NOT NULL,
  category wardrobe_category NOT NULL,
  image_url text NOT NULL,
  style varchar(150) NOT NULL DEFAULT 'casual',
  tags jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(tags) = 'array'),
  price integer NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE product_variant (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  size text NOT NULL,
  color_name text NOT NULL,
  color_hex char(7) NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  stock integer NOT NULL CHECK (stock >= 0),
  UNIQUE(product_id, size, color_name)
);
CREATE TABLE user_wardrobe (
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, product_id)
);
CREATE INDEX wardrobe_saved_idx ON user_wardrobe(user_id, created_at DESC);
CREATE INDEX wardrobe_product_idx ON user_wardrobe(product_id);
CREATE INDEX product_category_idx ON product(category);
CREATE INDEX product_color_idx ON product_variant(color_hex, product_id);
CREATE INDEX product_tags_idx ON product USING gin(tags);
```

API gom variants thành `colors: [{name,hex}]`, đồng thời đổi tên `image` thành `imageUrl` cho DTO. Bộ giá trị category mới cũng được bổ sung vào validation tạo sản phẩm, bộ lọc catalog và form quản trị. Form quản trị có trường tags cách nhau dấu phẩy.

## REST API

Tất cả endpoint dưới đây yêu cầu cookie đăng nhập HttpOnly. Server lấy userId từ phiên xác thực. Không dùng guest session cho tủ sản phẩm mới.

| Method | URL | Kết quả |
| --- | --- | --- |
| POST | `/api/wardrobe/toggle` | `{productId,saved,item}` |
| GET | `/api/wardrobe` | `{items,total,savedCount}` |
| DELETE | `/api/wardrobe/:productId` | `{ok:true,productId,saved:false}` |
| GET | `/api/wardrobe/recommendations` | `{engine,seed,outfits,message,missing,eligibleCount,candidateCount}` |

POST body `{ "productId": "top-3" }` bật/tắt theo trạng thái hiện tại. Body `{ "productId": "top-3", "saved": true }` đặt trạng thái đích, idempotent khi retry. `saved:false` cũng được hỗ trợ. UI dùng trạng thái đích khi thêm, DELETE khi bỏ lưu để tránh vô tình đảo trạng thái do gửi lại request.

GET filters: `q`, `category`, `color` (hex hoặc tên chuẩn), `sort=newest|oldest|name|price_asc|price_desc`. Kết hợp AND, mặc định mới lưu nhất; ví dụ `/api/wardrobe?category=TOP&color=%23ffffff&sort=price_asc`. Tìm kiếm không phân biệt dấu/hoa thường. Giới hạn tạo 200 liên kết/tài khoản; dữ liệu favorites cũ vượt hạn mức vẫn được giữ. Với quy mô này lọc/sort trong bộ nhớ sau khi query theo userId là đủ; tăng quy mô cần chuyển filters vào SQL, thêm cursor và index tìm kiếm tên.

Ví dụ item:

```json
{
  "productId": "top-3",
  "createdAt": "2026-09-22T10:00:00.000Z",
  "product": {
    "id": "top-3",
    "name": "Áo phông trắng",
    "category": "TOP",
    "imageUrl": "https://example.com/shirt.jpg",
    "style": "casual beach",
    "styles": ["casual"],
    "tags": ["cotton", "summer"],
    "colors": [{"name":"Trắng","hex":"#ffffff"}],
    "price": 350000,
    "active": true,
    "inStock": true,
    "isCombo": false
  }
}
```

Recommendations query: `limit=1..6` (mặc định 4), `random=true|false`, `seed` dài tối đa 100 ký tự, `exclude` là tối đa 6 outfit ID cách nhau dấu phẩy, URL-encode bằng URLSearchParams. Cùng input + seed cho kết quả xác định. Random dùng seed mới và ưu tiên bỏ qua các bộ đang hiển thị, nhưng không đảm bảo bộ mới nếu không có lựa chọn khác.

Lỗi chuẩn `{error:{code,message,details?}}`: 401 chưa đăng nhập, 403 nguồn ghi không hợp lệ, 400 validation/quota, 404 thêm sản phẩm không tồn tại/ngừng bán, 405 đường dẫn/phương thức không hợp lệ, 413 body quá giới hạn, 500 lỗi nội bộ. DELETE idempotent và chỉ xóa liên kết của user hiện tại. GET dùng no-store để dữ liệu cá nhân không vào cache dùng chung. Unique constraint + transaction bảo vệ tạo liên kết; retry có giới hạn cho lỗi xung đột giao dịch/unique.

## Thuật toán Mix & Match

Code có chú thích tại `lib/server/wardrobe-engine.ts`, tách khỏi database để kiểm thử độc lập.

1. **Ứng viên:** chỉ các sản phẩm trong tủ của tài khoản gọi API. Bỏ sản phẩm ngừng bán, combo đã xuất bản từ Combo Studio, món không có màu hex hợp lệ. Hết tồn kho vẫn được gợi ý tham khảo và có nhãn hết hàng; đây không phải xác nhận mua được size/màu đang gợi ý.
2. **Nhóm bắt buộc:** `TOP + (BOTTOM|SKIRT) + FOOTWEAR`, hoặc `DRESS + FOOTWEAR`. Thiếu nhóm thì trả `outfits:[]` và danh sách cần bổ sung. Không tự lấy sản phẩm ngoài tủ. Váy liền có thể kèm áo khoác nếu tương thích.
3. **Phong cách:** chuẩn hóa token, ví dụ office/elegant/party → formal, beach → casual. Cùng style đạt 1; cặp đã cho phép như casual/streetwear hoặc formal/minimal đạt 0.75. Metadata thiếu đạt 0.5 và có giải thích. Xung đột (ví dụ formal với sporty) loại cả bộ, không bù bằng điểm màu.
4. **Màu:** chuyển hex sang HSL. Đen/trắng/xám và màu đất dịu được xem là trung tính, đạt 0.95. Chênh hue trên vòng màu ≤35° là tương đồng, đạt 0.9; ≥150° là bổ túc, đạt 0.85; còn lại đạt 0.35. Trung bình màu của các cặp phải ≥0.65. Mỗi sản phẩm xét tối đa 3 màu thật, giữ cách gán màu có điểm cao nhất; không tạo màu giả.
5. **Điểm:** `round(100 * (0.6 * meanColorScore + 0.4 * meanStyleScore))`. Đây là điểm heuristic, không phải xác suất AI hay cam kết thẩm mỹ.
6. **Món thêm:** thử tối đa một áo khoác và một phụ kiện. Toàn bộ bộ mới phải qua validation phong cách/màu và không giảm quá 5 điểm so với bộ gốc.
7. **Đa dạng:** loại trùng theo tập ID đã sắp xếp. Random dùng jitter tối đa 12 điểm để thay thứ tự giữa các bộ hợp lệ; phạt lặp món 3 điểm/lần xuất hiện để tránh toàn bộ kết quả dùng một áo. Loại `exclude` nếu có lựa chọn mới; nếu không, trả lựa chọn hiện có và lời giải thích.

Giới hạn mỗi nhóm chính 12 sản phẩm và mỗi món 3 màu: tối đa 12³ bộ áo/quần/giày, mỗi bộ tối đa 3³ cách màu. Chế độ random lấy mẫu nhóm bằng shuffle có seed; mặc định chọn thứ tự ID ổn định. Đây là tìm kiếm bị giới hạn, không cam kết xét toàn bộ tổ hợp ở tủ lớn. `candidateCount` là số bộ hợp lệ trong lần tìm kiếm, không phải tổng tuyệt đối của mọi tổ hợp.

Ảnh dùng ảnh chung từ Product; màu được đề xuất ghi rõ dưới từng món vì shop chưa có ảnh riêng từng màu. Không gọi AI, không tải ảnh ở backend. Khi mở rộng có thể thêm ảnh theo variant, thời tiết/dịp, sở thích màu, feedback thích/không thích và ranking model; vẫn giữ kiểm tra owner, nhóm bắt buộc và ID hợp lệ ở server.

## Frontend và kiểm tra

- `WardrobeProvider.tsx`: state dùng chung, fetch có phiên, optimistic update/rollback theo từng productId, tránh stale fetch ghi đè mutation, đồng bộ nhiều tab.
- `AddToWardrobeButton.tsx`: tái sử dụng cho catalog và modal, trái tim luôn nhìn thấy trên mobile, aria-pressed/busy, lỗi và CTA đăng nhập.
- `PersonalWardrobe.tsx`: hai tab truy cập được bằng bàn phím, filters/sort, thẻ sản phẩm và outfit, request gợi ý có AbortController để kết quả cũ không đè kết quả mới.
- `/wardrobe/page.tsx`: trang riêng; `app/page.tsx` nhúng cùng component.

Chạy `npx prisma generate`, `npx prisma migrate deploy`, `npm run dev`. Trên Windows cần dừng dev server trước generate nếu DLL Prisma bị khóa. Kiểm tra backend/engine bằng `npm test`, build bằng `npm run build`. Browser test `node tests/personal-wardrobe-browser.mjs` cần Playwright và server local; hỗ trợ biến `PLAYWRIGHT_MODULE`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, `WARDROBE_TEST_ORIGIN`. Test tạo tài khoản riêng, kiểm tra optimistic rollback/đồng bộ/filter/outfit/mobile rồi xóa đúng tài khoản kiểm thử. Browser test tủ thủ công cũ vẫn ở `tests/wardrobe-browser.mjs`.
