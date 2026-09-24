ALTER TABLE "Product" ADD COLUMN "tags" JSONB NOT NULL DEFAULT '[]';
CREATE TABLE "UserWardrobe" (
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "productId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserWardrobe_userId_createdAt_idx" ON "UserWardrobe"("userId", "createdAt");
CREATE INDEX "UserWardrobe_productId_idx" ON "UserWardrobe"("productId");
-- Preserve previously saved account favorites; manual garments remain untouched.
INSERT OR IGNORE INTO "UserWardrobe" ("userId", "productId")
SELECT s."userId", w."productId" FROM "WishlistItem" w
JOIN "Session" s ON s."id" = w."sessionId" WHERE s."userId" IS NOT NULL;
