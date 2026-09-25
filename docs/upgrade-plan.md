# Kế hoạch nâng cấp FitCraft

Kế hoạch này chuyển các phát hiện trong `ux-audit-2026-09-25.md` thành những đợt thay đổi nhỏ, có thể kiểm thử và triển khai độc lập.

## Đợt 1 — Khôi phục niềm tin và luồng cốt lõi

Mục tiêu: mọi nút chính phải đưa người dùng đến kết quả đúng, mobile không bị vỡ và nội dung không hứa quá khả năng hiện tại.

- [x] “Phối thử” mở phòng phối và giữ đúng sản phẩm đã chọn.
- [x] Phòng phối hiển thị `rationale` từ API thay vì lặp câu người dùng.
- [x] Xử lý rõ trạng thái không có bộ phối phù hợp.
- [x] Sửa header `/fitting-room` bị tràn ở màn hình 390px.
- [x] Đổi nội dung thử ảnh thành “xem trước”, bỏ tải/chia sẻ giả khi chưa có kết quả được lưu.
- [x] Đồng bộ footer với COD và bỏ form newsletter chưa có backend.
- [x] Tạo ảnh flat-lay bằng canvas từ bộ phối hiện tại và cho chuyển sang ảnh xem trước.
- [x] Ẩn các prompt mẫu sau tin nhắn đầu tiên; sửa font tiền và bố cục panel sản phẩm.
- [ ] Chuẩn hóa dialog giỏ hàng/menu để đóng bằng Escape và giữ focus.

Điều kiện hoàn tất: typecheck và test hiện có chạy qua; viewport 360/390/430px không tràn ngang; sản phẩm được chọn còn hiện sau khi điều hướng.

## Đợt 2 — Một hành trình khám phá và mua hàng

Mục tiêu: người dùng có thể đi từ nhu cầu đến đơn hàng mà không gặp các trải nghiệm trùng lặp.

- Chọn một trải nghiệm stylist chính, đưa form dịp/mùa/ngân sách vào cùng phòng phối.
- Dùng một cart provider và một drawer trên toàn website.
- Cho sửa số lượng, size, màu và xóa/hoàn tác ngay trong giỏ.
- Thêm tìm kiếm mobile; lọc size, màu, giá, còn hàng và sắp xếp.
- Đồng bộ bộ lọc vào URL để Back/Forward khôi phục trạng thái.
- Giữ bản nháp checkout; thêm màn hình xác nhận đơn và CTA theo dõi.
- Tạo URL chi tiết sản phẩm có thể chia sẻ, vẫn giữ quick view.

Điều kiện hoàn tất: kiểm thử từ tìm kiếm → chi tiết → giỏ → checkout → xác nhận đơn ở desktop/mobile.

## Đợt 3 — Tài khoản, tủ đồ và khả năng quay lại

Mục tiêu: người dùng đăng nhập hoặc quay lại vẫn tiếp tục đúng công việc trước đó.

- Thêm `returnTo` an toàn cho đăng nhập/đăng ký.
- Giữ ý định lưu sản phẩm hoặc checkout qua bước đăng nhập.
- Hợp nhất tủ đồ thành các phần: yêu thích, đồ sở hữu, bộ phối đã lưu.
- Cho mở lại, đổi món, mua và xóa bộ phối đã lưu.
- Lưu draft bộ phối cùng size/màu; URL chia sẻ phải mở đúng bộ.
- Thêm upload/chụp ảnh cho tủ đồ thủ công thay vì bắt buộc URL HTTPS.

Điều kiện hoàn tất: đăng nhập không mất ngữ cảnh; bộ phối mở lại đúng dữ liệu sau tải lại.

## Đợt 4 — Quy mô, quản trị và chất lượng

Mục tiêu: vận hành tốt khi dữ liệu tăng và đáp ứng accessibility cơ bản.

- Nối phân trang API vào danh mục, đơn hàng, sản phẩm và người dùng quản trị.
- Bổ sung tìm kiếm/lọc admin, trạng thái trống đúng và xác nhận thao tác nhạy cảm.
- Hoàn thiện điều hướng bàn phím, focus trap, live region và kích thước vùng chạm.
- Thêm trang 404 và các trang chính sách sau khi nội dung được chủ shop xác nhận.
- Đo ảnh, Core Web Vitals và hiệu năng trên production build.
- Gắn sự kiện đo funnel: tìm kiếm, mở chi tiết, thêm giỏ, checkout, tạo đơn, stylist → giỏ.

Điều kiện hoàn tất: các trang dữ liệu lớn truy cập được mọi bản ghi; kiểm thử keyboard/mobile và production build đạt yêu cầu đã thống nhất.
