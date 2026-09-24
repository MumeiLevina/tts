-- SQLite requires a table copy to change the added column's default to CURRENT_TIMESTAMP.
-- Preserve all garment IDs and values so existing WardrobeTag relations stay intact.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WardrobeItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "searchName" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WardrobeItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WardrobeItem" ("id", "sessionId", "name", "searchName", "category", "color", "imageUrl", "createdAt", "updatedAt")
SELECT "id", "sessionId", "name", "searchName", "category", "color", "imageUrl", "createdAt", "updatedAt" FROM "WardrobeItem";
DROP TABLE "WardrobeItem";
ALTER TABLE "new_WardrobeItem" RENAME TO "WardrobeItem";
CREATE INDEX "WardrobeItem_sessionId_category_createdAt_idx" ON "WardrobeItem"("sessionId", "category", "createdAt");
CREATE INDEX "WardrobeItem_sessionId_color_createdAt_idx" ON "WardrobeItem"("sessionId", "color", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
