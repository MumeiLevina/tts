# Trợ lý phối combo cho chủ shop

Mở `/admin?tab=studio` sau khi đăng nhập quản trị, hoặc chọn **Trợ lý phối combo** trong menu.

## Cách sử dụng

1. Tải lên ảnh riêng của từng món: áo, quần/váy, áo khoác, giày, phụ kiện. Có thể chọn nhiều ảnh cùng lượt, tối đa 12 ảnh. Mỗi ảnh JPG, PNG hoặc WebP, tối đa 5 MB.
2. Với mỗi ảnh, xác nhận tên món, loại, màu, giá lẻ, các size và tồn kho mỗi size. Chọn **Lưu món vào thư viện**. Dùng size `F` cho phụ kiện một kích cỡ dùng chung. Những món này mặc định chưa bán lẻ trên gian hàng.
3. Chọn từ 2 đến 12 món trong thư viện, nhập yêu cầu và ngân sách tối đa của một bộ. Ví dụ: “Phối công sở thanh lịch, áo xanh với quần trung tính, tổng giá dưới 1 triệu”.
4. Chọn **Gợi ý combo với AI**. Trợ lý xem ảnh, thông tin món và yêu cầu, đề xuất tối đa 3 bộ, mỗi bộ 2–6 món. Mỗi bộ phải có áo và quần/váy, có size chung còn hàng, tổng giá lẻ không vượt ngân sách. Bản nháp gồm tên, mô tả, giải thích phối đồ, danh sách món và ảnh tổng hợp.
5. Mở bản nháp, chỉnh tên/mô tả/giá combo. Chọn số bộ mở bán theo từng size rồi bấm **Mở bán**. Có thể chỉ lưu bản nháp để chỉnh tiếp.
6. Combo đã mở bán xuất hiện trong danh mục sản phẩm trên trang chủ, mở được phần chi tiết và mua qua giỏ hàng/checkout hiện có. Trong chi tiết combo, khách có thể chọn size từng món và bấm **Mua lẻ** để thêm đúng biến thể món đó vào giỏ; nút mua ở đầu trang vẫn mua nguyên bộ.

Nếu AI chưa kết nối, vẫn có thể chọn 2–6 món rồi bấm **Tạo bản nháp từ các món đã chọn**. Chế độ này được ghi rõ là thủ công, không phân tích ảnh bằng AI.

## Kích hoạt AI

Thêm vào `.env` trên máy chủ:

```dotenv
OPENAI_API_KEY=your_server_side_key
OPENAI_STYLIST_MODEL=gpt-4.1-mini
```

Khởi động lại website sau khi sửa cấu hình. Khóa không được gửi xuống trình duyệt. Tài khoản API cần có quyền truy cập mô hình và hạn mức sử dụng. Nút gợi ý gửi ảnh và thông tin các món đã chọn đến OpenAI; giao diện thông báo việc này trước khi thao tác.

Tích hợp dùng [Responses API với ảnh đầu vào](https://developers.openai.com/api/docs/guides/images-vision) và [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Mô hình trả về ID các món, tên, mô tả và lý do phối. Server kiểm tra lại ID, size, tồn kho và ngân sách; không tin giá hay tồn kho do mô hình suy đoán. `store: false` được gửi trong yêu cầu. Không tự động đăng bán kết quả AI.

Môi trường phát triển lúc triển khai chưa có `OPENAI_API_KEY`. Tích hợp AI đã được kiểm thử với phản hồi nhà cung cấp giả lập; chưa thực hiện một lượt gợi ý với dịch vụ AI thật. Trạng thái “chưa kích hoạt” hiển thị rõ trong giao diện.

## Ảnh và lưu trữ

- Ảnh được giải mã, kiểm tra định dạng thật, giới hạn 25 triệu pixel, xoay theo hướng ảnh, thu nhỏ tối đa 1200 px và chuyển thành JPEG. Không nhận SVG hay ảnh động. Quá trình mã hóa lại không giữ metadata gốc.
- Ảnh từng món và ảnh tổng hợp lưu bền vững trong bảng `StudioImage` của database, không phụ thuộc thư mục upload tạm thời.
- Ảnh tổng hợp là bố cục các ảnh thật đặt cạnh nhau. Đây chưa phải tính năng sinh ảnh người mẫu mặc cả bộ, tách nền hoặc virtual try-on.
- Ảnh phục vụ bán hàng có URL đọc công khai dạng `/api/studio/images/<id>`; không tải ảnh riêng tư lên thư viện này.
- Sao lưu database bao gồm cả ảnh và bản nháp. Khi thư viện lớn, nên chuyển BLOB ảnh sang dịch vụ lưu trữ đối tượng, giữ nguyên quan hệ dữ liệu.

## Tồn kho combo

- Nguyên liệu phối đồ là sản phẩm có trạng thái ẩn và huy hiệu `Nguyên liệu combo`. Có thể điều chỉnh giá/tồn kho từng món tại mục **Sản phẩm**.
- Khi mở bán, server dành riêng 1 đơn vị của mỗi món cho mỗi bộ. Tồn món lẻ giảm, tồn combo tăng trong cùng một transaction.
- Các món thành phần được chuyển sang trạng thái có thể bán lẻ sau khi combo đầu tiên chứa chúng được mở bán. Tồn món lẻ và tồn nguyên liệu combo dùng chung, nên không thể mua vượt số còn lại.
- Ví dụ: mở 2 bộ size S và 3 bộ size M gồm áo + quần + túi F sẽ dành 2 áo S, 3 áo M, 2 quần S, 3 quần M và 5 túi F. Thiếu một thành phần thì toàn bộ thao tác được hoàn tác.
- Gửi lại yêu cầu mở bán cho cùng bản nháp trả về sản phẩm đã tạo, không tạo sản phẩm trùng hoặc trừ kho lần nữa. Bản nháp đã mở bán không sửa tiếp; dùng mục Sản phẩm để đổi giá/ẩn combo.
- Hủy đơn mua combo trả tồn về kho combo, không trả về kho nguyên liệu vì bộ đó vẫn được dành riêng để bán theo combo.
- Chưa có thao tác tháo combo để hoàn nguyên kho món lẻ. Ẩn sản phẩm combo không tự động hoàn kho nguyên liệu. Không tự tăng tồn combo vượt số bộ đã chuẩn bị.
- Hiện các món mặc dùng chung nhãn size (S/M/L...), phụ kiện F dùng chung. Phối bộ áo M + quần L, giày có hệ size riêng cần bổ sung ánh xạ biến thể trước khi hỗ trợ.

## API quản trị

Tất cả endpoint sau yêu cầu tài khoản ADMIN hoặc khóa quản trị đã cấu hình; các thao tác ghi kiểm tra nguồn yêu cầu theo hệ thống hiện có.

| Endpoint | Chức năng |
| --- | --- |
| `GET /api/v1/admin/combo-studio` | Thư viện, bản nháp, tồn khả dụng và trạng thái kết nối AI |
| `POST /api/v1/admin/combo-studio/items` | Upload multipart ảnh và thông tin món |
| `POST /api/v1/admin/combo-studio/generate` | Tạo gợi ý AI hoặc bản nháp thủ công |
| `PATCH /api/v1/admin/combo-studio/drafts/:id` | Chỉnh tên, mô tả, giá của bản nháp chưa mở bán |
| `POST /api/v1/admin/combo-studio/drafts/:id/publish` | Dành kho và mở bán combo theo số lượng từng size |

Migration: `20260922170000_combo_studio`. Chạy `npm run db:generate` và `npx prisma migrate deploy` khi cài trên môi trường khác.

## Kiểm tra

- `npm run typecheck` và `npm run build`.
- `npm test`: 22 bài kiểm thử, bao gồm upload/quyền truy cập, dữ liệu ảnh giả, ẩn nguyên liệu, lưu ảnh, ngân sách/size, dùng chung phụ kiện F, rollback, tranh tồn cuối, mở bán lặp, đặt/hủy đơn combo, dữ liệu AI và thiếu khóa.
- Kiểm thử AI dùng phản hồi mô phỏng để xác minh ảnh được gửi đúng định dạng, ID lạ bị từ chối, và không gọi dịch vụ bên ngoài trong bài test.
- Kiểm tra Chromium với database riêng: tải ba ảnh qua giao diện, lưu thư viện, tạo bản nháp thủ công, đổi giá, lưu, mở bán hai bộ size M, tải lại trang, mở chi tiết trên gian hàng và thêm đúng combo vào giỏ. Tồn áo, quần và túi được kiểm tra sau mở bán. Không thay đổi dữ liệu bán hàng của shop trong lượt kiểm thử trình duyệt.
- Đã kiểm tra giao diện 1440 px và 390 px, trạng thái AI chưa kết nối và không ghi nhận lỗi JavaScript trong lượt kiểm thử.

Ảnh kiểm thử giao diện: [Trang trợ lý](combo-studio/empty-desktop.png), [Bản nháp trên máy tính](combo-studio/draft-desktop.png), [Bản nháp trên điện thoại](combo-studio/draft-mobile.png). Ảnh mẫu trong lượt kiểm thử chỉ dùng để kiểm tra tải ảnh và mua hàng, không phải kết quả phân tích của AI.
