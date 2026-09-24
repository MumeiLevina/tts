-- FitCraft PostgreSQL schema for a fresh Supabase project.
-- Run this file once in Supabase Dashboard > SQL Editor.
-- Table and column names are quoted to match the existing Prisma models.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.fitcraft_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_role_check" CHECK ("role" IN ('CUSTOMER', 'ADMIN'))
);

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuthSession" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Product" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "subcategory" TEXT,
  "description" TEXT NOT NULL,
  "material" TEXT NOT NULL,
  "care" TEXT NOT NULL,
  "style" TEXT NOT NULL,
  "pattern" TEXT,
  "fit" TEXT,
  "season" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "occasion" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "formality" INTEGER,
  "price" INTEGER NOT NULL,
  "image" TEXT NOT NULL,
  "transparentImageUrl" TEXT,
  "tagBadge" TEXT,
  "tags" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_price_check" CHECK ("price" >= 0),
  CONSTRAINT "Product_formality_check" CHECK ("formality" IS NULL OR "formality" BETWEEN 0 AND 5)
);

CREATE TABLE "ProductVariant" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "productId" TEXT NOT NULL,
  "sku" TEXT NOT NULL UNIQUE,
  "size" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "colorHex" TEXT NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductVariant_stock_check" CHECK ("stock" >= 0),
  CONSTRAINT "ProductVariant_productId_size_color_key" UNIQUE ("productId", "size", "color")
);

CREATE TABLE "SizeGuideRow" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "productId" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "chestMin" DOUBLE PRECISION,
  "chestMax" DOUBLE PRECISION,
  "waistMin" DOUBLE PRECISION,
  "waistMax" DOUBLE PRECISION,
  "hipMin" DOUBLE PRECISION,
  "hipMax" DOUBLE PRECISION,
  CONSTRAINT "SizeGuideRow_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SizeGuideRow_productId_size_key" UNIQUE ("productId", "size")
);

CREATE TABLE "CartItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sessionId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "CartItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CartItem_quantity_check" CHECK ("quantity" BETWEEN 1 AND 20),
  CONSTRAINT "CartItem_sessionId_variantId_key" UNIQUE ("sessionId", "variantId")
);

CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "number" TEXT NOT NULL UNIQUE,
  "sessionId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
  "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  "customerName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "note" TEXT,
  "subtotal" INTEGER NOT NULL,
  "shippingFee" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "trackingNumber" TEXT,
  "carrier" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMPTZ,
  CONSTRAINT "Order_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_sessionId_idempotencyKey_key" UNIQUE ("sessionId", "idempotencyKey"),
  CONSTRAINT "Order_money_check" CHECK ("subtotal" >= 0 AND "shippingFee" >= 0 AND "total" >= 0)
);

CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_values_check" CHECK ("unitPrice" >= 0 AND "quantity" > 0)
);

CREATE TABLE "OrderEvent" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ReturnRequest" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "orderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReturnRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReturnRequest_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "WishlistItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sessionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  CONSTRAINT "WishlistItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WishlistItem_sessionId_productId_key" UNIQUE ("sessionId", "productId")
);

CREATE TABLE "UserWardrobe" (
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserWardrobe_pkey" PRIMARY KEY ("userId", "productId"),
  CONSTRAINT "UserWardrobe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "UserWardrobe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WardrobeItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sessionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "searchName" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WardrobeItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WardrobeTag" (
  "itemId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "WardrobeTag_pkey" PRIMARY KEY ("itemId", "kind", "value"),
  CONSTRAINT "WardrobeTag_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WardrobeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Outfit" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sessionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "productIds" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Outfit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StudioImage" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ComboDraft" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "style" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "image" TEXT NOT NULL,
  "itemsJson" TEXT NOT NULL,
  "engine" TEXT NOT NULL,
  "productId" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComboDraft_price_check" CHECK ("price" >= 0)
);

CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX "Product_active_category_price_idx" ON "Product"("active", "category", "price");
CREATE INDEX "Order_sessionId_createdAt_idx" ON "Order"("sessionId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
CREATE INDEX "UserWardrobe_userId_createdAt_idx" ON "UserWardrobe"("userId", "createdAt");
CREATE INDEX "UserWardrobe_productId_idx" ON "UserWardrobe"("productId");
CREATE INDEX "WardrobeItem_sessionId_category_createdAt_idx" ON "WardrobeItem"("sessionId", "category", "createdAt");
CREATE INDEX "WardrobeItem_sessionId_color_createdAt_idx" ON "WardrobeItem"("sessionId", "color", "createdAt");
CREATE INDEX "WardrobeTag_kind_value_itemId_idx" ON "WardrobeTag"("kind", "value", "itemId");

CREATE TRIGGER "User_set_updatedAt" BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION public.fitcraft_set_updated_at();
CREATE TRIGGER "Product_set_updatedAt" BEFORE UPDATE ON "Product" FOR EACH ROW EXECUTE FUNCTION public.fitcraft_set_updated_at();
CREATE TRIGGER "Order_set_updatedAt" BEFORE UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION public.fitcraft_set_updated_at();
CREATE TRIGGER "ReturnRequest_set_updatedAt" BEFORE UPDATE ON "ReturnRequest" FOR EACH ROW EXECUTE FUNCTION public.fitcraft_set_updated_at();
CREATE TRIGGER "WardrobeItem_set_updatedAt" BEFORE UPDATE ON "WardrobeItem" FOR EACH ROW EXECUTE FUNCTION public.fitcraft_set_updated_at();
CREATE TRIGGER "ComboDraft_set_updatedAt" BEFORE UPDATE ON "ComboDraft" FOR EACH ROW EXECUTE FUNCTION public.fitcraft_set_updated_at();

-- FitCraft uses its own server-side authentication. Keep Supabase Data API
-- access closed until explicit per-user policies are designed.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuthSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SizeGuideRow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CartItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReturnRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WishlistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserWardrobe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WardrobeItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WardrobeTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Outfit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComboDraft" ENABLE ROW LEVEL SECURITY;

COMMIT;
