# Ảnh sản phẩm mẫu cho canvas

10 ảnh chụp riêng sản phẩm từ UNIQLO và Everlane, lưu nguyên bản trong `public/sample-products/`. Ảnh có nền sáng, chưa tách nền trong suốt. Từng trang sản phẩm, URL ảnh và thời điểm tải nằm trong `public/sample-products/sources.json`.

Chạy `npm run db:seed:canvas` để thêm vào database mà ứng dụng đang dùng (`.env.local` được ưu tiên như Next.js). Script chỉ tạo các ID `canvas-sample-*` còn thiếu, không ghi đè sản phẩm hiện có. Không tự chạy cùng seed/build production.

Trong danh sách sản phẩm, tìm `Mẫu canvas`, chọn món và thử phối trong phòng thử đồ hoặc AI Stylist. Có 3 áo, 2 quần, 1 blazer, 1 váy liền, 2 túi và 1 giày. Giá, size, màu mô tả và tồn kho là dữ liệu test; không phải thông tin bán hàng của hãng.

Ảnh được phục vụ cùng origin với ứng dụng để canvas không phụ thuộc CORS/hotlink của website nguồn. `transparentImageUrl` để trống vì ảnh gốc chưa tách nền.

Trước production, thay ảnh và metadata của các sản phẩm mẫu hoặc ngừng kích hoạt chúng, rồi bỏ thư mục ảnh mẫu nếu không còn được tham chiếu. Danh sách ID đầy đủ nằm trong manifest; tag `canvas-sample` giúp nhận diện chúng.
