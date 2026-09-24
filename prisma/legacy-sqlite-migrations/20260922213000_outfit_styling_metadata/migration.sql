-- Optional styling metadata used by deterministic filtering and AI outfit selection.
-- Existing products remain valid and receive empty season/occasion arrays.
ALTER TABLE "Product" ADD COLUMN "subcategory" TEXT;
ALTER TABLE "Product" ADD COLUMN "pattern" TEXT;
ALTER TABLE "Product" ADD COLUMN "fit" TEXT;
ALTER TABLE "Product" ADD COLUMN "season" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Product" ADD COLUMN "occasion" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Product" ADD COLUMN "formality" INTEGER;
ALTER TABLE "Product" ADD COLUMN "transparentImageUrl" TEXT;
