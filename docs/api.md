# API v1

Base URL: `/api/v1`. Tất cả phản hồi là JSON, `Cache-Control: no-store` cho phản hồi thành công. Endpoint tạo dữ liệu hiện trả HTTP 200; ngoại lệ thử đồ chưa tích hợp trả 503.

Phiên khách: server trả cookie `fitcraft_session`. Trình duyệt giữ cookie tự động. Client ngoài trình duyệt cần lưu/gửi cookie; gọi GET /cart trước những yêu cầu song song để tạo cùng một phiên. API không tin sessionId hoặc userId gửi trong JSON.

Quản trị: `Authorization: Bearer <ADMIN_API_KEY>`. Nếu chưa cấu hình khóa đủ dài, trả 503; sai khóa trả 401. Không dùng khóa này trong giao diện công khai.

## Tài khoản

| Method | Path | Input / Output |
| --- | --- | --- |
| GET | /auth/me | Trả user hiện tại, gồm role, hoặc null |
| POST | /auth/register | name, email, password; tạo tài khoản và đăng nhập |
| POST | /auth/login | email, password; nhập dữ liệu phiên khách vào tài khoản |
| POST | /auth/logout | Thu hồi phiên đăng nhập và xóa cookie |
| POST | /auth/forgot-password | email; luôn trả thông báo chung để tránh dò tài khoản |
| POST | /auth/reset-password | token và password mới; token hết hạn sau 20 phút, dùng một lần |

Mật khẩu dài 8–128 ký tự và được băm bằng scrypt với salt riêng. Cookie đăng nhập là HttpOnly, SameSite=Lax, Secure trong production; token thô không được lưu trong database. Tối đa 10 phiên đăng nhập còn hiệu lực trên mỗi tài khoản. Đổi mật khẩu thu hồi toàn bộ phiên cũ. Rate limit trong bộ nhớ hiện phù hợp một tiến trình; khi triển khai nhiều instance cần chuyển sang Redis hoặc lớp gateway.

Lỗi:

```json
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Không đủ tồn kho cho sản phẩm." } }
```

400: dữ liệu sai; 401/403: quyền hoặc origin; 404: không có hoặc không thuộc phiên; 409: xung đột nghiệp vụ; 413: body quá 64 KB; 503: dịch vụ chưa cấu hình.

## Danh mục và dịch vụ thời trang

| Method | Path | Input / Output |
| --- | --- | --- |
| GET | /products | q, category, size, color, minPrice, maxPrice, inStock=true/false, sort=newest/price_asc/price_desc, page, limit (1–100); trả products + pagination |
| GET | /products/:idOrSlug | product gồm variants và sizeGuide; sản phẩm ngừng bán trả 404 |
| GET | /policies | Phí giao hàng, ngưỡng miễn phí, thời hạn trả và phương thức thanh toán mẫu |
| POST | /size-advice | productId, chest/waist/hip theo cm; ít nhất một số đo; trả matches, sizeGuide, note |
| POST | /stylist/chat | message, budget?, size?, occasion? (office/casual/party/beach); trả outfit, alternatives, total, rationale và engine=catalog-rules |
| POST | /api/outfits/recommend | Endpoint AI Stylist mới (không dùng base `/api/v1`): request, numberOfOutfits (1–3), context và preferred/excluded IDs; trả resolved outfits, giá hiện tại, variants còn hàng và metadata engine |
| POST | /try-on/generate | modelImage, garmentImage, category (tops/bottoms/one-pieces/all), mode; hỗ trợ Fashn.ai, Replicate IDM-VTON, Mock; trả status, imageUrl, provider. Khi chưa cấu hình key trả 503 TRYON_NOT_CONFIGURED |
| GET | /health | Kiểm tra tình trạng kết nối Database, uptime và latency hệ thống phục vụ giám sát môi trường production |

Category: TOP, BOTTOM, OUTERWEAR, FOOTWEAR, ACCESSORY. Giá là số nguyên VND. Bảng size seed chỉ minh họa. Stylist xét tối đa 200 sản phẩm phù hợp, chọn bộ áo/quần trong ngân sách và thêm phụ kiện nếu đủ tiền; không dùng hay tuyên bố đã phân tích ảnh cơ thể.

## Giỏ hàng, đơn và trả hàng (theo phiên)

| Method | Path | Input / Output |
| --- | --- | --- |
| GET | /cart | items, subtotal, shippingFee, total |
| POST | /cart/items | items: [{variantId, quantity}]; cộng số lượng và kiểm tra tồn kho |
| PATCH | /cart/items/:id | quantity 0–20; 0 để xóa |
| DELETE | /cart/items/:id | Xóa dòng giỏ thuộc phiên |
| POST | /orders | Header Idempotency-Key 16–100 ký tự; thông tin người nhận; trả order |
| GET | /orders | Tối đa 50 đơn gần nhất thuộc phiên |
| GET | /orders/:id | Đơn, dòng hàng, sự kiện và yêu cầu trả thuộc phiên |
| POST | /orders/:id/cancel | Chỉ đơn PENDING; hoàn kho đúng một lần |
| POST | /orders/:id/returns | orderItemId, quantity, reason (10–1000 ký tự) |

Ví dụ thêm giỏ:

```json
{ "items": [{ "variantId": "top-1-M", "quantity": 1 }] }
```

Ví dụ checkout, với header `Idempotency-Key: unique-checkout-attempt-001`:

```json
{
  "customerName": "Nguyễn An",
  "phone": "0901234567",
  "address": "123 Đường Mẫu, Phường Mẫu",
  "city": "Hồ Chí Minh",
  "note": "Gọi trước khi giao",
  "paymentMethod": "COD"
}
```

Không gửi giá hoặc total. Server đọc giá hiện tại khi checkout; nếu giá thay đổi giữa lúc xem giỏ và đặt, server dùng giá mới. Muốn yêu cầu khách xác nhận mọi thay đổi giá, giai đoạn tiếp theo cần checkout quote có phiên bản/thời hạn. Mỗi variant tối đa 20 món; giỏ tối đa 100 dòng; đơn không vượt 2 tỷ VND.

## Tủ đồ và lưu phong cách (theo phiên)

**Tủ đồ sản phẩm mới (theo tài khoản):** `GET /api/wardrobe`, `POST /api/wardrobe/toggle`, `DELETE /api/wardrobe/:productId`, `GET /api/wardrobe/recommendations`. Những URL này không có tiền tố `/v1`; bắt buộc đăng nhập. Xem [payload, bộ lọc và thuật toán](personal-wardrobe.md). Các endpoint trong bảng dưới giữ tương thích với tủ nhập thủ công và dữ liệu cũ.

| Method | Path | Input / Output |
| --- | --- | --- |
| GET / POST | /wishlist | GET items; POST {productId}, idempotent theo cặp phiên/sản phẩm |
| DELETE | /wishlist/:productId | Xóa khỏi yêu thích |
| GET / POST | /items (alias /wardrobe, /wardrobe/items) | GET {items,total,limit}; POST {name,category,color,imageUrl,season?,style?,occasion?}, trả 201 |
| DELETE | /items/:id (alias /wardrobe/:id, /wardrobe/items/:id) | Chỉ xóa dữ liệu của phiên; 404 nếu không tồn tại/không thuộc phiên |
| GET / POST | /outfits | GET outfits; POST {name, productIds: [...]} |
| DELETE | /outfits/:id | Chỉ xóa dữ liệu của phiên |

Ảnh phải là HTTPS URL, tối đa 2.048 ký tự. API không tải URL này ở server và không có chức năng nhận diện ảnh. Không gửi data URL, blob URL hoặc file multipart. Cần thêm upload riêng tư trước khi dùng ảnh cá nhân trong sản phẩm thực tế. Giới hạn MVP: 200 wishlist, 200 món tủ đồ, 100 bộ phối mỗi phiên; chưa có rate limit phân tán.

## Quản trị

Mọi endpoint dưới đây yêu cầu cookie của tài khoản có `role=ADMIN`, hoặc Bearer `ADMIN_API_KEY` cho script nội bộ. Tài khoản đã đăng nhập nhưng không có quyền nhận 403; khách chưa đăng nhập nhận 401.

| Method | Path | Input / Output |
| --- | --- | --- |
| GET | /admin/dashboard | Thống kê sản phẩm, tồn thấp, người dùng, đơn, đổi trả và doanh thu đơn đã giao |
| GET | /admin/products | q, page; gồm cả sản phẩm đã ẩn và variants |
| POST | /admin/products | Tạo sản phẩm và SKU |
| PATCH | /admin/products/:id | price? và active?; không xóa SKU đã có lịch sử |
| PATCH | /admin/variants/:id | {stock, expectedStock}; chặn ghi đè nếu tồn đã thay đổi |
| GET | /admin/orders?page=1&status= | 50 đơn/trang kèm items/events/returns |
| PATCH | /admin/orders/:id | status: CONFIRMED/SHIPPED/DELIVERED/CANCELLED; SHIPPED cần carrier và trackingNumber |
| GET | /admin/returns?status= | Tối đa 100 yêu cầu đổi trả gần nhất |
| PATCH | /admin/returns/:id | status: APPROVED/REJECTED/RECEIVED |
| GET | /admin/users?page=1&q= | Danh sách người dùng, không trả passwordHash |
| PATCH | /admin/users/:id | role: CUSTOMER/ADMIN; không thể hạ quyền admin cuối cùng |

Ví dụ sản phẩm:

```json
{
  "name": "Áo sơ mi linen",
  "brand": "Shop của bạn",
  "category": "TOP",
  "price": 490000,
  "image": "https://example.com/linen.jpg",
  "description": "Mô tả sản phẩm",
  "material": "100% linen",
  "care": "Theo hướng dẫn trên nhãn sản phẩm",
  "style": "office casual",
  "variants": [
    { "size": "M", "color": "Trắng", "colorHex": "#FFFFFF", "stock": 15 },
    { "size": "L", "color": "Trắng", "colorHex": "#FFFFFF", "stock": 10 }
  ]
}
```

Bảng size hiện được quản lý ở database/seed; chưa có endpoint quản trị sizeGuide. Các trường không được khai báo trong input bị từ chối. Giá 1.000–100.000.000 VND; tồn mỗi SKU 0–100.000. SKU và slug được server sinh.

Quản trị trả hàng chưa thực hiện chuyển tiền hay tự nhập kho. RECEIVED là đã nhận hàng trả để kiểm định/đối soát thủ công.
