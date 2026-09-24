# FitCraft

Website thời trang dùng Next.js 14, TypeScript, Prisma 6 và SQLite cho môi trường phát triển.

## Chạy trên máy

Yêu cầu Node.js 20.19+ (đã kiểm tra với Node 24) và npm.

```powershell
npm install
npm run db:setup
npm run dev
```

Mở http://localhost:3000. Lệnh setup tạo `.env` từ `.env.example` nếu chưa có, sinh Prisma Client, áp dụng migration và thêm 11 sản phẩm mẫu. Seed chạy lại không ghi đè sản phẩm, giá hoặc tồn kho đã chỉnh. Không sử dụng thông tin chất liệu, bảng size và ảnh minh họa để bán hàng thật khi chưa xác minh.

Database nằm tại `prisma/dev.db`, không đưa vào Git. Sao lưu file này khi cần giữ dữ liệu. Thay `APP_ORIGIN` nếu đổi cổng hoặc tên miền; phải khớp chính xác origin, không có dấu / cuối. Khi chạy production, cookie dùng Secure và website cần HTTPS.

## Chức năng đã chạy

- Danh mục sản phẩm, SKU theo size/màu, tồn kho, tìm kiếm, lọc và phân trang API.
- Giỏ hàng lưu trong database theo cookie HttpOnly của khách, thời hạn phiên 30 ngày.
- Đăng ký, đăng nhập, đăng xuất và đặt lại mật khẩu; dữ liệu khách được nhập vào tài khoản khi đăng nhập.
- Đặt hàng COD, tính giá/phí vận chuyển ở server, chống tạo đơn trùng, trừ tồn kho trong giao dịch.
- Trang `/orders`: lịch sử đơn, hủy đơn chờ xác nhận và gửi yêu cầu trả hàng.
- API quản trị: tạo/ngừng bán sản phẩm, đổi giá/tồn kho, xử lý đơn và xét duyệt trả hàng.
- Dashboard `/admin`: tổng quan kinh doanh, sản phẩm/SKU, đơn hàng, đổi trả và quản lý quyền người dùng.
- Stylist chọn sản phẩm còn hàng theo ngân sách và phong cách bằng quy tắc, chưa dùng mô hình AI.
- Tủ đồ cá nhân tại `/wardrobe` và `/#closet`: lưu sản phẩm bằng trái tim, tìm/lọc/sắp xếp và gợi ý phối đồ rule-based từ món đã lưu. [Thiết kế và API](docs/personal-wardrobe.md).
- Tủ đồ nhập thủ công cũ được giữ tại `/wardrobe/manual`. [API thủ công](docs/digital-wardrobe.md).
- API tư vấn size, wishlist và lưu bộ phối. Nút lưu bộ phối đã nối API.
- Phòng thử hiển thị ảnh xem trước; endpoint tạo ảnh AI trả 503 cho đến khi có tích hợp thực.

Wishlist và tư vấn size hiện có API; giao diện chuyên dụng cho các API này là phần tiếp theo. Danh mục trên trang chủ tải tối đa 100 sản phẩm; API hỗ trợ phân trang đầy đủ.

## Tài khoản và email đặt lại mật khẩu

Trong môi trường phát triển, trang quên mật khẩu hiển thị liên kết dùng một lần để kiểm thử. Với production, cấu hình `RESEND_API_KEY`, `AUTH_FROM_EMAIL` và `APP_ORIGIN`; liên kết sẽ được gửi qua Resend và không xuất hiện trong phản hồi API. Liên kết hết hạn sau 20 phút và chỉ dùng được một lần. Đổi mật khẩu sẽ đăng xuất mọi phiên đang hoạt động của tài khoản.

## Quản trị

Để tạo quản trị viên đầu tiên:

1. Đăng ký một tài khoản bình thường tại `/auth/register`.
2. Chạy lệnh dưới đây với email vừa đăng ký.

```powershell
npm run admin:promote -- admin@example.com
```

Sau đó truy cập `/admin/login`. Không có mật khẩu admin mặc định trong mã nguồn. Trang `/admin` kiểm tra quyền ở server; tài khoản `CUSTOMER` không thể gọi API quản trị. Quản trị viên có thể xem thống kê, tạo/ẩn sản phẩm, đổi giá và tồn kho, cập nhật trạng thái đơn/mã vận đơn, xét duyệt trả hàng và cấp quyền cho người dùng khác. Hệ thống không cho hạ quyền quản trị viên cuối cùng.

Đặt `ADMIN_API_KEY` thành một chuỗi ngẫu nhiên tối thiểu 32 ký tự trong `.env`, rồi khởi động lại server. Không đặt khóa trong biến `NEXT_PUBLIC_*`, mã frontend hay localStorage. Các endpoint `/api/v1/admin/*` nhận `Authorization: Bearer <key>`.

Có thể tạo khóa bằng lệnh:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Khóa API chỉ dành cho script nội bộ. Giao diện quản trị sử dụng cookie đăng nhập HttpOnly và tài khoản có vai trò `ADMIN`. Nhật ký thao tác chi tiết theo từng quản trị viên chưa được triển khai.

## Kiểm tra

```powershell
npm run typecheck
npm test
npm run build
```

`npm test` tạo database riêng trong thư mục tạm hệ điều hành, áp dụng migration và chạy kiểm thử tích hợp qua các route handler. Không chạm vào database phát triển; file tạm được giữ để điều tra khi test lỗi. Các bài kiểm thử bao gồm tranh mua món cuối cùng, rollback tồn kho, idempotency, hủy đơn, quyền truy cập, trả hàng, dữ liệu sai và giới hạn request.

Nếu Windows sandbox chặn tiến trình con với EPERM, cần cho phép chạy Prisma/esbuild/Next.js từ terminal được cấp quyền. Prisma lần đầu cần tải engine từ mạng.

## Tài liệu

- [Nghiên cứu và thiết kế backend](docs/backend-design.md)
- [Danh sách API và ví dụ](docs/api.md)
- [Trợ lý phối combo: sử dụng, cấu hình AI và tồn kho](docs/combo-studio.md)

Bản hiện tại phù hợp phát triển và thử nghiệm cục bộ. Chưa kết nối thanh toán điện tử, vận chuyển, email/SMS, lưu ảnh riêng tư hay nhà cung cấp thử đồ AI. Các giá trị phí giao hàng và thời hạn trả hàng là chính sách mẫu, tập trung tại `lib/server/commerce.ts`.
