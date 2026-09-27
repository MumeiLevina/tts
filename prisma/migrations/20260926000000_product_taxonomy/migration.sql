CREATE TABLE "ProductTaxonomyOption" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL DEFAULT 'GLOBAL',
    "kind" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductTaxonomyOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductTaxonomyOption_scopeKey_kind_groupCode_normalizedName_key"
ON "ProductTaxonomyOption"("scopeKey", "kind", "groupCode", "normalizedName");
CREATE INDEX "ProductTaxonomyOption_scopeKey_kind_groupCode_idx"
ON "ProductTaxonomyOption"("scopeKey", "kind", "groupCode");
