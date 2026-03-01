/**
 * Shared helper: Upsert Prisma User from Firebase Auth claims.
 *
 * Used by /api/auth/session and /api/auth/register to avoid duplicating
 * the user upsert + UserSettings creation logic.
 */

import prisma from '@/lib/db';

interface EnsureUserParams {
  firebaseUid: string;
  email?: string;
  name?: string;
  image?: string;
}

/**
 * Upsert a Prisma User record linked to a Firebase UID.
 * Creates default UserSettings if this is a new user.
 * Returns the upserted user record.
 */
export async function ensurePrismaUser({ firebaseUid, email, name, image }: EnsureUserParams) {
  const user = await prisma.user.upsert({
    where: { firebaseUid },
    create: {
      firebaseUid,
      email: email || `${firebaseUid}@firebase.user`,
      name: name || null,
      image: image || null,
    },
    update: {
      email: email || undefined,
      name: name || undefined,
      image: image || undefined,
    },
  });

  // Create default settings for new users
  const existingSettings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });
  if (!existingSettings) {
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        llmModel: 'gpt-4o-mini',
        discountThreshold: 50,
        autoAnalyze: true,
      },
    });
  }

  return user;
}
