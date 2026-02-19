-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "externalId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "askingPrice" DOUBLE PRECISION NOT NULL,
    "condition" TEXT,
    "location" TEXT,
    "sellerName" TEXT,
    "sellerContact" TEXT,
    "imageUrls" TEXT,
    "category" TEXT,
    "postedAt" TIMESTAMP(3),
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedValue" DOUBLE PRECISION,
    "estimatedLow" DOUBLE PRECISION,
    "estimatedHigh" DOUBLE PRECISION,
    "profitPotential" DOUBLE PRECISION,
    "profitLow" DOUBLE PRECISION,
    "profitHigh" DOUBLE PRECISION,
    "valueScore" DOUBLE PRECISION,
    "discountPercent" DOUBLE PRECISION,
    "resaleDifficulty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "comparableUrls" TEXT,
    "priceReasoning" TEXT,
    "notes" TEXT,
    "shippable" BOOLEAN,
    "estimatedWeight" DOUBLE PRECISION,
    "negotiable" BOOLEAN,
    "daysListed" INTEGER,
    "tags" TEXT,
    "requestToBuy" TEXT,
    "identifiedBrand" TEXT,
    "identifiedModel" TEXT,
    "identifiedVariant" TEXT,
    "identifiedCondition" TEXT,
    "verifiedMarketValue" DOUBLE PRECISION,
    "marketDataSource" TEXT,
    "marketDataDate" TIMESTAMP(3),
    "comparableSalesJson" TEXT,
    "sellabilityScore" INTEGER,
    "demandLevel" TEXT,
    "expectedDaysToSell" INTEGER,
    "authenticityRisk" TEXT,
    "recommendedOffer" DOUBLE PRECISION,
    "recommendedList" DOUBLE PRECISION,
    "resaleStrategy" TEXT,
    "trueDiscountPercent" DOUBLE PRECISION,
    "llmAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisDate" TIMESTAMP(3),
    "analysisConfidence" TEXT,
    "analysisReasoning" TEXT,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "listingId" TEXT NOT NULL,
    "purchasePrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "purchaseNotes" TEXT,
    "resalePrice" DOUBLE PRECISION,
    "resalePlatform" TEXT,
    "resaleUrl" TEXT,
    "resaleDate" TIMESTAMP(3),
    "actualProfit" DOUBLE PRECISION,
    "fees" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'IDENTIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "platform" TEXT NOT NULL,
    "location" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "listingsFound" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScraperJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "category" TEXT,
    "keywords" TEXT,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "platform" TEXT NOT NULL,
    "soldPrice" DOUBLE PRECISION NOT NULL,
    "condition" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openaiApiKey" TEXT,
    "llmModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "discountThreshold" INTEGER NOT NULL DEFAULT 50,
    "autoAnalyze" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewDeals" BOOLEAN NOT NULL DEFAULT true,
    "notifyPriceDrops" BOOLEAN NOT NULL DEFAULT true,
    "notifySoldItems" BOOLEAN NOT NULL DEFAULT true,
    "notifyExpiring" BOOLEAN NOT NULL DEFAULT true,
    "notifyWeeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "notifyFrequency" TEXT NOT NULL DEFAULT 'instant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "sellerName" TEXT,
    "sellerContact" TEXT,
    "platform" TEXT,
    "parentId" TEXT,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAnalysisCache" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "analysisResult" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostingQueueItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "targetPlatform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "askingPrice" DOUBLE PRECISION,
    "title" TEXT,
    "description" TEXT,
    "externalPostId" TEXT,
    "externalPostUrl" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostingQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_userId_idx" ON "Listing"("userId");

-- CreateIndex
CREATE INDEX "Listing_platform_idx" ON "Listing"("platform");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_valueScore_idx" ON "Listing"("valueScore");

-- CreateIndex
CREATE INDEX "Listing_scrapedAt_idx" ON "Listing"("scrapedAt");

-- CreateIndex
CREATE INDEX "Listing_llmAnalyzed_idx" ON "Listing"("llmAnalyzed");

-- CreateIndex
CREATE INDEX "Listing_trueDiscountPercent_idx" ON "Listing"("trueDiscountPercent");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_platform_externalId_userId_key" ON "Listing"("platform", "externalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_listingId_key" ON "Opportunity"("listingId");

-- CreateIndex
CREATE INDEX "Opportunity_userId_idx" ON "Opportunity"("userId");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "ScraperJob_userId_idx" ON "ScraperJob"("userId");

-- CreateIndex
CREATE INDEX "ScraperJob_status_idx" ON "ScraperJob"("status");

-- CreateIndex
CREATE INDEX "ScraperJob_createdAt_idx" ON "ScraperJob"("createdAt");

-- CreateIndex
CREATE INDEX "SearchConfig_userId_idx" ON "SearchConfig"("userId");

-- CreateIndex
CREATE INDEX "SearchConfig_enabled_idx" ON "SearchConfig"("enabled");

-- CreateIndex
CREATE INDEX "PriceHistory_productName_idx" ON "PriceHistory"("productName");

-- CreateIndex
CREATE INDEX "PriceHistory_category_idx" ON "PriceHistory"("category");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

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
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookToken_userId_key" ON "FacebookToken"("userId");

-- CreateIndex
CREATE INDEX "FacebookToken_userId_idx" ON "FacebookToken"("userId");

-- CreateIndex
CREATE INDEX "FacebookToken_expiresAt_idx" ON "FacebookToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");

-- CreateIndex
CREATE INDEX "Message_listingId_idx" ON "Message"("listingId");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Message_direction_idx" ON "Message"("direction");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysisCache_listingId_idx" ON "AiAnalysisCache"("listingId");

-- CreateIndex
CREATE INDEX "AiAnalysisCache_expiresAt_idx" ON "AiAnalysisCache"("expiresAt");

-- CreateIndex
CREATE INDEX "PostingQueueItem_userId_idx" ON "PostingQueueItem"("userId");

-- CreateIndex
CREATE INDEX "PostingQueueItem_status_idx" ON "PostingQueueItem"("status");

-- CreateIndex
CREATE INDEX "PostingQueueItem_targetPlatform_idx" ON "PostingQueueItem"("targetPlatform");

-- CreateIndex
CREATE INDEX "PostingQueueItem_scheduledAt_idx" ON "PostingQueueItem"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostingQueueItem_listingId_targetPlatform_userId_key" ON "PostingQueueItem"("listingId", "targetPlatform", "userId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScraperJob" ADD CONSTRAINT "ScraperJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchConfig" ADD CONSTRAINT "SearchConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingQueueItem" ADD CONSTRAINT "PostingQueueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostingQueueItem" ADD CONSTRAINT "PostingQueueItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
