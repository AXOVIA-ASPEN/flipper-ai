-- AlterTable: add phoneVerificationSentAt to UserSettings for explicit rate-limit tracking.
-- Code review fix for Story 11.2 (H-2/M-2): the original implementation derived
-- sentAt by back-calculating from the expiry timestamp, which breaks if OTP_TTL_MINUTES
-- ever changes. This column stores the actual send time directly.
ALTER TABLE "UserSettings" ADD COLUMN "phoneVerificationSentAt" TIMESTAMP(3);
