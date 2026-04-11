-- Story 10.1: Background Job Scheduler — Monitoring Infrastructure
-- Creates MonitoringJob and NotificationEvent models, adds lastMonitoredAt to Listing,
-- and enforces single-RUNNING-job constraint via partial unique index.

-- Add lastMonitoredAt to Listing for round-robin monitoring fairness
ALTER TABLE "Listing" ADD COLUMN "lastMonitoredAt" TIMESTAMP(3);

-- MonitoringJob: tracks background monitoring runs
CREATE TABLE "MonitoringJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringJob_pkey" PRIMARY KEY ("id")
);

-- NotificationEvent: DB event queue for downstream notification processors
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "deduplicationKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes for MonitoringJob
CREATE INDEX "MonitoringJob_status_idx" ON "MonitoringJob"("status");

-- Indexes for NotificationEvent
CREATE UNIQUE INDEX "NotificationEvent_userId_listingId_eventType_deduplicationKey_key" ON "NotificationEvent"("userId", "listingId", "eventType", "deduplicationKey");
CREATE INDEX "NotificationEvent_userId_status_idx" ON "NotificationEvent"("userId", "status");
CREATE INDEX "NotificationEvent_status_createdAt_idx" ON "NotificationEvent"("status", "createdAt");
CREATE INDEX "NotificationEvent_eventType_status_idx" ON "NotificationEvent"("eventType", "status");
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt");

-- Foreign keys for NotificationEvent
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: prevents concurrent RUNNING monitoring jobs at the database level.
-- Clean up any stuck RUNNING jobs first to avoid index creation failure.
UPDATE "MonitoringJob" SET status='FAILED', "errorMessage"='Reaped: migration cleanup' WHERE status='RUNNING';
CREATE UNIQUE INDEX "monitoring_job_running_unique" ON "MonitoringJob" ("status") WHERE status = 'RUNNING';
