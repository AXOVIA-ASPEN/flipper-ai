/**
 * @file src/components/UsageDisplay.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.1
 * @brief Displays monthly API usage (scans & analyses) with tier-appropriate limits.
 *
 * @description
 * Client component that fetches usage data from /api/usage and renders
 * scan/analysis counts. FREE tier: daily scan progress (today vs /10) plus
 * monthly totals; paid tiers: monthly scan totals without a daily cap.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UsageData {
  scans: {
    usedToday: number;
    usedThisMonth: number;
    limitPerDay: number | null;
  };
  analyses: { usedThisMonth: number; limit: null };
  tier: string;
  periodStart: string;
  periodEnd: string;
}

export default function UsageDisplay() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/usage');
        if (!res.ok) {
          setError('Failed to load usage data');
          return;
        }
        const json = await res.json();
        if (json.success) {
          setUsage(json.data);
        } else {
          setError('Failed to load usage data');
        }
      } catch {
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border p-6 bg-white dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Usage</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="rounded-lg border p-6 bg-white dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Usage</h2>
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Unable to load usage data'}</p>
      </div>
    );
  }

  const isFree = usage.tier === 'FREE';
  const dailyLimit = usage.scans.limitPerDay;
  const scanPercent =
    isFree && dailyLimit
      ? Math.min((usage.scans.usedToday / dailyLimit) * 100, 100)
      : 0;
  const showUpgrade =
    isFree && dailyLimit && usage.scans.usedToday >= dailyLimit * 0.8;

  return (
    <div className="rounded-lg border p-6 bg-white dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Usage This Month</h2>

      <div className="space-y-4">
        {/* Scan usage */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Scans (today)</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isFree && dailyLimit
                ? `${usage.scans.usedToday}/${dailyLimit} scans used today`
                : `${usage.scans.usedThisMonth} scans this month`}
            </span>
          </div>
          {isFree && dailyLimit && (
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-2 rounded-full transition-all ${
                  scanPercent >= 80 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${scanPercent}%` }}
              />
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This month: {usage.scans.usedThisMonth} scan{usage.scans.usedThisMonth === 1 ? '' : 's'} recorded
          </p>
        </div>

        {/* Analysis usage */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyses</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {usage.analyses.usedThisMonth} analyses this month
          </span>
        </div>

        {/* Upgrade prompt */}
        {showUpgrade && (
          <div className="mt-3 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You&apos;re approaching your daily scan limit.{' '}
              <Link href="/settings#billing" className="font-medium underline hover:no-underline">
                Upgrade
              </Link>{' '}
              for unlimited scans.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
