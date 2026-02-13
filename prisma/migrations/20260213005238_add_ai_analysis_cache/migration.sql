-- CreateTable
CREATE TABLE "AiAnalysisCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "analysisResult" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AiAnalysisCache_listingId_idx" ON "AiAnalysisCache"("listingId");

-- CreateIndex
CREATE INDEX "AiAnalysisCache_expiresAt_idx" ON "AiAnalysisCache"("expiresAt");
