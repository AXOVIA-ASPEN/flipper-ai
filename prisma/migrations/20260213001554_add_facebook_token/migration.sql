-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" DATETIME;
ALTER TABLE "User" ADD COLUMN "password" TEXT;

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FacebookToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
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
    "analysisReasoning" TEXT,
    CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("analysisConfidence", "analysisDate", "analysisReasoning", "askingPrice", "authenticityRisk", "category", "comparableSalesJson", "comparableUrls", "condition", "daysListed", "demandLevel", "description", "discountPercent", "estimatedHigh", "estimatedLow", "estimatedValue", "estimatedWeight", "expectedDaysToSell", "externalId", "id", "identifiedBrand", "identifiedCondition", "identifiedModel", "identifiedVariant", "imageUrls", "llmAnalyzed", "location", "marketDataDate", "marketDataSource", "negotiable", "notes", "platform", "postedAt", "priceReasoning", "profitHigh", "profitLow", "profitPotential", "recommendedList", "recommendedOffer", "requestToBuy", "resaleDifficulty", "resaleStrategy", "scrapedAt", "sellabilityScore", "sellerContact", "sellerName", "shippable", "status", "tags", "title", "trueDiscountPercent", "url", "valueScore", "verifiedMarketValue") SELECT "analysisConfidence", "analysisDate", "analysisReasoning", "askingPrice", "authenticityRisk", "category", "comparableSalesJson", "comparableUrls", "condition", "daysListed", "demandLevel", "description", "discountPercent", "estimatedHigh", "estimatedLow", "estimatedValue", "estimatedWeight", "expectedDaysToSell", "externalId", "id", "identifiedBrand", "identifiedCondition", "identifiedModel", "identifiedVariant", "imageUrls", "llmAnalyzed", "location", "marketDataDate", "marketDataSource", "negotiable", "notes", "platform", "postedAt", "priceReasoning", "profitHigh", "profitLow", "profitPotential", "recommendedList", "recommendedOffer", "requestToBuy", "resaleDifficulty", "resaleStrategy", "scrapedAt", "sellabilityScore", "sellerContact", "sellerName", "shippable", "status", "tags", "title", "trueDiscountPercent", "url", "valueScore", "verifiedMarketValue" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_userId_idx" ON "Listing"("userId");
CREATE INDEX "Listing_platform_idx" ON "Listing"("platform");
CREATE INDEX "Listing_status_idx" ON "Listing"("status");
CREATE INDEX "Listing_valueScore_idx" ON "Listing"("valueScore");
CREATE INDEX "Listing_scrapedAt_idx" ON "Listing"("scrapedAt");
CREATE INDEX "Listing_llmAnalyzed_idx" ON "Listing"("llmAnalyzed");
CREATE INDEX "Listing_trueDiscountPercent_idx" ON "Listing"("trueDiscountPercent");
CREATE UNIQUE INDEX "Listing_platform_externalId_userId_key" ON "Listing"("platform", "externalId", "userId");
CREATE TABLE "new_Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "listingId" TEXT NOT NULL,
    "purchasePrice" REAL,
    "purchaseDate" DATETIME,
    "purchaseNotes" TEXT,
    "resalePrice" REAL,
    "resalePlatform" TEXT,
    "resaleUrl" TEXT,
    "resaleDate" DATETIME,
    "actualProfit" REAL,
    "fees" REAL,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Opportunity" ("actualProfit", "createdAt", "fees", "id", "listingId", "notes", "purchaseDate", "purchaseNotes", "purchasePrice", "resaleDate", "resalePlatform", "resalePrice", "resaleUrl", "status", "updatedAt") SELECT "actualProfit", "createdAt", "fees", "id", "listingId", "notes", "purchaseDate", "purchaseNotes", "purchasePrice", "resaleDate", "resalePlatform", "resalePrice", "resaleUrl", "status", "updatedAt" FROM "Opportunity";
DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";
CREATE UNIQUE INDEX "Opportunity_listingId_key" ON "Opportunity"("listingId");
CREATE INDEX "Opportunity_userId_idx" ON "Opportunity"("userId");
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");
CREATE TABLE "new_ScraperJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "platform" TEXT NOT NULL,
    "location" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "listingsFound" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScraperJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScraperJob" ("category", "completedAt", "createdAt", "errorMessage", "id", "listingsFound", "location", "opportunitiesFound", "platform", "startedAt", "status") SELECT "category", "completedAt", "createdAt", "errorMessage", "id", "listingsFound", "location", "opportunitiesFound", "platform", "startedAt", "status" FROM "ScraperJob";
DROP TABLE "ScraperJob";
ALTER TABLE "new_ScraperJob" RENAME TO "ScraperJob";
CREATE INDEX "ScraperJob_userId_idx" ON "ScraperJob"("userId");
CREATE INDEX "ScraperJob_status_idx" ON "ScraperJob"("status");
CREATE INDEX "ScraperJob_createdAt_idx" ON "ScraperJob"("createdAt");
CREATE TABLE "new_SearchConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "category" TEXT,
    "keywords" TEXT,
    "minPrice" REAL,
    "maxPrice" REAL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SearchConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SearchConfig" ("category", "createdAt", "enabled", "id", "keywords", "lastRun", "location", "maxPrice", "minPrice", "name", "platform", "updatedAt") SELECT "category", "createdAt", "enabled", "id", "keywords", "lastRun", "location", "maxPrice", "minPrice", "name", "platform", "updatedAt" FROM "SearchConfig";
DROP TABLE "SearchConfig";
ALTER TABLE "new_SearchConfig" RENAME TO "SearchConfig";
CREATE INDEX "SearchConfig_userId_idx" ON "SearchConfig"("userId");
CREATE INDEX "SearchConfig_enabled_idx" ON "SearchConfig"("enabled");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookToken_userId_key" ON "FacebookToken"("userId");

-- CreateIndex
CREATE INDEX "FacebookToken_userId_idx" ON "FacebookToken"("userId");

-- CreateIndex
CREATE INDEX "FacebookToken_expiresAt_idx" ON "FacebookToken"("expiresAt");
