# Triển khai Supabase + Render

## Biến môi trường

- `.env`: cấu hình cho Prisma CLI và các script trên máy.
- `.env.local`: kết nối database cho Next.js trên máy.
- `.env.render.local`: file riêng chứa giá trị thật để nhập vào Render; không commit.
- `.env.example` và `.env.supabase.example`: mẫu công khai, không chứa mật khẩu.

Trong Render, tạo **Web Service** từ repo GitHub, chọn nhánh `main`:

- Build Command: `npm ci --include=dev && npm run render:build`
- Start Command: `npm start -- --hostname 0.0.0.0`
- Health Check Path: `/api/v1/health`

Mở **Environment → Add from .env**, dán toàn bộ nội dung `.env.render.local`, lưu và deploy. Có thể dùng `render.yaml` để tạo service qua Blueprint.

Không cần đặt `PORT`: Render tự cung cấp. `APP_ORIGIN` tự dùng `RENDER_EXTERNAL_URL`; nếu dùng tên miền riêng, đặt `APP_ORIGIN=https://ten-mien-cua-ban` (không có dấu `/` cuối).

Các khóa AI/email hiện có được giữ trong file Render. Dịch vụ chưa có khóa cần bổ sung riêng. Không dùng tiền tố `NEXT_PUBLIC_` cho mật khẩu hay API key.

## Database

Runtime sử dụng transaction pooler cổng 6543 với `pgbouncer=true`. Prisma migrations sử dụng session pooler cổng 5432 qua `DIRECT_URL`. Cả hai dùng SSL.

Build Render sinh Prisma Client và chạy `prisma migrate deploy` trước khi build Next.js. Migration PostgreSQL dành cho database mới. Các migration SQLite cũ được lưu ở `prisma/legacy-sqlite-migrations` để tham khảo. Không chạy SQL thủ công trong `supabase/fitcraft_postgresql.sql` cùng migration mới.

Chạy `npm run db:setup` để áp dụng migration và thêm 11 sản phẩm mẫu. Seed không ghi đè dữ liệu hiện có và không tự chạy mỗi lần Render deploy.

Các bảng bật RLS, không có policy public: dữ liệu được truy cập qua backend Prisma và hệ thống xác thực của ứng dụng.

## Kiểm tra

`npm run typecheck`, `npm test`, `npm run build`. Bộ test dùng SQLite tạm riêng rồi phục hồi Prisma Client PostgreSQL; không truy cập dữ liệu Supabase thật. Kiểm tra thêm `/api/v1/health` sau khi triển khai.

Tham khảo: [Render Next.js](https://render.com/docs/deploy-nextjs-app), [biến môi trường Render](https://render.com/docs/environment-variables), [Prisma 6 migrations](https://docs.prisma.io/docs/orm/v6/prisma-client/deployment/deploy-database-changes-with-prisma-migrate).
