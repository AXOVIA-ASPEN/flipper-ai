-- Story 11.1: FCM Push Notification Client
-- Adds DeviceToken model for FCM device token storage and
-- pushNotifications global toggle to UserSettings.

-- Add pushNotifications toggle to UserSettings (default true, parallel to emailNotifications)
ALTER TABLE "UserSettings" ADD COLUMN "pushNotifications" BOOLEAN NOT NULL DEFAULT true;

-- DeviceToken: stores FCM device tokens for push notification fan-out delivery
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one token entry per user-device pair (idempotent upsert)
CREATE UNIQUE INDEX "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");

-- Indexes for efficient lookup by user and token cleanup
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken"("userId");
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

-- Foreign key: cascade delete device tokens when user is deleted
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
