/**
 * @file src/lib/usage-tracker.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-03-08
 * @version 1.0
 * @brief API usage tracking and metering service for scan and analysis counts.
 *
 * @description
 * Tracks monthly usage of scans and AI analyses per user. Uses a dedicated
 * UsageRecord model with atomic upsert operations for concurrent-safe counting.
 * Monthly reset is implicit — each month's periodStart creates new records,
 * so no cron job or explicit reset is needed. Provides formatted display data
 * with tier-appropriate limit information.
 */

import prisma from '@/lib/db';
import { getTierLimits, type SubscriptionTier } from '@/lib/subscription-tiers';

export type UsageType = 'SCAN' | 'ANALYSIS';

export interface MonthlyUsage {
  scans: number;
  analyses: number;
}

/** Matches POST /api/scraper-jobs: jobs created since local midnight (tier enforcement). */
export function getLocalStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function countScansToday(userId: string): Promise<number> {
  const startOfDay = getLocalStartOfDay();
  return prisma.scraperJob.count({
    where: { userId, createdAt: { gte: startOfDay } },
  });
}

export interface UsageDisplay {
  scans: {
    /** Jobs created today (same basis as daily scan limit enforcement). */
    usedToday: number;
    /** Completed scans recorded in UsageRecord for the current UTC month. */
    usedThisMonth: number;
    /** Daily cap for FREE tier; null when unlimited. */
    limitPerDay: number | null;
  };
  analyses: { usedThisMonth: number; limit: null };
  tier: string;
  periodStart: string;
  periodEnd: string;
}

/**
 * Get the first day of the current month at 00:00 UTC.
 */
export function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Record a usage event (scan or analysis) for the current month.
 * Uses atomic upsert to safely handle concurrent requests.
 */
export async function recordUsage(userId: string, type: UsageType): Promise<void> {
  const periodStart = getMonthStart();
  await prisma.usageRecord.upsert({
    where: { userId_type_periodStart: { userId, type, periodStart } },
    create: { userId, type, count: 1, periodStart },
    update: { count: { increment: 1 } },
  });
}

/**
 * Get the current month's usage counts for a user.
 */
export async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const periodStart = getMonthStart();
  const records = await prisma.usageRecord.findMany({
    where: { userId, periodStart },
  });
  return {
    scans: records.find((r) => r.type === 'SCAN')?.count ?? 0,
    analyses: records.find((r) => r.type === 'ANALYSIS')?.count ?? 0,
  };
}

/**
 * Get formatted usage data with tier-appropriate limits for display.
 */
export async function getUsageDisplay(
  userId: string,
  tier: SubscriptionTier
): Promise<UsageDisplay> {
  const usage = await getMonthlyUsage(userId);
  const limits = getTierLimits(tier);
  const usedToday = await countScansToday(userId);
  const periodStart = getMonthStart();
  const periodEnd = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0)
  );
  return {
    scans: {
      usedToday,
      usedThisMonth: usage.scans,
      limitPerDay: limits.scansPerDay,
    },
    analyses: { usedThisMonth: usage.analyses, limit: null },
    tier,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}
