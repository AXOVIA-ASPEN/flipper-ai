-- AlterTable
-- Story 8.4 follow-up: Add updatedAt to Listing for stale listing detection
-- in MessageApprovalCard. Existing rows default to NOW() which is harmless
-- (won't trigger false stale warnings since message.createdAt > NOW() - epsilon
-- can never be true after the migration runs).
ALTER TABLE "Listing" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
