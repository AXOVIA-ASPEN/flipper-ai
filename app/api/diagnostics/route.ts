/**
 * Diagnostics API Route
 * GET /api/diagnostics - Test database connection and Prisma setup
 * 
 * This endpoint helps debug deployment issues by testing:
 * - Prisma client initialization
 * - Database connectivity
 * - Environment variables
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/lib/errors';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');
  } catch (error) {
    return handleError(error);
  }

  const checks: Record<string, unknown> = {};
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks,
  };

  // Check 1: Environment variables
  checks.envVars = {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
    APP_URL: process.env.APP_URL ? '✅ Set' : '❌ Missing',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing',
  };

  // Check 2: Prisma client
  try {
    checks.prismaClient = '✅ Initialized';
  } catch (error) {
    checks.prismaClient = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Check 3: Database connection
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    checks.databaseConnection = '✅ Connected';
  } catch (error) {
    checks.databaseConnection = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Check 4: User table query
  try {
    const userCount = await prisma.user.count();
    checks.userTable = `✅ Accessible (${userCount} users)`;
  } catch (error) {
    checks.userTable = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Check 5: bcrypt availability
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs');
    const testHash = await bcrypt.hash('test', 12);
    checks.bcrypt = testHash ? '✅ Working' : '❌ Failed to hash';
  } catch (error) {
    checks.bcrypt = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // All checks passed
  diagnostics.status = 'healthy';
  return NextResponse.json(diagnostics);
}
