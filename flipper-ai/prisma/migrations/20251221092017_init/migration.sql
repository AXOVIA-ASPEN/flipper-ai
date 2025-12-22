-- CreateTable
CREATE TABLE "Listing" (
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
    "profitPotential" REAL,
    "valueScore" REAL,
    "status" TEXT NOT NULL DEFAULT 'NEW'
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "Opportunity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScraperJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "location" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "listingsFound" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SearchConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "platform" TEXT NOT NULL,
    "soldPrice" REAL NOT NULL,
    "condition" TEXT,
    "soldAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Listing_platform_idx" ON "Listing"("platform");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_valueScore_idx" ON "Listing"("valueScore");

-- CreateIndex
CREATE INDEX "Listing_scrapedAt_idx" ON "Listing"("scrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_platform_externalId_key" ON "Listing"("platform", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_listingId_key" ON "Opportunity"("listingId");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "ScraperJob_status_idx" ON "ScraperJob"("status");

-- CreateIndex
CREATE INDEX "ScraperJob_createdAt_idx" ON "ScraperJob"("createdAt");

-- CreateIndex
CREATE INDEX "SearchConfig_enabled_idx" ON "SearchConfig"("enabled");

-- CreateIndex
CREATE INDEX "PriceHistory_productName_idx" ON "PriceHistory"("productName");

-- CreateIndex
CREATE INDEX "PriceHistory_category_idx" ON "PriceHistory"("category");
