-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "askingPrice" REAL NOT NULL,
    "condition" TEXT,
    "location" TEXT,
    "sellerName" TEXT,
    "sellerContact" TEXT,
    "imageUrls" TEXT,
    "category" TEXT,
    "postedAt" DATETIME,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedValue" REAL,
    "estimatedLow" REAL,
    "estimatedHigh" REAL,
    "profitPotential" REAL,
    "profitLow" REAL,
    "profitHigh" REAL,
    "valueScore" REAL,
    "discountPercent" REAL,
    "resaleDifficulty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "comparableUrls" TEXT,
    "priceReasoning" TEXT,
    "notes" TEXT,
    "shippable" BOOLEAN,
    "estimatedWeight" REAL,
    "negotiable" BOOLEAN,
    "daysListed" INTEGER,
    "tags" TEXT,
    "requestToBuy" TEXT,
    "identifiedBrand" TEXT,
    "identifiedModel" TEXT,
    "identifiedVariant" TEXT,
    "identifiedCondition" TEXT,
    "verifiedMarketValue" REAL,
    "marketDataSource" TEXT,
    "marketDataDate" DATETIME,
    "comparableSalesJson" TEXT,
    "sellabilityScore" INTEGER,
    "demandLevel" TEXT,
    "expectedDaysToSell" INTEGER,
    "authenticityRisk" TEXT,
    "recommendedOffer" REAL,
    "recommendedList" REAL,
    "resaleStrategy" TEXT,
    "trueDiscountPercent" REAL,
    "llmAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisDate" DATETIME,
    "analysisConfidence" TEXT,
    "analysisReasoning" TEXT
);
INSERT INTO "new_Listing" ("askingPrice", "category", "comparableUrls", "condition", "daysListed", "description", "discountPercent", "estimatedHigh", "estimatedLow", "estimatedValue", "estimatedWeight", "externalId", "id", "imageUrls", "location", "negotiable", "notes", "platform", "postedAt", "priceReasoning", "profitHigh", "profitLow", "profitPotential", "requestToBuy", "resaleDifficulty", "scrapedAt", "sellerContact", "sellerName", "shippable", "status", "tags", "title", "url", "valueScore") SELECT "askingPrice", "category", "comparableUrls", "condition", "daysListed", "description", "discountPercent", "estimatedHigh", "estimatedLow", "estimatedValue", "estimatedWeight", "externalId", "id", "imageUrls", "location", "negotiable", "notes", "platform", "postedAt", "priceReasoning", "profitHigh", "profitLow", "profitPotential", "requestToBuy", "resaleDifficulty", "scrapedAt", "sellerContact", "sellerName", "shippable", "status", "tags", "title", "url", "valueScore" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_platform_idx" ON "Listing"("platform");
CREATE INDEX "Listing_status_idx" ON "Listing"("status");
CREATE INDEX "Listing_valueScore_idx" ON "Listing"("valueScore");
CREATE INDEX "Listing_scrapedAt_idx" ON "Listing"("scrapedAt");
CREATE INDEX "Listing_llmAnalyzed_idx" ON "Listing"("llmAnalyzed");
CREATE INDEX "Listing_trueDiscountPercent_idx" ON "Listing"("trueDiscountPercent");
CREATE UNIQUE INDEX "Listing_platform_externalId_key" ON "Listing"("platform", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
