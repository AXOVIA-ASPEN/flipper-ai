/**
 * @file app/api/test/seed-user/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Test-only endpoint to upsert a user for BDD/E2E tests.
 *
 * @description
 * Creates or updates a test user in the database. Protected by E2E_TEST_SECRET
 * — returns 404 in production or when the secret is not configured.
 * Used by BDD step definitions to seed test users without requiring the test
 * process to have its own database connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const E2E_TEST_SECRET = process.env.E2E_TEST_SECRET;

export async function POST(request: NextRequest) {
  // Gate: only available when E2E_TEST_SECRET is configured
  if (!E2E_TEST_SECRET) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const authHeader = request.headers.get('x-test-secret');
  if (authHeader !== E2E_TEST_SECRET) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { id, email, firebaseUid, name, subscriptionTier } = body;

  if (!email || !firebaseUid) {
    return NextResponse.json(
      { error: 'email and firebaseUid are required' },
      { status: 400 }
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { firebaseUid, subscriptionTier: subscriptionTier || 'FREE' },
    create: {
      id: id || undefined,
      email,
      firebaseUid,
      name: name || 'Test User',
      subscriptionTier: subscriptionTier || 'FREE',
    },
  });

  return NextResponse.json({ success: true, userId: user.id });
}
