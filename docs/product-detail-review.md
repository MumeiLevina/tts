# Rà soát trải nghiệm mua quần áo FitCraft

Ngày kiểm tra: 22/09/2026. Website được mở và kiểm tra bằng Chromium tại http://localhost:3000.

## Vấn đề phát hiện

- Chi tiết combo cho chọn từng món và size nhưng callback mua hàng bỏ qua các lựa chọn, thêm nguyên combo với size mặc định. Backend hiện quản lý combo như một sản phẩm, chưa có quan hệ mua riêng từng món trong bộ.
- Cửa sổ cũ dùng ảnh nhỏ, nhiều khối thông tin và bảng chọn; nút mua dễ bị khuất khi cuộn. Bố cục cố định hai cột không phù hợp màn hình nhỏ.
- Danh mục đặt mô tả, chất liệu và dropdown size/màu ngay trong từng thẻ; thiếu điểm mở chi tiết sản phẩm thống nhất.
- Màu và size trộn trong cùng lựa chọn. Chưa có bảng số đo cạnh nút chọn size, dù API đã cung cấp dữ liệu.
- Cửa sổ chi tiết cũ thiếu quản lý focus, phím Escape và ngăn tương tác với nền.

## Thiết kế đã triển khai

- Giữ bảng màu xanh, nền sáng và kiểu chữ của FitCraft. Máy tính dùng ảnh bên trái, thông tin và lựa chọn bên phải; điện thoại dùng một cột.
- Ảnh có phóng to. Chỉ hiển thị ảnh thật đang được lưu trong catalog, không tạo thêm góc chụp giả.
- Giá, màu, size, tồn kho, bảng số đo và chính sách lấy từ API. Chọn size chủ động trước khi mua; size hết hàng bị vô hiệu hóa. Đổi màu sẽ bỏ size nếu tổ hợp mới không còn hàng.
- Số lượng tối đa bằng tồn kho hoặc giới hạn 20 của giỏ hàng. Tạm tính cập nhật theo số lượng.
- Thanh mua luôn hiển thị với “Thêm vào giỏ” và “Mua ngay”. Mua ngay thêm lựa chọn vào giỏ hiện tại rồi mở form thanh toán; không tự tạo đơn hàng.
- Combo ghi rõ bán nguyên bộ, một size cho cả bộ; danh sách món là thông tin thành phần. Bỏ các nút mua riêng chưa được hệ thống hỗ trợ để tránh giá hiển thị khác món thực sự mua.
- Hướng dẫn size gồm bảng số đo từng sản phẩm và cách đo. Có trạng thái rõ ràng khi shop chưa nhập bảng số đo.
- Mô tả, chất liệu, bảo quản và giao hàng/trả hàng được chia thành các mục có thể mở rộng.
- Native dialog khóa nền, hỗ trợ Escape, trả focus về nút mở; cửa sổ ảnh phóng to có quản lý bàn phím riêng.
- Danh mục mở cùng giao diện qua ảnh, tên và nút xem chi tiết. Phòng thử đồ dùng chung luồng thêm combo vào giỏ.

## Kiểm tra

- TypeScript, build production và 18 bài kiểm thử backend đạt.
- Kiểm tra trình duyệt: chọn L × 2 tạo đúng dòng combo-1-L với số lượng 2; chọn S và Mua ngay mở form thanh toán với đúng SKU.
- Kiểm tra lối vào từ danh mục, sản phẩm lẻ và phòng thử đồ.
- Kiểm tra thiếu size, hết hàng, lỗi thêm giỏ, lỗi tải sản phẩm/thử lại, bảng size, phóng to ảnh, Escape và phục hồi focus.
- Kiểm tra không tràn ngang và thanh mua nằm trong màn hình ở các chiều rộng 320, 390, 768, 1440 px. Không ghi nhận lỗi JavaScript trong lượt kiểm tra trình duyệt cuối.
- Giỏ kiểm thử dùng phiên trình duyệt riêng và được dọn sau kiểm tra; không tạo đơn hàng.

Ảnh giao diện: [Máy tính](product-detail/desktop.png) · [Điện thoại](product-detail/mobile.png).

## Những cải thiện nên làm tiếp

1. Bổ sung ảnh sản phẩm độ phân giải cao, ảnh người mặc, mặt sau và cận chất liệu. Các ảnh combo hiện là ảnh dọc có chữ nằm sẵn trong ảnh, hạn chế khả năng xem chi tiết.
2. Xác minh chất liệu, bảng số đo và chính sách với chủ shop trước khi bán thật. README hiện xác định đây là dữ liệu/chính sách mẫu. Các cam kết “đồng kiểm”, “đổi tận nhà” và “AI 3 giây” trên trang chủ cần đối chiếu với dịch vụ thực tế.
3. Nếu muốn bán lẻ món trong combo, bổ sung quan hệ combo → sản phẩm và biến thể từng món, định giá và kiểm tra tồn kho ở server. Không suy đoán quan hệ từ tên hoặc SKU minh họa.
4. Bổ sung đường dẫn riêng cho sản phẩm để chia sẻ và phục vụ tìm kiếm; hiện phần chi tiết là cửa sổ mở trong trang chủ/phòng thử đồ.
5. Khi có dữ liệu thực, triển khai đánh giá từ đơn đã mua và ảnh khách hàng. Giao diện hiện không thêm số sao, lượt bán hay khuyến mãi giả.

## Cơ sở tham khảo

- [Baymard: nút chọn size thay cho dropdown](https://baymard.com/research-articles/use-buttons-for-size-selection).
- [Baymard: thông tin kích cỡ cho website thời trang](https://baymard.com/research-articles/apparel-size-information).

Các nguyên tắc được áp dụng phù hợp với dữ liệu và khả năng bán hàng hiện có của FitCraft.
