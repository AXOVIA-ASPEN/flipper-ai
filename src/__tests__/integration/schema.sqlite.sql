-- CreateTable
CREATE TABLE "Listing" (
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
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMonitoredAt" DATETIME,
    "estimatedExpiresAt" DATETIME,
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
    "compMatchConfidence" TEXT,
    "sellabilityScore" INTEGER,
    "demandLevel" TEXT,
    "expectedDaysToSell" INTEGER,
    "authenticityRisk" TEXT,
    "conditionRisk" TEXT,
    "recommendedOffer" REAL,
    "recommendedList" REAL,
    "resaleStrategy" TEXT,
    "trueDiscountPercent" REAL,
    "soldVolume30Days" INTEGER,
    "soldVolume60Days" INTEGER,
    "soldVolume90Days" INTEGER,
    "completenessLabel" TEXT,
    "sellerRating" REAL,
    "sellerReviewCount" INTEGER,
    "sellerAccountAgeDays" INTEGER,
    "sizeCategory" TEXT,
    "shippingEstimatesJson" TEXT,
    "estimatedShippingCost" REAL,
    "pickupDistanceMiles" REAL,
    "outsidePickupRadius" BOOLEAN,
    "adjustedProfitMargin" REAL,
    "conversationStatus" TEXT,
    "llmAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "analysisDate" DATETIME,
    "analysisConfidence" TEXT,
    "analysisReasoning" TEXT,
    CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opportunity" (
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
    "meetingTime" DATETIME,
    "meetingLocation" TEXT,
    "meetingType" TEXT,
    "calendarEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Opportunity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Opportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScraperJob" (
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

-- CreateTable
CREATE TABLE "SearchConfig" (
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
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "platform" TEXT NOT NULL,
    "soldPrice" REAL NOT NULL,
    "condition" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'sold',
    "soldAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firebaseUid" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "opportunityThreshold" INTEGER NOT NULL DEFAULT 70,
    "feeRateEbay" REAL NOT NULL DEFAULT 13.0,
    "feeRateMercari" REAL NOT NULL DEFAULT 10.0,
    "feeRateFacebook" REAL NOT NULL DEFAULT 5.0,
    "feeRateOfferup" REAL NOT NULL DEFAULT 12.9,
    "feeRateCraigslist" REAL NOT NULL DEFAULT 0.0,
    "maxPickupRadiusMiles" INTEGER NOT NULL DEFAULT 50,
    "homeLocation" TEXT,
    "holdingCostDailyRate" REAL NOT NULL DEFAULT 2.0,
    "messageApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumber" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerificationCode" TEXT,
    "phoneVerificationExpiry" DATETIME,
    "phoneVerificationSentAt" DATETIME,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "notifyMessageReceived" BOOLEAN NOT NULL DEFAULT true,
    "notifyDraftReady" BOOLEAN NOT NULL DEFAULT true,
    "notifyMessageSent" BOOLEAN NOT NULL DEFAULT false,
    "notifyReviewReceived" BOOLEAN NOT NULL DEFAULT true,
    "notifyFlipGoneCold" BOOLEAN NOT NULL DEFAULT true,
    "notifyFlipTurnedHot" BOOLEAN NOT NULL DEFAULT true,
    "notifyPriceChanges" BOOLEAN NOT NULL DEFAULT true,
    "flipGoneColdHours" INTEGER NOT NULL DEFAULT 24,
    "flipTurnedHotCount" INTEGER NOT NULL DEFAULT 3,
    "notifyListingUnavailable" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyNewDeals" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifySoldItems" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyMessageReceived" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyDraftReady" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyMessageSent" BOOLEAN NOT NULL DEFAULT false,
    "pushNotifyReviewReceived" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyFlipGoneCold" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyFlipTurnedHot" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyPriceDrops" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyExpiring" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyListingUnavailable" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifyWeeklyDigest" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifyNewDeals" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifySoldItems" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifyMessageReceived" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifyDraftReady" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifyMessageSent" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifyReviewReceived" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifyFlipGoneCold" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifyFlipTurnedHot" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifyPriceDrops" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifyExpiring" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifyListingUnavailable" BOOLEAN NOT NULL DEFAULT false,
    "smsNotifyWeeklyDigest" BOOLEAN NOT NULL DEFAULT false,
    "meetingDepartureBufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "notifyMeetingReminder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FacebookToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GoogleCalendarToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "calendarEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoogleCalendarToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "sentAt" DATETIME,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiAnalysisCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL DEFAULT 'claude',
    "analysisResult" TEXT NOT NULL,
    "analyzedAtPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PostingQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "targetPlatform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "askingPrice" REAL,
    "title" TEXT,
    "description" TEXT,
    "externalPostId" TEXT,
    "externalPostUrl" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" DATETIME,
    "postedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostingQueueItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostingQueueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "imageIndex" INTEGER NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "periodStart" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonitoringJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "listingsChecked" INTEGER NOT NULL DEFAULT 0,
    "eventsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorsEncountered" INTEGER NOT NULL DEFAULT 0,
    "totalListings" INTEGER NOT NULL DEFAULT 0,
    "platformStats" JSONB,
    "skippedPlatforms" JSONB,
    "completedEarly" BOOLEAN NOT NULL DEFAULT false,
    "canaryWarning" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deduplicationKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotificationEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
CREATE INDEX "Listing_conversationStatus_idx" ON "Listing"("conversationStatus");

-- CreateIndex
CREATE INDEX "Listing_estimatedExpiresAt_idx" ON "Listing"("estimatedExpiresAt");

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
CREATE INDEX "Opportunity_meetingTime_meetingLocation_idx" ON "Opportunity"("meetingTime", "meetingLocation");

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
CREATE INDEX "PriceHistory_productName_platform_dataType_createdAt_idx" ON "PriceHistory"("productName", "platform", "dataType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");

-- CreateIndex
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookToken_userId_key" ON "FacebookToken"("userId");

-- CreateIndex
CREATE INDEX "FacebookToken_userId_idx" ON "FacebookToken"("userId");

-- CreateIndex
CREATE INDEX "FacebookToken_expiresAt_idx" ON "FacebookToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarToken_userId_key" ON "GoogleCalendarToken"("userId");

-- CreateIndex
CREATE INDEX "GoogleCalendarToken_userId_idx" ON "GoogleCalendarToken"("userId");

-- CreateIndex
CREATE INDEX "GoogleCalendarToken_expiresAt_idx" ON "GoogleCalendarToken"("expiresAt");

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
CREATE INDEX "Message_userId_status_direction_idx" ON "Message"("userId", "status", "direction");

-- CreateIndex
CREATE INDEX "Message_listingId_createdAt_idx" ON "Message"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_listingId_direction_createdAt_idx" ON "Message"("listingId", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "AiAnalysisCache_listingId_idx" ON "AiAnalysisCache"("listingId");

-- CreateIndex
CREATE INDEX "AiAnalysisCache_expiresAt_idx" ON "AiAnalysisCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysisCache_listingId_analysisType_key" ON "AiAnalysisCache"("listingId", "analysisType");

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

-- CreateIndex
CREATE INDEX "ListingImage_listingId_idx" ON "ListingImage"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingImage_listingId_imageIndex_key" ON "ListingImage"("listingId", "imageIndex");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_type_periodStart_idx" ON "UsageRecord"("userId", "type", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_userId_type_periodStart_key" ON "UsageRecord"("userId", "type", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "MonitoringJob_status_idx" ON "MonitoringJob"("status");

-- CreateIndex
CREATE INDEX "NotificationEvent_userId_status_idx" ON "NotificationEvent"("userId", "status");

-- CreateIndex
CREATE INDEX "NotificationEvent_status_createdAt_idx" ON "NotificationEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationEvent_eventType_status_idx" ON "NotificationEvent"("eventType", "status");

-- CreateIndex
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationEvent_userId_listingId_eventType_deduplicationKey_key" ON "NotificationEvent"("userId", "listingId", "eventType", "deduplicationKey");
