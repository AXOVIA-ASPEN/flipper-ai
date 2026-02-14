/**
 * Facebook Token Storage
 * Secure storage and retrieval of Facebook OAuth tokens
 */

import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export interface StoredFacebookToken {
  userId: string;
  accessToken: string;
  expiresAt: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stores a Facebook access token for a user (encrypted)
 * @param userId User ID
 * @param accessToken Access token to store
 * @param expiresIn Token expiration time in seconds
 */
export async function storeToken(
  userId: string,
  accessToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const encryptedToken = encrypt(accessToken);

  await prisma.facebookToken.upsert({
    where: { userId },
    update: {
      accessToken: encryptedToken,
      expiresAt: new Date(expiresAt * 1000),
      updatedAt: new Date(),
    },
    create: {
      userId,
      accessToken: encryptedToken,
      expiresAt: new Date(expiresAt * 1000),
    },
  });
}

/**
 * Retrieves a Facebook access token for a user (decrypted)
 * @param userId User ID
 * @returns Stored token data or null if not found
 */
export async function getToken(
  userId: string
): Promise<StoredFacebookToken | null> {
  const tokenRecord = await prisma.facebookToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) {
    return null;
  }

  const decryptedToken = decrypt(tokenRecord.accessToken);

  return {
    userId: tokenRecord.userId,
    accessToken: decryptedToken,
    expiresAt: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
    createdAt: tokenRecord.createdAt,
    updatedAt: tokenRecord.updatedAt,
  };
}

/**
 * Checks if a user has a valid Facebook token
 * @param userId User ID
 * @returns True if token exists and is not expired
 */
export async function hasValidToken(userId: string): Promise<boolean> {
  const token = await getToken(userId);

  if (!token) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return token.expiresAt > now;
}

/**
 * Deletes a stored Facebook token (logout)
 * @param userId User ID
 */
export async function deleteToken(userId: string): Promise<void> {
  await prisma.facebookToken.delete({
    where: { userId },
  }).catch(() => {
    // Ignore error if token doesn't exist
  });
}

/**
 * Checks if token is expiring soon and needs refresh
 * @param userId User ID
 * @param bufferSeconds Buffer time before expiration (default: 7 days)
 * @returns True if token is expiring within buffer time
 */
export async function isTokenExpiring(
  userId: string,
  bufferSeconds: number = 604800 // 7 days
): Promise<boolean> {
  const token = await getToken(userId);

  if (!token) {
    return true; // No token = needs auth
  }

  const now = Math.floor(Date.now() / 1000);
  return token.expiresAt - now <= bufferSeconds;
}

/**
 * Gets all users with Facebook tokens (for admin/cron refresh tasks)
 * @returns Array of user IDs with stored tokens
 */
export async function getAllTokenUsers(): Promise<string[]> {
  const tokens = await prisma.facebookToken.findMany({
    select: { userId: true },
  });

  return tokens.map((t) => t.userId);
}
