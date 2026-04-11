/**
 * @file src/lib/google-calendar-token-store.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-11
 * @version 1.0
 * @brief Encrypted Google Calendar OAuth token storage — mirrors FacebookToken pattern.
 *
 * @description
 * Handles CRUD for GoogleCalendarToken rows using AES-256 encryption
 * for both accessToken and refreshToken. The `deleteToken` function always
 * resolves (never rejects) so disconnect flows remain clean. Mirrors the
 * Facebook token-store pattern from src/scrapers/facebook/token-store.ts.
 */

import prisma from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

export interface StoredGoogleCalendarToken {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendarEmail: string | null;
}

/**
 * Store (upsert) a Google Calendar OAuth token for a user.
 * Both accessToken and refreshToken are AES-256 encrypted before storage.
 */
export async function storeToken(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresAt: Date,
  calendarEmail: string | null = null
): Promise<void> {
  const encryptedAccess = encrypt(accessToken);
  const encryptedRefresh = encrypt(refreshToken);

  await prisma.googleCalendarToken.upsert({
    where: { userId },
    update: {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      calendarEmail,
      updatedAt: new Date(),
    },
    create: {
      userId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt,
      calendarEmail,
    },
  });
}

/**
 * Update only the access token and expiry (used after token refresh).
 */
export async function updateAccessToken(
  userId: string,
  accessToken: string,
  expiresAt: Date
): Promise<void> {
  await prisma.googleCalendarToken.update({
    where: { userId },
    data: {
      accessToken: encrypt(accessToken),
      expiresAt,
      updatedAt: new Date(),
    },
  });
}

/**
 * Retrieve and decrypt a stored Google Calendar token.
 * Returns null if no token exists for the user.
 */
export async function getToken(userId: string): Promise<StoredGoogleCalendarToken | null> {
  const record = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });

  if (!record) return null;

  return {
    userId: record.userId,
    accessToken: decrypt(record.accessToken),
    refreshToken: decrypt(record.refreshToken),
    expiresAt: record.expiresAt,
    calendarEmail: record.calendarEmail,
  };
}

/** Tokens expiring within this window are treated as expired (mirrors ensureValidToken buffer). */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Check whether the user has a non-expired Google Calendar token.
 * Uses the same 5-minute refresh buffer as ensureValidToken so callers
 * don't trip over a token that will expire mid-request.
 */
export async function hasValidToken(userId: string): Promise<boolean> {
  const record = await prisma.googleCalendarToken.findUnique({
    where: { userId },
    select: { expiresAt: true },
  });

  if (!record) return false;
  return record.expiresAt.getTime() - Date.now() > REFRESH_BUFFER_MS;
}

/**
 * Delete a stored Google Calendar token.
 * Always resolves — if the row does not exist the error is swallowed
 * (same idempotent pattern as Facebook token-store.deleteToken).
 */
export async function deleteToken(userId: string): Promise<void> {
  await prisma.googleCalendarToken
    .delete({ where: { userId } })
    .catch(() => {});
}
