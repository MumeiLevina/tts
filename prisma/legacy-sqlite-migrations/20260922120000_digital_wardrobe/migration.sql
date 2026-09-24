ALTER TABLE "WardrobeItem" ADD COLUMN "searchName" TEXT NOT NULL DEFAULT '';
-- SQLite cannot add a column with CURRENT_TIMESTAMP to an existing table.
ALTER TABLE "WardrobeItem" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
UPDATE "WardrobeItem" SET "updatedAt" = "createdAt", "searchName" = lower("name");
CREATE INDEX "WardrobeItem_sessionId_category_createdAt_idx" ON "WardrobeItem"("sessionId", "category", "createdAt");
CREATE INDEX "WardrobeItem_sessionId_color_createdAt_idx" ON "WardrobeItem"("sessionId", "color", "createdAt");
CREATE TABLE "WardrobeTag" (
  "itemId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  PRIMARY KEY ("itemId", "kind", "value"),
  FOREIGN KEY ("itemId") REFERENCES "WardrobeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WardrobeTag_kind_value_itemId_idx" ON "WardrobeTag"("kind", "value", "itemId");
