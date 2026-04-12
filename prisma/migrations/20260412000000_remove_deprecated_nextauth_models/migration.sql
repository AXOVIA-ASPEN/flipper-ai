-- Remove deprecated NextAuth models (Account, Session, VerificationToken)
-- These were kept during the Firebase Auth migration but are no longer needed.
-- Firebase Auth is now the sole authentication system.

-- Drop foreign key indexes first
DROP INDEX IF EXISTS "Account_userId_idx";
DROP INDEX IF EXISTS "Session_userId_idx";

-- Drop tables
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";
