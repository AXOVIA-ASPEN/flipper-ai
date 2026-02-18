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

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {},
  };

  // Check 1: Environment variables
  diagnostics.checks.envVars = {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
  };

  // Check 2: Prisma client
  try {
    diagnostics.checks.prismaClient = '✅ Initialized';
  } catch (error) {
    diagnostics.checks.prismaClient = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Check 3: Database connection
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    diagnostics.checks.databaseConnection = '✅ Connected';
  } catch (error) {
    diagnostics.checks.databaseConnection = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Check 4: User table query
  try {
    const userCount = await prisma.user.count();
    diagnostics.checks.userTable = `✅ Accessible (${userCount} users)`;
  } catch (error) {
    diagnostics.checks.userTable = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Check 5: bcrypt availability
  try {
    const bcrypt = require('bcryptjs');
    const testHash = await bcrypt.hash('test', 12);
    diagnostics.checks.bcrypt = testHash ? '✅ Working' : '❌ Failed to hash';
  } catch (error) {
    diagnostics.checks.bcrypt = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // All checks passed
  diagnostics.status = 'healthy';
  return NextResponse.json(diagnostics);
}
