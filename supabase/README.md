# Cau hinh FitCraft voi Supabase PostgreSQL

Thu muc nay chua schema PostgreSQL day du cho du an FitCraft.

## 1. Tao database

1. Tao mot project tren Supabase.
2. Mo **SQL Editor** trong Supabase Dashboard.
3. Tao query moi, sao chep toan bo noi dung file
   `fitcraft_postgresql.sql`, sau do bam **Run**.

> File SQL danh cho database moi va chi nen chay mot lan. Khong chay lai tren
> database da co cac bang cung ten.

Schema tao 19 bang, khoa ngoai, unique constraint, index, check constraint va
trigger cap nhat `updatedAt`. RLS duoc bat nhung khong co policy public vi ung
dung dang dung custom authentication va truy cap database tu Next.js server.

## 2. Lay connection string

Trong Supabase Dashboard, mo **Project Settings > Database > Connect** va lay:

- Runtime/pooler URL cho `DATABASE_URL`.
- Direct connection URL cho `DIRECT_URL` (dung khi migrate).

Vi du `.env`:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
```

Hay dung chinh URL Supabase cung cap thay cho cac gia tri minh hoa. Neu mat khau
co ky tu dac biet (`@`, `:`, `/`, `#`, `%`...), can URL-encode mat khau truoc khi
dua vao connection string. Khong dua hai bien nay vao code frontend hay bien moi
truong co tien to `NEXT_PUBLIC_`.

## 3. Cau hinh Prisma

Trong `prisma/schema.prisma`, doi datasource thanh:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Sau do chay:

```powershell
npx prisma validate
npx prisma generate
npm run db:seed
```

Khong chay `npm run db:setup` hoac cac migration SQLite hien co tren Supabase.
Schema Supabase da duoc tao bang file SQL trong thu muc nay.

## 4. Kiem tra nhanh

Trong Supabase Table Editor, kiem tra cac bang `User`, `Product`,
`ProductVariant`, `UserWardrobe`, `WardrobeItem`, `Outfit`, `Order` va cac bang
lien quan. Sau khi seed, bang `Product` phai co du lieu san pham.

Neu muon truy cap cac bang truc tiep tu Supabase client o browser trong tuong
lai, can thiet ke policy RLS theo `auth.uid()`. Cau hinh hien tai chi cho phep
backend cua FitCraft lam viec voi database.
